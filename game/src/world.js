// The world: one fixed floor plan, the thief, two patrolling guards, one sweeping camera,
// the Amber Crown and the extraction lift. A fixed-step simulation; the renderer only paints
// what is here, so a staged state and a played state look identical.

import {
  ALARM, CAMERA, GUARD_WAYPOINTS, JAMMER, LIFT, LOOT, LOW_COVER, PANEL, PLAYER,
  PLAYER_START, SOLIDS,
} from './config.js';
import { rectSegments, solidsSegments } from './raycast.js';
import { createGuard, guardSees, moveToward, updateGuard } from './guards.js';
import { cameraDisabled, createCamera, updateCamera } from './cameras.js';
import { computeSeen, updateAlarm } from './alarm.js';

export const EVENT_NONE = 0;
export const EVENT_PICKUP = 1;
export const EVENT_WIN = 2;
export const EVENT_LOCKDOWN = 4;
export const EVENT_CAUGHT = 8;
export const EVENT_JAMMER = 16;
export const EVENT_CAMERA_OFF = 32;
export const EVENT_SPOTTED = 64;

export function createWorld() {
  const world = {
    time: 0,
    phase: 'play',
    player: { x: PLAYER_START.x, y: PLAYER_START.y, sneaking: false, facing: 0, stun: 0 },
    guards: GUARD_WAYPOINTS.map((wps) => createGuard(wps)),
    camera: createCamera(),
    alarm: 0,
    peakAlarm: 0,
    lootTaken: false,
    grabProgress: 0,
    jammersLeft: JAMMER.max,
    jammersUsed: 0,
    camerasDisabled: 0,
    ripples: [],
    spotted: false,
    rank: null,
    segments: solidsSegments(SOLIDS),
    lowSegments: LOW_COVER.flatMap((r) => rectSegments(r)),
    solids: SOLIDS,
    lowCover: LOW_COVER,
  };
  return world;
}

export function resetWorld(world) {
  const fresh = createWorld();
  for (const key of Object.keys(fresh)) world[key] = fresh[key];
}

/** Circle versus one rectangle: push the circle out along the shortest overlap axis. */
function collideCircleRect(p, radius, rect) {
  const cx = Math.max(rect.x, Math.min(p.x, rect.x + rect.w));
  const cy = Math.max(rect.y, Math.min(p.y, rect.y + rect.h));
  const dx = p.x - cx;
  const dy = p.y - cy;
  const dist2 = dx * dx + dy * dy;
  if (dist2 >= radius * radius) return;
  if (dist2 > 1e-6) {
    const dist = Math.sqrt(dist2);
    p.x = cx + (dx / dist) * radius;
    p.y = cy + (dy / dist) * radius;
  } else {
    // Centre inside the rectangle: push out through the nearest edge.
    const left = p.x - rect.x;
    const right = rect.x + rect.w - p.x;
    const top = p.y - rect.y;
    const bottom = rect.y + rect.h - p.y;
    const min = Math.min(left, right, top, bottom);
    if (min === left) p.x = rect.x - radius;
    else if (min === right) p.x = rect.x + rect.w + radius;
    else if (min === top) p.y = rect.y - radius;
    else p.y = rect.y + rect.h + radius;
  }
}

function collideAll(world, p, radius) {
  for (const rect of world.solids) collideCircleRect(p, radius, rect);
  for (const rect of world.lowCover) collideCircleRect(p, radius, rect);
}

function rankFor(world) {
  if (world.peakAlarm < 10) return 'GHOST';
  if (world.peakAlarm < 40 && world.time < 180) return 'MASTERMIND';
  return 'CLEAN GETAWAY';
}

/**
 * Advance the world one fixed step. `input` carries the movement direction (already
 * normalised, or 0,0), sneak, interact (E held) and a click point or null.
 * Returns an event bitmask for sounds and announcements.
 */
