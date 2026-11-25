import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from '../vendor/three.module.js';
import { createDriving } from '../src/driving.js';
import { Player } from '../src/player.js';
import { createShop } from '../src/shop.js';
import { createCafeState } from '../src/state.js';
import { readProgress, writeProgress } from '../src/storage.js';
import { createWalkthrough } from '../src/walkthrough.js';

test('loads a legacy version 1 save and rejects missing restore data', () => {
  const state = createCafeState();
  const shop = createShop(state, {}, () => {});
  const save = {
    state: state.snapshot(), shop: shop.snapshot(),
    scene: { tables: [], coffeeMachines: [] },
    customers: { customers: [], admission: [], payments: [], doorway: [] },
    player: { feet: [0, 0, 0], yaw: 0, pitch: 0, driving: true },
    television: { channel: 0, tvTime: 0 },
  };
  let stored = JSON.stringify({ version: 1, ...save });
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: () => stored,
    setItem: (key, value) => { stored = value; },
  } });
  try {
    assert.deepEqual(readProgress(), { version: 1, ...save });
    stored = JSON.stringify({ version: 1, ...save, scene: { coffeeMachines: [] } });
    assert.equal(readProgress(), null);
    writeProgress(() => ({ ...save, walkthrough: 3 }));
    assert.equal(readProgress().walkthrough, 3);
    stored = '{broken';
    assert.equal(readProgress(), null);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
    else delete globalThis.localStorage;
  }
});

test('walkthrough progresses through opening, an active computer, admission and payment', () => {
  const state = createCafeState();
  state.stations.forEach(station => { station.powered = false; });
  const guide = createWalkthrough(null);
  guide.admitCustomer();
  assert.equal(guide.step, 0);
  state.open = true;
  guide.update(state);
  assert.equal(guide.step, 1);
  state.stations[0].powered = true;
  guide.update(state);
  assert.equal(guide.step, 2);
  guide.admitCustomer();
  assert.equal(guide.step, 3);
  const resumed = createWalkthrough({ walkthrough: guide.step });
  resumed.collectPayment();
  assert.equal(resumed.goal, '');
  resumed.toggle();
  resumed.update(state);
  assert.equal(resumed.step, 2);
  resumed.toggle();
  assert.equal(resumed.step, null);
  assert.equal(createWalkthrough({ version: 1 }).step, null);
});

test('shop checkout requires bank approval and creates a paid order', () => {
  const state = createCafeState();
  const shop = createShop(state, {}, () => {});
  shop.add('desk');
  assert.equal(shop.checkout(), false);
  const initialCash = state.cash;
  shop.requestLink();
  shop.approveLink();
  assert.equal(shop.checkout(), true);
  assert.equal(state.cash, initialCash - 450);
  assert.equal(shop.basket.length, 0);
  assert.equal(shop.orders[0].kind, 'desk');
});

test('restores the chase camera and exits the restored vehicle', () => {
  const camera = new THREE.PerspectiveCamera();
  const player = new Player(camera, []);
  const car = new THREE.Object3D();
  car.position.set(2, 0, 4);
  let mode = 'pause';
  const driving = createDriving({ camera, player, shadowMap: {}, driveSpeed: {},
    setMode: value => { mode = value; }, sound: { play() {} } });
  driving.restore({ car });
  assert.equal(driving.active, true);
  assert.equal(mode, 'pause');
  assert.deepEqual(player.feet.toArray(), [2, 0, 4]);
  assert.deepEqual(camera.position.toArray(), [6.5, 2.75, 4]);
  driving.leave();
  assert.equal(driving.active, false);
  assert.equal(mode, 'play');
});
