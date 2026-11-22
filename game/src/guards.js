// Guard behaviour: patrol waypoints, pause at corners, get suspicious at a last-seen point,
// chase a clearly visible thief, and give up after losing sight for a while.
// States: 'patrol', 'suspicious', 'chase', 'return'.

import { GUARD } from './config.js';
import { inWedge, losClear } from './raycast.js';

/** Move `from` toward `to` at `speed`, stopping exactly on arrival; returns the new position. */
export function moveToward(from, to, speed, dt) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 0.5) return { x: to.x, y: to.y, arrived: true };
  const step = Math.min(dist, speed * dt);
  return { x: from.x + (dx / dist) * step, y: from.y + (dy / dist) * step, arrived: step >= dist - 0.01 };
}

/** Angle from a guard position toward a target point. */
export function angleTo(from, to) {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

/** Turn `current` toward `target` by at most `maxStep` radians, taking the short way round. */
export function turnToward(current, target, maxStep) {
  let diff = target - current;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  if (Math.abs(diff) <= maxStep) return target;
  return current + Math.sign(diff) * maxStep;
}

export function createGuard(waypoints, startIndex = 0) {
  const start = waypoints[startIndex];
  const next = waypoints[(startIndex + 1) % waypoints.length];
  return {
    x: start.x,
    y: start.y,
    facing: angleTo(start, next),
    state: 'patrol',
    waypointIndex: (startIndex + 1) % waypoints.length,
    pauseTimer: 0,
    seenTime: 0,
    lastSeen: null,
    investigate: null,
    lookTimer: 0,
    lookBase: 0,
    lostTimer: 0,
    touchCooldown: 0,
  };
}

/**
 * Advance one guard for `dt`. `world` supplies the thief, the solid segments and the waypoint
 * list; detection (whether the thief is visible) is computed by the caller in alarm.js and
 * passed in as `visible`, so this file only decides movement and state.
 */
export function updateGuard(guard, waypoints, dt, world, visible) {
  const thief = world.player;
  if (guard.touchCooldown > 0) guard.touchCooldown -= dt;

  if (visible) {
    guard.seenTime += dt;
    guard.lastSeen = { x: thief.x, y: thief.y };
    guard.lostTimer = 0;
  } else {
    guard.seenTime = Math.max(0, guard.seenTime - dt * 2);
    if (guard.state === 'chase') guard.lostTimer += dt;
  }

  if (visible && guard.seenTime >= GUARD.chaseTime && guard.state !== 'chase') {
    guard.state = 'chase';
  } else if (visible && guard.seenTime >= GUARD.suspiciousTime && guard.state === 'patrol') {
    guard.state = 'suspicious';
    guard.investigate = { ...guard.lastSeen };
  }

  if (guard.state === 'chase') {
    if (guard.lostTimer >= GUARD.loseSightTime) {
      guard.state = 'suspicious';
      guard.investigate = guard.lastSeen ? { ...guard.lastSeen } : { x: guard.x, y: guard.y };
      guard.lostTimer = 0;
      return;
    }
    const moved = moveToward(guard, thief, GUARD.chaseSpeed, dt);
    guard.x = moved.x;
    guard.y = moved.y;
    guard.facing = turnToward(guard.facing, angleTo(guard, thief), 6 * dt);
    return;
  }

  if (guard.state === 'suspicious') {
    if (guard.investigate) {
      const moved = moveToward(guard, guard.investigate, GUARD.investigateSpeed, dt);
      guard.x = moved.x;
      guard.y = moved.y;
      guard.facing = turnToward(guard.facing, angleTo(guard, guard.investigate), 5 * dt);
      if (moved.arrived) {
        guard.investigate = null;
        guard.lookTimer = 1.5;
        guard.lookBase = guard.facing;
      }
      return;
    }
    // Arrived: scan the area, then walk back to the patrol route.
    guard.lookTimer -= dt;
    guard.facing = guard.lookBase + Math.sin((1.5 - guard.lookTimer) * 4) * 0.9;
    if (guard.lookTimer <= 0) {
      guard.state = 'return';
    }
    return;
  }

  if (guard.state === 'return') {
    const target = waypoints[guard.waypointIndex];
    const moved = moveToward(guard, target, GUARD.patrolSpeed, dt);
    guard.x = moved.x;
    guard.y = moved.y;
    guard.facing = turnToward(guard.facing, angleTo(guard, target), 5 * dt);
    if (moved.arrived) {
      guard.state = 'patrol';
      guard.pauseTimer = 0.4;
    }
    return;
  }

  // Patrol: walk to the next waypoint, pause at each corner.
  if (guard.pauseTimer > 0) {
    guard.pauseTimer -= dt;
    return;
  }
  const target = waypoints[guard.waypointIndex];
  const moved = moveToward(guard, target, GUARD.patrolSpeed, dt);
  guard.x = moved.x;
  guard.y = moved.y;
  guard.facing = turnToward(guard.facing, angleTo(guard, target), 5 * dt);
  if (moved.arrived) {
    guard.waypointIndex = (guard.waypointIndex + 1) % waypoints.length;
    guard.pauseTimer = GUARD.pauseAtWaypoint;
  }
}

/** Whether this guard can see the thief right now (range, wedge and line of sight). */
export function guardSees(guard, thief, segments) {
  if (!inWedge(guard, guard.facing, GUARD.fov, GUARD.range, thief)) return false;
  return losClear(guard, thief, segments);
}
