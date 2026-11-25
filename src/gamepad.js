const buttons = {
  confirm: 0,
  back: 1,
  interact: 2,
  drink: 3,
  rotate: 4,
  moveFurniture: 5,
  phone: 8,
  pause: 9,
  sprint: 10,
  up: 12,
  down: 13,
  left: 14,
  right: 15,
};

function stick(x = 0, y = 0) {
  const magnitude = Math.hypot(x, y);
  const deadZone = 0.2;
  if (magnitude <= deadZone) return [0, 0];
  const scale = (Math.min(1, magnitude) - deadZone) / (1 - deadZone) / magnitude;
  return [x * scale, y * scale];
}

export function createGamepadInput(getGamepads = () => navigator.getGamepads?.()) {
  let index = null;
  let previousButtons = {};

  return function read() {
    let pads;
    try {
      pads = getGamepads();
    } catch {
      return null;
    }
    const pad = pads?.[index] ?? Array.from(pads ?? []).find(candidate => candidate?.mapping === 'standard');
    if (!pad || pad.mapping !== 'standard') {
      index = null;
      previousButtons = {};
      return null;
    }
    if (index !== pad.index) previousButtons = {};
    index = pad.index;
    const held = {};
    const pressed = {};
    for (const [action, button] of Object.entries(buttons)) {
      held[action] = pad.buttons[button]?.pressed === true;
      pressed[action] = held[action] && !previousButtons[action];
    }
    previousButtons = held;
    const [right, down] = stick(...pad.axes.slice(0, 2));
    const [lookX, lookY] = stick(...pad.axes.slice(2, 4));
    return {
      pressed, right, forward: -down, lookX, lookY, sprint: held.sprint, brake: held.confirm,
      throttle: (pad.buttons[7]?.value ?? 0) - (pad.buttons[6]?.value ?? 0),
      active: Boolean(right || down || lookX || lookY || Object.values(pressed).some(Boolean) ||
        (pad.buttons[7]?.value ?? 0) > 0.1 || (pad.buttons[6]?.value ?? 0) > 0.1),
    };
  };
}

export function navigateGamepadMenu(root, pressed) {
  if (!root) return;
  const controls = [...root.querySelectorAll('button, input')].filter(control =>
    !control.disabled && !control.closest('[hidden]') && control.tabIndex >= 0);
  if (!controls.length) return;
  const index = controls.indexOf(document.activeElement);
  const direction = Number(pressed.down || pressed.right) - Number(pressed.up || pressed.left);
  if (direction) controls[index < 0 ? 0 : (index + direction + controls.length) % controls.length].focus();
  else if (pressed.confirm) {
    if (index < 0) controls[0].focus();
    else controls[index].click();
  }
}
