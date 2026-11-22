// Keyboard and mouse input: WASD or arrows to move, Shift to sneak, E to interact, P to
// pause, M to mute, R to restart, Space or click to confirm. Mouse position is reported in
// canvas coordinates so clicks land where the player aimed.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_RESTART = 4;
export const ACTION_MUTE = 8;

const MOVE_KEYS = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
};

export function createInput(canvas) {
  const held = new Set();
  let actions = 0;
  let click = null;
  let mouse = null;

  function toCanvas(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  window.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
      actions |= ACTION_CONFIRM;
      event.preventDefault();
    } else if (event.code === 'KeyP') actions |= ACTION_PAUSE;
    else if (event.code === 'KeyR') actions |= ACTION_RESTART;
    else if (event.code === 'KeyM') actions |= ACTION_MUTE;
    else if (MOVE_KEYS[event.code] || event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
      held.add(event.code);
      event.preventDefault();
    }
  });
  window.addEventListener('keyup', (event) => {
    held.delete(event.code);
  });
  canvas.addEventListener('mousemove', (event) => {
    mouse = toCanvas(event);
  });
  canvas.addEventListener('mousedown', (event) => {
    mouse = toCanvas(event);
    click = mouse;
    if (event.button === 0) actions |= ACTION_CONFIRM;
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  /** The normalised movement direction from the keys currently held down. */
  function direction() {
    let dx = 0;
    let dy = 0;
    if (held.has('KeyA') || held.has('ArrowLeft')) dx -= 1;
    if (held.has('KeyD') || held.has('ArrowRight')) dx += 1;
    if (held.has('KeyW') || held.has('ArrowUp')) dy -= 1;
    if (held.has('KeyS') || held.has('ArrowDown')) dy += 1;
    if (dx !== 0 && dy !== 0) {
      dx /= Math.SQRT2;
      dy /= Math.SQRT2;
    }
    return { dx, dy };
  }

  function sneak() {
    return held.has('ShiftLeft') || held.has('ShiftRight');
  }

  function interact() {
    return held.has('KeyE');
  }

  /** Actions queued since the last call; each is delivered exactly once. */
  function takeActions() {
    const out = actions;
    actions = 0;
    return out;
  }

  /** The click point since the last call, or null. */
  function takeClick() {
    const out = click;
    click = null;
    return out;
  }

  return { direction, sneak, interact, takeActions, takeClick, get mouse() { return mouse; } };
}
