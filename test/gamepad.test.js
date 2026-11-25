import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createGamepadInput } from '../src/gamepad.js';

test('standard gamepad reports button edges, analog triggers, and stick dead zone', () => {
  const pad = {
    mapping: 'standard', index: 0, axes: [0.05, -0.1, 0, 0],
    buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0 })),
  };
  let connected = true;
  const read = createGamepadInput(() => connected ? [pad] : []);
  assert.equal(read().active, false);
  pad.axes = [0, -0.6, 1, 0];
  pad.buttons[7].value = 0.45;
  pad.buttons[2].pressed = true;
  const input = read();
  assert.equal(input.pressed.interact, true);
  assert.ok(Math.abs(input.forward - 0.5) < 1e-9);
  assert.equal(input.lookX, 1);
  assert.equal(input.throttle, 0.45);
  assert.equal(read().pressed.interact, false);
  connected = false;
  assert.equal(read(), null);
  connected = true;
  assert.equal(read().pressed.interact, true);
});

test('ignores unsupported mappings and unavailable browser access', () => {
  assert.equal(createGamepadInput(() => [{ mapping: '' }])(), null);
  assert.equal(createGamepadInput(() => { throw new Error('Blocked'); })(), null);
});