export function stepWorld(world, dt, input) {
  if (world.phase !== 'play') return EVENT_NONE;
  world.time += dt;
  let events = EVENT_NONE;
  const player = world.player;

  // Movement, axis by axis so the thief slides along walls instead of sticking.
  const speed = input.sneak ? PLAYER.sneakSpeed : PLAYER.speed;
  player.sneaking = input.sneak;
  if (player.stun > 0) player.stun -= dt;
  if (player.stun <= 0 && (input.dx !== 0 || input.dy !== 0)) {
    player.facing = Math.atan2(input.dy, input.dx);
    const nx = { x: player.x + input.dx * speed * dt, y: player.y };
    collideAll(world, nx, PLAYER.radius);
    player.x = nx.x;
    const ny = { x: player.x, y: player.y + input.dy * speed * dt };
    collideAll(world, ny, PLAYER.radius);
    player.y = ny.y;
  }

  // Guards: work out visibility first, then let each guard react to it.
  const visible = world.guards.map((g) => guardSees(g, player, world.segments));
  for (let i = 0; i < world.guards.length; i += 1) {
    updateGuard(world.guards[i], GUARD_WAYPOINTS[i], dt, world, visible[i]);
  }
  updateCamera(world.camera, world.time, dt);

  const seen = computeSeen(world);
  const wasSpotted = world.spotted;
  world.spotted = seen.rate > 0;
  if (world.spotted && !wasSpotted) events |= EVENT_SPOTTED;
  if (updateAlarm(world, dt, seen)) {
    world.phase = 'lockdown';
    return events | EVENT_LOCKDOWN;
  }

  // The camera calls the nearest guard to its position when it spots the thief.
  if (seen.seenByCamera && world.camera.alertCooldown <= 0) {
    let nearest = null;
    let best = Infinity;
    for (const guard of world.guards) {
      const d = Math.hypot(guard.x - world.camera.x, guard.y - world.camera.y);
      if (d < best) {
        best = d;
        nearest = guard;
      }
    }
    if (nearest && nearest.state !== 'chase') {
      nearest.state = 'suspicious';
      nearest.investigate = { x: world.camera.x, y: world.camera.y + 120 };
    }
    world.camera.alertCooldown = 3;
  }

  // A guard that reaches the thief spikes the alarm and shoves the thief away.
  for (const guard of world.guards) {
    const d = Math.hypot(player.x - guard.x, player.y - guard.y);
    if (d < PLAYER.radius + 13 + 2 && guard.touchCooldown <= 0) {
      guard.touchCooldown = 1.5;
      world.alarm = Math.min(ALARM.max, world.alarm + 45);
      if (world.alarm > world.peakAlarm) world.peakAlarm = world.alarm;
      const away = Math.atan2(player.y - guard.y, player.x - guard.x);
      const shoved = { x: player.x + Math.cos(away) * 50, y: player.y + Math.sin(away) * 50 };
      collideAll(world, shoved, PLAYER.radius);
      player.x = shoved.x;
      player.y = shoved.y;
      player.stun = 0.6;
      guard.state = 'suspicious';
      guard.investigate = { x: player.x, y: player.y };
      events |= EVENT_CAUGHT;
      if (world.alarm >= ALARM.max) {
        world.phase = 'lockdown';
        return events | EVENT_LOCKDOWN;
      }
    }
  }

  // Loot: stand by the crown for half a second (or hold E) to take it.
  if (!world.lootTaken) {
    const d = Math.hypot(player.x - LOOT.x, player.y - LOOT.y);
    if (d < PLAYER.grabRange) {
      world.grabProgress += dt;
      if (world.grabProgress >= PLAYER.grabTime) {
        world.lootTaken = true;
        events |= EVENT_PICKUP;
      }
    } else {
      world.grabProgress = 0;
    }
  }

  // The camera panel: hold E beside it to cut the camera feed for a while.
  if (input.interact && world.camera.panelCooldown <= 0 && !cameraDisabled(world.camera)) {
    const pcx = PANEL.x + PANEL.w / 2;
    const pcy = PANEL.y + PANEL.h / 2;
    if (Math.hypot(player.x - pcx, player.y - pcy) < 56) {
      world.camera.disabledTimer = CAMERA.disabledByPanel;
      world.camera.panelCooldown = CAMERA.panelCooldown;
      world.camerasDisabled += 1;
      events |= EVENT_CAMERA_OFF;
    }
  }

  // EMP jammer / coin distraction, thrown with a mouse click.
  if (input.click && world.jammersLeft > 0) {
    const click = input.click;
    world.jammersLeft -= 1;
    world.jammersUsed += 1;
    world.ripples.push({ x: click.x, y: click.y, t: 0 });
    events |= EVENT_JAMMER;
    const dc = Math.hypot(click.x - world.camera.x, click.y - world.camera.y);
    if (dc < JAMMER.cameraRadius) {
      world.camera.disabledTimer = CAMERA.disabledByJammer;
      world.camerasDisabled += 1;
      events |= EVENT_CAMERA_OFF;
    } else {
      for (const guard of world.guards) {
        if (Math.hypot(click.x - guard.x, click.y - guard.y) < JAMMER.lureRadius) {
          guard.state = 'suspicious';
          guard.investigate = { x: click.x, y: click.y };
        }
      }
    }
  }

  // Ripples fade after a second.
  for (const ripple of world.ripples) ripple.t += dt;
  world.ripples = world.ripples.filter((r) => r.t < 1);

  // Extraction: reach the emerald lift with the crown in hand.
  if (world.lootTaken) {
    if (
      player.x > LIFT.x && player.x < LIFT.x + LIFT.w &&
      player.y > LIFT.y && player.y < LIFT.y + LIFT.h
    ) {
      world.phase = 'won';
      world.rank = rankFor(world);
      return events | EVENT_WIN;
    }
  }

  return events;
}

/** Seconds of play, for the HUD timer and the win screen stats. */
export function elapsedSeconds(world) {
  return world.time;
}
