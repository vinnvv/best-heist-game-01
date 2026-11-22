// Every tuning number and colour in one place. The playfield is a fixed 960x600 logical area:
// a 48 px HUD on top and a 552 px tall floor plan below it, so the whole heist fits one frame.
export const FIELD = { width: 960, height: 600, hudHeight: 48, playTop: 48, playBottom: 600 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 11,
  speed: 165,
  sneakSpeed: 95,
  grabRange: 38,
  grabTime: 0.5,
};

export const GUARD = {
  radius: 13,
  patrolSpeed: 85,
  investigateSpeed: 120,
  chaseSpeed: 150,
  range: 210,
  fov: (75 * Math.PI) / 180,
  pauseAtWaypoint: 1.2,
  suspiciousTime: 0.15,
  chaseTime: 0.8,
  loseSightTime: 2.0,
  touchAlarm: 45,
};

export const CAMERA = {
  range: 280,
  fov: (85 * Math.PI) / 180,
  sweep: (42 * Math.PI) / 180,
  sweepSpeed: 0.55,
  alarmRate: 45,
  disabledByJammer: 6,
  disabledByPanel: 8,
  panelCooldown: 12,
};

export const ALARM = {
  guardRate: 30,
  guardRateSneak: 15,
  decay: 15,
  max: 100,
};

export const JAMMER = { max: 2, cameraRadius: 80, lureRadius: 100 };

export const PALETTE = {
  wall: '#0D1117',
  wallEdge: '#2D3748',
  floorA: '#161B24',
  floorB: '#1C2331',
  floorLine: '#232B3A',
  hud: '#090C10',
  pillar: '#CBD5E1',
  pillarEdge: '#64748B',
  caseGlass: '#38BDF8',
  thief: '#F8FAFC',
  thiefRing: '#38BDF8',
  guardBody: '#1E293B',
  guardEdge: '#F59E0B',
  cone: '#F59E0B',
  camera: '#EF4444',
  loot: '#FACC15',
  velvet: '#7F1D1D',
  lift: '#34D399',
  text: '#E8EDF3',
  muted: '#8B93A3',
  danger: '#EF4444',
  warn: '#F59E0B',
  safe: '#10B981',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Wall thickness for the outer shell and the room dividers. */
export const WALL = 14;

// Solid rectangles: block movement and block sight (raycast).
// Outer shell.
const OUTER = [
  { x: 0, y: 48, w: 960, h: 14 },
  { x: 0, y: 586, w: 960, h: 14 },
  { x: 0, y: 48, w: 14, h: 552 },
  { x: 946, y: 48, w: 14, h: 552 },
];
// Dividers with door gaps: A-B gap y 280..368, B-C gap y 300..388.
const DIVIDERS = [
  { x: 293, y: 48, w: 14, h: 232 },
  { x: 293, y: 368, w: 14, h: 218 },
  { x: 653, y: 48, w: 14, h: 252 },
  { x: 653, y: 388, w: 14, h: 198 },
];
// Marble pillars (solid).
export const PILLARS = [
  { x: 100, y: 170, w: 40, h: 40 },
  { x: 100, y: 420, w: 40, h: 40 },
  { x: 410, y: 170, w: 40, h: 40 },
  { x: 410, y: 430, w: 40, h: 40 },
];

export const SOLIDS = [...OUTER, ...DIVIDERS, ...PILLARS];

// Low cover: blocks movement but not sight (the glass display case).
export const LOW_COVER = [{ x: 190, y: 300, w: 64, h: 36 }];

export const LOOT = { x: 480, y: 324, radius: 26 };
export const LIFT = { x: 852, y: 452, w: 56, h: 56 };
export const PANEL = { x: 884, y: 96, w: 40, h: 28 };
export const CAMERA_POS = { x: 480, y: 70 };
export const PLAYER_START = { x: 60, y: 540 };

export const GUARD_WAYPOINTS = [
  // Guard 1 loops around the north atrium pillar.
  [
    { x: 350, y: 120 },
    { x: 510, y: 120 },
    { x: 510, y: 250 },
    { x: 350, y: 250 },
  ],
  // Guard 2 walks the security corridor up and down.
  [
    { x: 780, y: 120 },
    { x: 780, y: 500 },
  ],
];

export const BEST_KEY = 'gilded-wire.best';
