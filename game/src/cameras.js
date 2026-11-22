// The sweeping CCTV on the atrium's north wall: it pans back and forth over a fixed arc, its
// cone cut by walls like a guard's, and it cannot chase. When it spots the thief the alarm
// climbs fast and the nearest guard is called to the camera's position.

import { CAMERA, CAMERA_POS } from './config.js';
import { inWedge, losClear } from './raycast.js';

/** Base direction: straight down from the north wall, into the atrium. */
export const CAMERA_BASE_ANGLE = Math.PI / 2;

export function createCamera() {
  return {
    x: CAMERA_POS.x,
    y: CAMERA_POS.y,
    angle: CAMERA_BASE_ANGLE,
    disabledTimer: 0,
    panelCooldown: 0,
    alertCooldown: 0,
  };
}

/** Advance the sweep from the world's clock; a disabled camera stays frozen and dark. */
export function updateCamera(camera, time, dt) {
  if (camera.disabledTimer > 0) camera.disabledTimer -= dt;
  if (camera.panelCooldown > 0) camera.panelCooldown -= dt;
  if (camera.alertCooldown > 0) camera.alertCooldown -= dt;
  if (camera.disabledTimer <= 0) {
    camera.angle = CAMERA_BASE_ANGLE + Math.sin(time * CAMERA.sweepSpeed) * CAMERA.sweep;
  }
}

export function cameraDisabled(camera) {
  return camera.disabledTimer > 0;
}

/** Whether the camera can see the thief right now (range, wedge, line of sight, powered). */
export function cameraSees(camera, thief, segments) {
  if (cameraDisabled(camera)) return false;
  if (!inWedge(camera, camera.angle, CAMERA.fov, CAMERA.range, thief)) return false;
  return losClear(camera, thief, segments);
}
