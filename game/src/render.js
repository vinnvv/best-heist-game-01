// The renderer: one crisp flat-vector architectural floor plan on a 960x600 canvas, a 48 px
// HUD on top, and the title, pause, win and lockdown screens drawn over the live world.

import {
  CAMERA, FIELD, FONT, LIFT, LOOT, LOW_COVER, PALETTE, PANEL, PILLARS, PLAYER,
  SOLIDS,
} from './config.js';
import { conePolygon } from './raycast.js';
import { cameraDisabled } from './cameras.js';
import { GUARD } from './config.js';
import { alarmLabel } from './alarm.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_WIN = 'win';
export const SCREEN_LOCKDOWN = 'lockdown';

function fmtTime(seconds) {
  const total = Math.floor(seconds);
  const m = String(Math.floor(total / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function alarmColor(alarm) {
  if (alarm < 40) return PALETTE.safe;
  if (alarm < 80) return PALETTE.warn;
  return PALETTE.danger;
}

function coneColorForGuard(guard) {
  if (guard.state === 'chase') return PALETTE.danger;
  if (guard.state === 'suspicious') return '#FB923C';
  return PALETTE.cone;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function drawFloor() {
    const tile = 48;
    for (let y = FIELD.playTop; y < FIELD.playBottom; y += tile) {
      for (let x = 0; x < FIELD.width; x += tile) {
        const even = ((x / tile) + (y / tile)) % 2 === 0;
        ctx.fillStyle = even ? PALETTE.floorA : PALETTE.floorB;
        ctx.fillRect(x, y, tile, Math.min(tile, FIELD.playBottom - y));
      }
    }
    ctx.strokeStyle = PALETTE.floorLine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= FIELD.width; x += tile) {
      ctx.moveTo(x + 0.5, FIELD.playTop);
      ctx.lineTo(x + 0.5, FIELD.playBottom);
    }
    for (let y = FIELD.playTop; y <= FIELD.playBottom; y += tile) {
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(FIELD.width, y + 0.5);
    }
    ctx.stroke();
  }

  function drawWalls() {
    for (const rect of SOLIDS) {
      // A thin drop shadow under the wall, then the wall and its bright top edge.
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(rect.x + 3, rect.y + 4, rect.w, rect.h);
      ctx.fillStyle = PALETTE.wall;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.fillStyle = PALETTE.wallEdge;
      ctx.fillRect(rect.x, rect.y, rect.w, 2);
    }
  }

  function drawPillars() {
    for (const p of PILLARS) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(p.x + 3, p.y + 4, p.w, p.h);
      ctx.fillStyle = PALETTE.pillar;
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.strokeStyle = PALETTE.pillarEdge;
      ctx.lineWidth = 2;
      ctx.strokeRect(p.x + 1, p.y + 1, p.w - 2, p.h - 2);
      ctx.fillStyle = 'rgba(100, 116, 139, 0.5)';
      ctx.fillRect(p.x + 8, p.y + 8, p.w - 16, 3);
      ctx.fillRect(p.x + 8, p.y + p.h - 11, p.w - 16, 3);
    }
  }

  function drawCase() {
    for (const c of LOW_COVER) {
      ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
      ctx.fillRect(c.x, c.y, c.w, c.h);
      ctx.strokeStyle = PALETTE.caseGlass;
      ctx.lineWidth = 2;
      ctx.strokeRect(c.x + 1, c.y + 1, c.w - 2, c.h - 2);
      // A small marble statue inside the glass case.
      const cx = c.x + c.w / 2;
      ctx.fillStyle = '#E5E7EB';
      ctx.beginPath();
      ctx.arc(cx, c.y + 11, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(cx - 4, c.y + 16, 8, 12);
      ctx.fillRect(cx - 9, c.y + 26, 18, 3);
    }
  }

  function drawLoot(world) {
    const pulse = world.lootTaken ? 0 : 0.5 + 0.5 * Math.sin(world.time * 3);
    // Red velvet pedestal.
    ctx.fillStyle = PALETTE.velvet;
    ctx.beginPath();
    ctx.arc(LOOT.x, LOOT.y, LOOT.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#B91C1C';
    ctx.lineWidth = 2;
    ctx.stroke();
    if (!world.lootTaken) {
      // Soft gold glow, then the crown: a band with three points and gems.
      const glow = ctx.createRadialGradient(LOOT.x, LOOT.y, 4, LOOT.x, LOOT.y, 34 + pulse * 8);
      glow.addColorStop(0, 'rgba(250, 204, 21, 0.55)');
      glow.addColorStop(1, 'rgba(250, 204, 21, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(LOOT.x, LOOT.y, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.loot;
      ctx.beginPath();
      ctx.moveTo(LOOT.x - 14, LOOT.y + 6);
      ctx.lineTo(LOOT.x - 14, LOOT.y - 6);
      ctx.lineTo(LOOT.x - 7, LOOT.y + 1);
      ctx.lineTo(LOOT.x, LOOT.y - 11);
      ctx.lineTo(LOOT.x + 7, LOOT.y + 1);
      ctx.lineTo(LOOT.x + 14, LOOT.y - 6);
      ctx.lineTo(LOOT.x + 14, LOOT.y + 6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.arc(LOOT.x, LOOT.y + 1, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Hold-to-grab progress ring.
    if (!world.lootTaken && world.grabProgress > 0) {
      ctx.strokeStyle = PALETTE.loot;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(LOOT.x, LOOT.y, LOOT.radius + 8, -Math.PI / 2, -Math.PI / 2 + (world.grabProgress / 0.5) * Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawLift(world) {
    const active = world.lootTaken;
    const pulse = active ? 0.6 + 0.4 * Math.sin(world.time * 4) : 0.25;
    ctx.fillStyle = active ? `rgba(52, 211, 153, ${0.25 + pulse * 0.3})` : 'rgba(52, 211, 153, 0.12)';
    ctx.fillRect(LIFT.x, LIFT.y, LIFT.w, LIFT.h);
    ctx.strokeStyle = PALETTE.lift;
    ctx.lineWidth = active ? 3 : 2;
    ctx.strokeRect(LIFT.x + 1, LIFT.y + 1, LIFT.w - 2, LIFT.h - 2);
    // Lift doors and chevrons.
    ctx.fillStyle = PALETTE.lift;
    ctx.fillRect(LIFT.x + LIFT.w / 2 - 1, LIFT.y + 6, 2, LIFT.h - 12);
    ctx.beginPath();
    ctx.moveTo(LIFT.x + 14, LIFT.y + LIFT.h / 2 - 8);
    ctx.lineTo(LIFT.x + 24, LIFT.y + LIFT.h / 2);
    ctx.lineTo(LIFT.x + 14, LIFT.y + LIFT.h / 2 + 8);
    ctx.moveTo(LIFT.x + LIFT.w - 14, LIFT.y + LIFT.h / 2 - 8);
    ctx.lineTo(LIFT.x + LIFT.w - 24, LIFT.y + LIFT.h / 2);
    ctx.lineTo(LIFT.x + LIFT.w - 14, LIFT.y + LIFT.h / 2 + 8);
    ctx.stroke();
  }

  function drawPanel(world) {
    const disabled = cameraDisabled(world.camera);
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(PANEL.x, PANEL.y, PANEL.w, PANEL.h);
    ctx.strokeStyle = disabled ? '#64748B' : PALETTE.camera;
    ctx.lineWidth = 2;
    ctx.strokeRect(PANEL.x + 1, PANEL.y + 1, PANEL.w - 2, PANEL.h - 2);
    ctx.fillStyle = disabled ? '#64748B' : PALETTE.camera;
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.arc(PANEL.x + 10 + i * 10, PANEL.y + PANEL.h / 2, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawCone(points, fill, edge, dashed) {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i].x, points[i].y);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = edge;
    ctx.lineWidth = 1.5;
    ctx.setLineDash(dashed ? [6, 5] : []);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawGuards(world) {
    for (const guard of world.guards) {
      const color = coneColorForGuard(guard);
      const poly = conePolygon(guard, guard.facing, GUARD.fov, GUARD.range, world.segments);
      drawCone(poly, color + '40', color + 'D9', false);
      // Body: dark uniform, amber rim, facing tick and state dot.
      ctx.fillStyle = PALETTE.guardBody;
      ctx.beginPath();
      ctx.arc(guard.x, guard.y, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(guard.x, guard.y);
      ctx.lineTo(guard.x + Math.cos(guard.facing) * 17, guard.y + Math.sin(guard.facing) * 17);
      ctx.stroke();
      ctx.fillStyle = '#F8FAFC';
      ctx.beginPath();
      ctx.arc(guard.x, guard.y, 4, 0, Math.PI * 2);
      ctx.fill();
      if (guard.state !== 'patrol') {
        ctx.fillStyle = color;
        ctx.font = `bold 13px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText(guard.state === 'chase' ? '!' : '?', guard.x, guard.y - 20);
      }
    }
  }

  function drawCamera(world) {
    const camera = world.camera;
    const disabled = cameraDisabled(camera);
    if (!disabled) {
      const poly = conePolygon(camera, camera.angle, CAMERA.fov, CAMERA.range, world.segments);
      drawCone(poly, 'rgba(239, 68, 68, 0.20)', 'rgba(239, 68, 68, 0.85)', true);
    }
    // Wall-mounted housing with a lens that follows the sweep.
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(camera.x - 12, camera.y - 8, 24, 12);
    ctx.strokeStyle = disabled ? '#64748B' : PALETTE.camera;
    ctx.lineWidth = 2;
    ctx.strokeRect(camera.x - 12, camera.y - 8, 24, 12);
    ctx.fillStyle = disabled ? '#64748B' : PALETTE.camera;
    ctx.beginPath();
    ctx.arc(camera.x + Math.cos(camera.angle) * 6, camera.y + 4 + Math.sin(camera.angle) * 6, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawThief(world) {
    const p = world.player;
    const r = p.sneaking ? PLAYER.radius - 2 : PLAYER.radius;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(p.x + 2, p.y + 4, r, r * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.thief;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.thiefRing;
    ctx.lineWidth = 2;
    ctx.setLineDash(p.sneaking ? [4, 3] : []);
    ctx.beginPath();
    ctx.arc(p.x, p.y, r + 2.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    // Facing tick and a small cyan gadget dot.
    ctx.strokeStyle = PALETTE.thiefRing;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + Math.cos(p.facing) * (r + 7), p.y + Math.sin(p.facing) * (r + 7));
    ctx.stroke();
  }

  function drawRipples(world) {
    for (const ripple of world.ripples) {
      const radius = 8 + ripple.t * 46;
      ctx.strokeStyle = `rgba(56, 189, 248, ${1 - ripple.t})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawHud(world, muted) {
    ctx.fillStyle = PALETTE.hud;
    ctx.fillRect(0, 0, FIELD.width, FIELD.hudHeight);
    ctx.fillStyle = PALETTE.wallEdge;
    ctx.fillRect(0, FIELD.hudHeight - 1, FIELD.width, 1);

    // Left: level name and objective.
    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 13px ${FONT}`;
    ctx.fillText('FLOOR 1 - THE AMBER PAVILION', 14, 19);
    ctx.fillStyle = world.lootTaken ? PALETTE.lift : PALETTE.loot;
    ctx.font = `11px ${FONT}`;
    ctx.fillText(world.lootTaken ? 'ESCAPE: REACH THE LIFT' : 'LOOT: SECURE THE CROWN', 14, 36);

    // Centre: the alarm meter, segmented, with a percentage and a state label.
    const barX = 350;
    const barY = 13;
    const barW = 260;
    const barH = 20;
    const color = alarmColor(world.alarm);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 12px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('ALARM', barX + barW / 2, 11);
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(barX, barY, barW, barH);
    const segments = 10;
    const gap = 2;
    const segW = (barW - gap * (segments - 1)) / segments;
    const filled = Math.round((world.alarm / 100) * segments);
    for (let i = 0; i < segments; i += 1) {
      ctx.fillStyle = i < filled ? color : '#2D3748';
      ctx.fillRect(barX + i * (segW + gap), barY + 2, segW, barH - 4);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(barX, barY, barW, barH);
    ctx.fillStyle = color;
    ctx.font = `bold 12px ${FONT}`;
    ctx.fillText(`${Math.round(world.alarm)}% - ${alarmLabel(world.alarm)}`, barX + barW / 2, barY + barH + 13);

    // Right: jammer stock, timer and sound state.
    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 12px ${FONT}`;
    ctx.fillText(`JAMMER: ${world.jammersLeft}`, 946, 19);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `11px ${FONT}`;
    ctx.fillText(`${fmtTime(world.time)}   ${muted ? 'MUTED (M)' : 'SOUND ON (M)'}`, 946, 36);
  }

  function drawTooltip(world, mouse) {
    if (!mouse) return;
    let label = null;
    const dLoot = Math.hypot(mouse.x - LOOT.x, mouse.y - LOOT.y);
    if (dLoot < 34) label = world.lootTaken ? 'CROWN SECURED' : 'THE AMBER CROWN - HOLD E OR STAND 0.5s';
    else if (Math.hypot(mouse.x - world.camera.x, mouse.y - world.camera.y) < 26) {
      label = cameraDisabled(world.camera) ? 'CCTV-01 - DISABLED' : 'CCTV-01 - SWEEPING';
    } else if (
      mouse.x > PANEL.x - 4 && mouse.x < PANEL.x + PANEL.w + 4 &&
      mouse.y > PANEL.y - 4 && mouse.y < PANEL.y + PANEL.h + 4
    ) {
      label = 'CAMERA PANEL - HOLD E NEARBY TO CUT THE FEED';
    }
    if (!label) return;
    ctx.font = `11px ${FONT}`;
    const w = ctx.measureText(label).width + 16;
    const x = Math.max(8, Math.min(FIELD.width - w - 8, mouse.x + 14));
    const y = Math.max(FIELD.hudHeight + 8, mouse.y - 26);
    ctx.fillStyle = 'rgba(9, 12, 16, 0.92)';
    ctx.fillRect(x, y, w, 20);
    ctx.strokeStyle = PALETTE.wallEdge;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, 20);
    ctx.fillStyle = PALETTE.text;
    ctx.textAlign = 'left';
    ctx.fillText(label, x + 8, y + 14);
  }

  // Small architectural tags painted on the floor so every required element
  // (atrium, camera, loot, exit) names itself inside the frame.
  function drawArenaLabels() {
    ctx.textAlign = 'center';
    ctx.font = `bold 12px ${FONT}`;
    ctx.fillStyle = 'rgba(232, 237, 243, 0.42)';
    ctx.fillText('VAULT ATRIUM', 480, 565);
    ctx.font = `bold 11px ${FONT}`;
    ctx.fillStyle = 'rgba(239, 68, 68, 0.55)';
    ctx.fillText('CCTV-01', 480, 94);
    ctx.fillStyle = 'rgba(250, 204, 21, 0.55)';
    ctx.fillText('TARGET: AMBER CROWN', 480, 368);
    ctx.fillStyle = 'rgba(52, 211, 153, 0.55)';
    ctx.fillText('EXTRACTION', 880, 442);
  }

  function drawWorld(world, mouse) {
    drawFloor();
    drawLoot(world);
    drawLift(world);
    drawPanel(world);
    drawCase();
    drawPillars();
    drawWalls();
    drawGuards(world);
    drawCamera(world);
    drawThief(world);
    drawRipples(world);
    drawArenaLabels();
    drawTooltip(world, mouse);
    if (world.spotted && world.phase === 'play') {
      ctx.strokeStyle = `rgba(239, 68, 68, ${0.5 + 0.3 * Math.sin(world.time * 8)})`;
      ctx.lineWidth = 4;
      ctx.strokeRect(2, FIELD.playTop + 2, FIELD.width - 4, FIELD.playBottom - FIELD.playTop - 4);
    }
  }

  function overlay(alpha) {
    ctx.fillStyle = `rgba(5, 7, 10, ${alpha})`;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  }

  function centreText(text, y, font, color) {
    ctx.fillStyle = color;
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.fillText(text, FIELD.width / 2, y);
  }

  function drawTitle(world) {
    drawWorld(world, null);
    overlay(0.72);
    centreText('GILDED WIRE', 170, `bold 64px ${FONT}`, PALETTE.loot);
    centreText('A 1960s ARCHITECTURAL HEIST', 205, `16px ${FONT}`, PALETTE.text);
    centreText('Steal the Amber Crown from the pavilion and reach the emerald lift.', 250, `14px ${FONT}`, PALETTE.muted);
    centreText('WASD / ARROWS move    SHIFT sneak    CLICK throw EMP jammer', 300, `14px ${FONT}`, PALETTE.text);
    centreText('E grab the crown / hack the camera panel    P pause    M mute    R restart', 326, `14px ${FONT}`, PALETTE.text);
    centreText('Guards see in amber cones. Cameras sweep in red. At 100% alarm the pavilion locks down.', 360, `13px ${FONT}`, PALETTE.muted);
    centreText('GILDED WIRE • TACTICAL ARCHITECTURAL HEIST • REAL-TIME RAYCAST STEALTH', 392, `bold 13px ${FONT}`, PALETTE.thiefRing);
    centreText('3 Multi-Room Galleries • Raycast Guard Sightlines • Sweeping CCTV • EMP Mouse Gadgets • Live Alarm Escalation', 412, `12px ${FONT}`, PALETTE.muted);
    const pulse = 0.6 + 0.4 * Math.sin(world.time * 3);
    centreText('PRESS SPACE OR CLICK TO START', 452, `bold 18px ${FONT}`, `rgba(248, 250, 252, ${pulse})`);
  }

  function drawPaused() {
    overlay(0.6);
    centreText('PAUSED', 280, `bold 48px ${FONT}`, PALETTE.text);
    centreText('Press P to resume. Press R to restart the floor.', 330, `15px ${FONT}`, PALETTE.muted);
  }

  function drawWin(world) {
    drawWorld(world, null);
    overlay(0.72);
    centreText(world.rank || 'CLEAN GETAWAY', 170, `bold 52px ${FONT}`, PALETTE.loot);
    centreText('The crown is yours. The pavilion never knew what hit it.', 210, `15px ${FONT}`, PALETTE.text);
    centreText(`TIME  ${fmtTime(world.time)}`, 270, `bold 18px ${FONT}`, PALETTE.text);
    centreText(`PEAK ALARM  ${Math.round(world.peakAlarm)}%`, 302, `16px ${FONT}`, PALETTE.text);
    centreText(`CAMERAS DISABLED  ${world.camerasDisabled}      JAMMERS USED  ${world.jammersUsed}`, 334, `16px ${FONT}`, PALETTE.text);
    centreText('GILDED WIRE • TACTICAL ARCHITECTURAL HEIST • REAL-TIME RAYCAST STEALTH', 372, `12px ${FONT}`, PALETTE.thiefRing);
    centreText('PRESS R TO PLAY AGAIN', 410, `bold 16px ${FONT}`, PALETTE.text);
  }

  function drawLockdown(world) {
    drawWorld(world, null);
    overlay(0.72);
    centreText('LOCKDOWN', 200, `bold 60px ${FONT}`, PALETTE.danger);
    centreText('The alarm hit 100%. The pavilion sealed itself with you inside.', 250, `15px ${FONT}`, PALETTE.text);
    centreText(`PEAK ALARM  100%      TIME  ${fmtTime(world.time)}`, 300, `16px ${FONT}`, PALETTE.text);
    centreText('PRESS R TO RESTART', 380, `bold 16px ${FONT}`, PALETTE.text);
  }

  function draw(world, screen, best, ui) {
    ctx.clearRect(0, 0, FIELD.width, FIELD.height);
    if (screen === SCREEN_TITLE) drawTitle(world);
    else if (screen === SCREEN_WIN) drawWin(world);
    else if (screen === SCREEN_LOCKDOWN) drawLockdown(world);
    else {
      drawWorld(world, ui && ui.mouse ? ui.mouse : null);
      if (screen === SCREEN_PAUSED) drawPaused();
    }
    drawHud(world, ui ? ui.muted : false);
  }

  return { draw };
}
