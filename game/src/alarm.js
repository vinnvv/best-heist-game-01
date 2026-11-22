// The alarm meter: 0 to 100, climbing while any guard or camera sees the thief and falling
// back while the thief stays hidden. Sneaking halves the guard rate; the camera is always fast.

import { ALARM, CAMERA } from './config.js';
import { guardSees } from './guards.js';
import { cameraSees } from './cameras.js';

/**
 * Work out what is seeing the thief this step. Returns the alarm rise per second and which
 * watchers have eyes on the thief, so the world can react (call a guard, play a warning).
 */
export function computeSeen(state) {
  const seenByGuards = [];
  let rate = 0;
  for (let i = 0; i < state.guards.length; i += 1) {
    if (guardSees(state.guards[i], state.player, state.segments)) {
      seenByGuards.push(i);
      rate += state.player.sneaking ? ALARM.guardRateSneak : ALARM.guardRate;
    }
  }
  let seenByCamera = false;
  if (cameraSees(state.camera, state.player, state.segments)) {
    seenByCamera = true;
    rate += CAMERA.alarmRate;
  }
  return { rate, seenByGuards, seenByCamera };
}

/** Apply the rise or the safe decay for one step; returns true when the alarm hits the top. */
export function updateAlarm(state, dt, seen) {
  if (seen.rate > 0) {
    state.alarm = Math.min(ALARM.max, state.alarm + seen.rate * dt);
  } else {
    state.alarm = Math.max(0, state.alarm - ALARM.decay * dt);
  }
  if (state.alarm > state.peakAlarm) state.peakAlarm = state.alarm;
  return state.alarm >= ALARM.max;
}

/** The HUD label for the current alarm level. */
export function alarmLabel(alarm) {
  if (alarm < 40) return 'SAFE';
  if (alarm < 80) return 'CAUTION';
  return 'DANGER';
}
