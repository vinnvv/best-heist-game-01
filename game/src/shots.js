// The screenshot scenes behind ?shot=hero|title|chase|win. Each one sets a real world state
// (never a mock render) and returns the screen to draw over it, so the frame is exactly what
// a player sees at that moment, and the same seed always gives the same frame.

import { resetWorld } from './world.js';
import { SCREEN_LOCKDOWN, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

/**
 * Set `world` to the named scene and return the screen to draw over it.
 * Unknown names stage the title scene.
 */
export function stageShot(name, world) {
  resetWorld(world);
  if (name === 'title') {
    world.time = 0.44;
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'hero') {
    // The thief crouched behind the north atrium pillar; guard 1's amber cone is centred on
    // the pillar and cut cleanly by its edge; the CCTV sweep covers the gold loot; alarm 40%.
    world.time = 0.44;
    world.alarm = 40;
    world.peakAlarm = 40;
    world.player.x = 378;
    world.player.y = 196;
    world.player.sneaking = true;
    world.player.facing = 0;
    const guard1 = world.guards[0];
    guard1.x = 530;
    guard1.y = 180;
    guard1.facing = (174 * Math.PI) / 180;
    guard1.state = 'patrol';
    const guard2 = world.guards[1];
    guard2.x = 780;
    guard2.y = 320;
    guard2.facing = Math.PI / 2;
    guard2.state = 'patrol';
    world.camera.angle = (102 * Math.PI) / 180;
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'chase') {
    // Guard 1 has spotted the thief mid-atrium and is closing in; alarm 68% and climbing.
    world.time = 1.2;
    world.alarm = 68;
    world.peakAlarm = 68;
    world.player.x = 400;
    world.player.y = 320;
    world.player.sneaking = false;
    world.player.facing = Math.PI;
    world.spotted = true;
    const guard1 = world.guards[0];
    guard1.x = 470;
    guard1.y = 290;
    guard1.facing = Math.atan2(320 - 290, 400 - 470);
    guard1.state = 'chase';
    const guard2 = world.guards[1];
    guard2.x = 720;
    guard2.y = 340;
    guard2.facing = Math.PI;
    guard2.state = 'suspicious';
    guard2.investigate = { x: 480, y: 324 };
    world.camera.angle = (78 * Math.PI) / 180;
    world.jammersLeft = 1;
    world.jammersUsed = 1;
    world.ripples.push({ x: 520, y: 300, t: 0.4 });
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'win') {
    // Crown taken, thief on the emerald lift, MASTERMIND rank with the run's stats.
    world.time = 96;
    world.alarm = 12;
    world.peakAlarm = 32;
    world.lootTaken = true;
    world.player.x = 880;
    world.player.y = 480;
    world.player.facing = -Math.PI / 2;
    world.phase = 'won';
    world.rank = 'MASTERMIND';
    world.camerasDisabled = 1;
    world.jammersUsed = 1;
    world.jammersLeft = 1;
    const guard1 = world.guards[0];
    guard1.x = 350;
    guard1.y = 120;
    guard1.facing = 0;
    const guard2 = world.guards[1];
    guard2.x = 780;
    guard2.y = 180;
    guard2.facing = Math.PI / 2;
    world.camera.angle = Math.PI / 2;
    return { screen: SCREEN_WIN, best: 0 };
  }
  if (name === 'lockdown') {
    world.time = 74;
    world.alarm = 100;
    world.peakAlarm = 100;
    world.phase = 'lockdown';
    world.player.x = 480;
    world.player.y = 300;
    return { screen: SCREEN_LOCKDOWN, best: 0 };
  }
  if (name === 'paused') {
    world.time = 12;
    world.alarm = 22;
    world.player.x = 200;
    world.player.y = 500;
    return { screen: SCREEN_PAUSED, best: 0 };
  }
  world.time = 0.44;
  return { screen: SCREEN_TITLE, best: 0 };
}
