import { readProgress, readSettings, writeProgress, writeSettings } from './storage.js';
import { createArcade } from './arcade.js';
import { channels } from './television.js';
import * as THREE from '../vendor/three.module.js';
import { buildCafe } from './scene.js';
import { Player } from './player.js';
import { clockRate, createCafeState, foodPrice } from './state.js';
import { createCustomerLoop } from './customer.js';
import { carPrice, catalog, createShop, decor } from './shop.js';
import { createShopUi, shippingText } from './shop-ui.js';
import { createDriving, driveKeys } from './driving.js';
import { createActionHint } from './action-hint.js';
import { createSound } from './sound.js';

const select = id => document.getElementById(id);
const viewport = select('viewport');
const overlay = select('overlay');
const cafeNameInput = select('cafe-name');
const nameForm = select('name-form');
const nameError = select('name-error');
const aim = select('aim');
const prompt = select('prompt');
const updateActionHint = createActionHint(select('action-hint'));
const settings = select('settings');
const settingsOpen = select('settings-open');
const sensitivity = select('sensitivity');
const invertY = select('invert-y');
const volume = select('volume');
const music = select('music-volume');
const sound = createSound();
const computer = select('computer');
const canvas = () => renderer.domElement;
const savedProgress = readProgress();
const savedSettings = readSettings();
if (Number.isFinite(savedSettings?.sensitivity)) sensitivity.value = savedSettings.sensitivity;
invertY.checked = savedSettings?.invertY === true;
if (Number.isFinite(savedSettings?.volume)) volume.value = savedSettings.volume;
if (Number.isFinite(savedSettings?.music)) music.value = savedSettings.music;
const clock = select('clock');
const day = select('day');
const cash = select('cash');
const customerStatus = select('customer-status');
const energyGain = select('energy-gain');
const shopOpenNote = select('shop-open-note');
const money = new Intl.NumberFormat('tr-TR');
const state = createCafeState();

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xc4d6e9);
scene.fog = new THREE.Fog(0xc4d6e9, 16, 42);
const camera = new THREE.PerspectiveCamera(64, 1, 0.055, 65);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;
renderer.shadowMap.needsUpdate = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
viewport.append(renderer.domElement);

const cafe = buildCafe(scene, state);
const player = new Player(camera, cafe.colliders);
let mode = 'naming';
let saveElapsed = 0;
let officeOn = false;
let arcade = null;
let arcadeKind = null;
let phoneApp = 'food';
let movingFurniture = null;
let phonePage = 'locked';
let phoneOrigin = 'play';
let phoneClosing = false;
let visibleBillCount = 0;
let forecastDay = 0;
let channel = 0;
let tvTime = 0;
let seatDestination = 'desk';
let coffee = false;
let currentApp = null;
let panelSignature = '';
let seatMotion = null;
let walkPath = null;
let strikeTime = 0;
let deskAngle = -Math.PI / 2;
let candidate = null;
let lightingNight = null;
let lastDoorDirection = false;
let physicalMinute = -1;
let cashTimer = 0;
let cashGoal = state.cash;
let shownCash = state.cash;
let home = false;
let batEquipped = false;
let lastStride = 0;
let pendingLock = false;
let lockTimer = 0;
const driveControls = select('drive-controls');
const drivingController = createDriving({
  player, camera, shadowMap: renderer.shadowMap, driveSpeed: select('drive-speed'), setMode, sound,
});
let target = null;
let energyGainTimer = 0;
let shopOpenTimer = 0;
let lastTime = null;
let previousLabel = '';
let targetCountdown = 0;
let displayedCash = null;
const customers = createCustomerLoop(state, cafe);
const shop = createShop(state, cafe, order => {
  sound.play(order.kind === 'car' ? 'boot' : 'delivery');
  if (order.kind === 'car') renderer.shadowMap.needsUpdate = true;
});
const shopUi = createShopUi({
  shop, state, money, button, summaryCard, sound, renderApp, renderPhone, syncHud,
});
const bat = new THREE.Group();
const handle = new THREE.Mesh(
  new THREE.CylinderGeometry(0.034, 0.018, 0.65, 12),
  new THREE.MeshStandardMaterial({ color: 0x976442, roughness: 0.76 }),
);
const grip = new THREE.Mesh(
  new THREE.CylinderGeometry(0.024, 0.024, 0.16, 10),
  new THREE.MeshStandardMaterial({ color: 0x31343b, roughness: 0.9 }),
);
grip.position.y = -0.23;
bat.add(handle, grip);
camera.add(bat);
scene.add(camera);
bat.visible = false;
const packageMesh = new THREE.Mesh(
  new THREE.BoxGeometry(0.32, 0.22, 0.23),
  new THREE.MeshStandardMaterial({ color: 0xc29a67, roughness: 0.9 }),
);
const tape = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.004, 0.235),
  new THREE.MeshStandardMaterial({ color: 0xe1c7a0, roughness: 0.8 }));
tape.position.y = 0.112;
packageMesh.add(tape);
packageMesh.position.set(0.27, -0.31, -0.61);
packageMesh.rotation.set(-0.13, -0.25, -0.07);
packageMesh.visible = false;
camera.add(packageMesh);
const carriedCoffee = cafe.coffeeMug(camera, 0.23, -0.26, -0.49);
carriedCoffee.scale.setScalar(1.55);
carriedCoffee.visible = false;
const movementKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight', 'Space']);

function saveProgress() {
  if (mode === 'naming') return;
  writeProgress(() => ({
    state: state.snapshot(), shop: shop.snapshot(), scene: cafe.snapshot(),
    customers: customers.snapshot(),
    player: { feet: player.feet.toArray(), yaw: player.yaw, pitch: player.pitch, home, coffee,
      batEquipped, driving: drivingController.active },
    television: { channel, tvTime },
  }));
}

function restoreProgress(save) {
  shop.restore(save.shop);
  state.restore(save.state);
  ({ home, coffee, batEquipped } = save.player);
  cafe.restore(save.scene, batEquipped);
  customers.restore(save.customers);
  lastDoorDirection = cafe.door.opening;
  ({ channel, tvTime } = save.television);
  officeOn = state.officePower;
  updateComputer();
  player.feet.fromArray(save.player.feet);
  player.feet.y = 0;
  player.yaw = save.player.yaw;
  player.pitch = save.player.pitch;
  if (save.player.driving && cafe.ownedCar) {
    drivingController.restore(cafe.ownedCar);
  } else {
    player.syncCamera();
    camera.rotation.set(player.pitch, player.yaw, 0, 'YXZ');
  }
  select('cafe-brand').textContent = state.cafeName;
  select('pause-title').textContent = 'OYUNA DEVAM ET';
  setMode('pause');
  updateHudAndDesk(0);
  cafe.update(0, player);
}

function resize() {
  const { clientWidth, clientHeight } = viewport;
  camera.aspect = clientWidth / Math.max(1, clientHeight);
  camera.updateProjectionMatrix();
  renderer.setSize(clientWidth, clientHeight, false);
  renderer.render(scene, camera);
}

function setMode(next) {
  mode = next;
  const playing = next === 'play';
  const driving = next === 'driving';
  const moving = next === 'sitting' || next === 'standing';
  const naming = next === 'naming';
  overlay.hidden = playing || driving;
  driveControls.hidden = !driving;
  overlay.classList.toggle('naming-view', naming);
  select('hud').hidden = naming;
  select('name-screen').hidden = !naming;
  overlay.classList.toggle('moving-seat', moving);
  overlay.classList.toggle('paused-view', next === 'pause' || next === 'settings');
  overlay.classList.toggle('desk-view', next === 'desk');
  overlay.classList.toggle('phone-view', next === 'phone');
  overlay.classList.toggle('tv-view', next === 'tv');
  select('pause-screen').hidden = next !== 'pause';
  select('phone').hidden = next !== 'phone';
  select('tv-remote').hidden = next !== 'tv';
  select('phone-trigger').hidden = !['play','pause','phone','desk'].includes(next);
  computer.hidden = next !== 'desk';
  bat.visible = playing && batEquipped && !shop.carried && !coffee;
  packageMesh.visible = playing && Boolean(shop.carried);
  carriedCoffee.visible = playing && coffee;
  settings.hidden = next !== 'settings';
  settingsOpen.hidden = next !== 'pause';
  aim.hidden = !playing;
  viewport.classList.toggle('playing', playing || driving);
  prompt.hidden = true;
  updateActionHint(playing ? { coffee, movingFurniture, packageKind: shop.carried?.kind } : {});
  aim.classList.remove('target');
  target = null;
  previousLabel = '';
  targetCountdown = 0;
  if (!playing) {
    cafe.previewDesk(null);
    candidate = null;
  }
  sound.updateMusic(playing || driving || moving || ['desk','tv','phone'].includes(next));
  if (playing || driving) {
    overlay.querySelector(':focus')?.blur();
    if (select('pause-title').textContent === 'OYUNA DEVAM ET') select('pause-title').textContent = 'DURAKLATILDI';
    return;
  }
  player.stop();
  if (next !== 'standing' && document.pointerLockElement === canvas()) document.exitPointerLock();
  if (next === 'pause') {
    select('resume').focus();
    saveProgress();
  }
}

function syncSettings() {
  select('sensitivity-value').textContent = `${sensitivity.value}%`;
  select('volume-value').textContent = `${volume.value}%`;
  sound.setVolume(Number(volume.value) / 100);
  select('music-value').textContent = `${music.value}%`;
  sound.setMusic(Number(music.value) / 100);
}

function saveSettings() {
  syncSettings();
  writeSettings({
    sensitivity: Number(sensitivity.value),
    invertY: invertY.checked,
    volume: Number(volume.value),
    music: Number(music.value),
  });
}

function look(dx, dy) {
  const multiplier = Number(sensitivity.value) / 100;
  player.look(dx * multiplier, dy * multiplier * (invertY.checked ? -1 : 1));
}

function lockFailed() {
  if (!pendingLock) return;
  pendingLock = false;
  clearTimeout(lockTimer);
  if (mode === 'standing') return;
  if (mode === 'phone') { phoneClosing = false; return; }
  if (mode === 'naming') {
    nameError.textContent = 'Fare kilidi açılamadı. Oyunu aç düğmesine tıklayarak tekrar dene.';
    nameError.hidden = false;
    select('name-retry').hidden = false;
  }
  else select('resume').title = 'Fare kilidi açılamadı · Tekrar dene';
}

function requestPlay() {
  sound.unlock();
  if (document.pointerLockElement === canvas()) {
    if (mode !== 'standing') setMode(drivingController.active ? 'driving' : 'play');
    return;
  }
  if (pendingLock) return;
  pendingLock = true;
  lockTimer = setTimeout(lockFailed, 1800);
  try {
    canvas().requestPointerLock()?.catch(lockFailed);
  } catch {
    lockFailed();
  }
}

document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement === canvas()) {
    pendingLock = false;
    clearTimeout(lockTimer);
    if (mode === 'naming') {
      state.cafeName = cafeNameInput.value.trim().slice(0,26);
      select('cafe-brand').textContent = state.cafeName;
      cafe.renameCafe();
    }
    if (mode === 'phone' && phoneClosing) {
      phoneClosing = false;
      setMode('play');
    } else if (mode === 'naming' || mode === 'pause') setMode(drivingController.active ? 'driving' : 'play');
    else if (mode !== 'play' && mode !== 'driving' && mode !== 'standing') document.exitPointerLock();
  } else if (mode === 'play' || mode === 'driving') {
    setMode('pause');
  }
});
document.addEventListener('pointerlockerror', lockFailed);
document.addEventListener('mousemove', event => {
  if (mode === 'play' && document.pointerLockElement === canvas()) look(event.movementX, event.movementY);
});
window.addEventListener('blur', () => {
  if (mode === 'play' || mode === 'driving') setMode('pause');
});
const settingsTabs = ['mouse','audio','controls'];
let activeSettingsTab = 'mouse';
function selectSettingsTab(tab) {
  activeSettingsTab = tab;
  for (const key of settingsTabs) {
    const selected = key === tab;
    const control = select(`tab-${key}`);
    control.setAttribute('aria-selected', String(selected));
    control.tabIndex = selected ? 0 : -1;
    select(`settings-${key}`).hidden = !selected;
  }
  select(`tab-${tab}`).focus();
}
for (const tab of settingsTabs) {
  const control = select(`tab-${tab}`);
  control.addEventListener('click', () => selectSettingsTab(tab));
  control.addEventListener('keydown', event => {
    const index = settingsTabs.indexOf(tab);
    if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? settingsTabs.length - 1
      : (index + settingsTabs.length + (event.key === 'ArrowLeft' ? -1 : 1)) % settingsTabs.length;
    selectSettingsTab(settingsTabs[next]);
  });
}
settingsOpen.addEventListener('click', () => {
  setMode('settings');
  selectSettingsTab(activeSettingsTab);
});
select('settings-back').addEventListener('click', () => setMode('pause'));
sensitivity.addEventListener('input', saveSettings);
invertY.addEventListener('change', saveSettings);
volume.addEventListener('input', saveSettings);
music.addEventListener('input', saveSettings);
syncSettings();

function button(label, className, action) {
  const control = document.createElement('button');
  control.className = className;
  control.textContent = label;
  control.addEventListener('click', () => {
    sound.play('click');
    action();
  });
  return control;
}

function summaryCard(title, description) {
  const card = document.createElement('div');
  card.className = 'desk-card';
  const heading = document.createElement('strong');
  heading.textContent = title;
  const copy = document.createElement('p');
  copy.textContent = description;
  card.append(heading, copy);
  return card;
}

function nextAvailableStation() {
  return state.stations.find(station => station.powered && !station.session);
}

function renderReception(body) {
  const overview = document.createElement('div');
  overview.className = 'desk-summary';
  const admission = summaryCard('Müşteri sırası', customers.nextAdmission
    ? `#${customers.nextAdmission} hazır · ${customers.waitingCount} sırada`
    : customers.waitingCount ? 'Müşteri tezgâha ilerliyor.' : 'Bekleyen müşteri yok.');
  const availableStation = nextAvailableStation();
  const approve = button('Müşteriyi onayla', 'primary', () => {
    const station = nextAvailableStation();
    if (!station || !customers.assign(station.id)) return;
    sound.play('click');
    syncHud();
    renderApp();
  });
  approve.disabled = !customers.nextAdmission || !availableStation;
  admission.append(approve);
  if (customers.nextAdmission && !availableStation) {
    const hint = document.createElement('p');
    hint.textContent = 'Açık ve boş bilgisayar gerekiyor.';
    admission.append(hint);
  }
  const payment = summaryCard('Ödemeler', customers.nextPayment
    ? `#${customers.nextPayment} hazır · ${customers.paymentCount} ödeme`
    : customers.paymentCount ? 'Müşteri ödeme noktasına ilerliyor.' : 'Bekleyen ödeme yok.');
  const collect = button(`${customers.sessionPrice} TL tahsil et`, 'primary', () => {
    const collected = customers.collect();
    if (!collected) return;
    sound.play('cash');
    flashCash(collected);
    syncHud();
    renderApp();
  });
  collect.disabled = !customers.nextPayment;
  payment.append(collect);
  const milestone = state.nextCafeMilestone;
  const reward = document.createElement('p');
  reward.textContent = `Kafe primi · ${state.paidVisits}/${milestone.count} tahsilat · +${money.format(milestone.reward)} TL`;
  payment.append(reward);
  overview.append(admission, payment);
  body.append(overview);
}

function appSignature() {
  if (currentApp !== 'management') return '';
  return JSON.stringify([customers.nextAdmission, customers.waitingCount, customers.nextPayment,
    customers.paymentCount, Boolean(nextAvailableStation())]);
}

function renderBills(body, rerender) {
  visibleBillCount = state.bills.length;
  const heading = document.createElement('h3');
  heading.textContent = 'Elektrik faturaları';
  const current = document.createElement('p');
  current.id = 'current-usage';
  current.textContent = `Bu hafta · ${state.weekUsage.toFixed(2)} kWh`;
  body.append(heading, current);
  if (!state.bills.length) {
    body.append(summaryCard('Henüz fatura yok', 'İlk fatura 8. gün başında kesilir.'));
    return;
  }
  for (const bill of state.bills.slice().reverse()) {
    const line = document.createElement('div');
    line.className = 'bill-line';
    const details = document.createElement('div');
    details.textContent = `Hafta ${bill.week} · ${money.format(bill.amount)} TL`;
    const units = document.createElement('small');
    units.textContent = `${bill.usage.toFixed(2)} kWh · ${bill.paid ? 'Ödendi' : 'Ödeme bekliyor'}`;
    details.append(units);
    const pay = button(bill.paid ? 'Ödendi' : 'Öde', 'primary', () => {
      if (!state.payBill(bill)) return;
      sound.play('cash');
      syncHud();
      rerender();
    });
    pay.disabled = bill.paid || state.cash < bill.amount;
    line.append(details, pay);
    body.append(line);
  }
}

function renderArcade(body) {
  const toolbar = document.createElement('div');
  toolbar.className = 'arcade-toolbar';
  for (const [kind,title] of [['pacman','Pac-Man'],['snake','Yılan']]) {
    toolbar.append(button(title, arcadeKind === kind ? 'primary' : 'secondary', () => {
      arcadeKind = kind;
      renderApp();
    }));
  }
  body.append(toolbar);
  if (!arcadeKind) return;
  const game = document.createElement('canvas');
  game.className = 'arcade-screen';
  const score = document.createElement('p');
  score.className = 'arcade-score';
  arcade = createArcade(arcadeKind, game, score);
  toolbar.append(button('Yeniden başlat', 'secondary', () => arcade.reset()));
  body.append(game, score);
}

function renderPhone() {
  const body = select('phone-body');
  body.replaceChildren();
  select('phone-clock').textContent = state.time;
  if (phoneApp === 'bank') {
    shopUi.renderBank(body);
  } else if (phoneApp === 'bills') {
    renderBills(body, renderPhone);
  } else if (phoneApp === 'weather') {
    forecastDay = state.day;
    const forecasts = [['☀','Güneşli',22,15],['⛅','Parçalı bulutlu',19,13],['🌧','Hafif yağmur',16,11],['☁','Bulutlu',18,12]];
    const today = forecasts[(state.day - 1) % forecasts.length];
    const tomorrow = forecasts[state.day % forecasts.length];
    body.append(summaryCard(`${today[0]}  Mahalle · ${state.night ? today[3] : today[2]}°C`,
      `Bugün ${today[1]} · ${today[3]}°–${today[2]}°`),
      summaryCard(`Yarın · ${tomorrow[1]}`, `${tomorrow[3]}°–${tomorrow[2]}° · Oyun içi tahmin`));
  } else {
    body.append(summaryCard('🍲  Ev yemeği', `Pilav ve sebze tabağı · Buzdolabında ${state.food} porsiyon`));
    const order = button(`${foodPrice} TL · Sipariş ver`, 'primary', () => {
      if (!state.buyFood()) return;
      sound.play('delivery');
      syncHud();
      renderPhone();
    });
    order.disabled = state.cash < foodPrice;
    body.append(order);
  }
}
function syncPhoneClock() {
  const time = state.time;
  for (const id of ['phone-clock','phone-lock-clock']) {
    const item = select(id);
    if (item.textContent !== time) item.textContent = time;
  }
  select('phone-trigger').classList.toggle('bank-pending',shop.pending);
  select('phone-bank-alert').hidden = !shop.pending;
  select('phone-lock-alert').hidden = !shop.pending;
  const dayLabel = `${state.day}. gün`;
  if (select('phone-lock-day').textContent !== dayLabel) select('phone-lock-day').textContent = dayLabel;
}
function showPhonePage(page) {
  phonePage = page;
  select('phone-unlock').hidden = page !== 'locked';
  select('phone-home').hidden = page !== 'home';
  select('phone-app-view').hidden = page !== 'app';
  if (page === 'app') renderPhone();
  syncPhoneClock();
}
function openPhone() {
  if (!['play','pause','phone','desk'].includes(mode)) return;
  if (mode === 'phone') {
    if (phoneOrigin === 'desk') {
      setMode('desk');
      renderApp();
    } else if (phoneOrigin === 'pause') setMode('pause');
    else {
      phoneClosing = true;
      requestPlay();
    }
  } else {
    phoneOrigin = mode;
    phoneClosing = false;
    setMode('phone');
    showPhonePage('locked');
    select('phone-unlock').focus();
  }
}
select('phone-trigger').addEventListener('click', openPhone);
select('phone-close').addEventListener('click', openPhone);
select('phone-unlock').addEventListener('click', () => {
  showPhonePage('home');
  select('phone-food').focus();
});
select('phone-app-back').addEventListener('click', () => {
  showPhonePage('home');
  select(`phone-${phoneApp}`).focus();
});
for (const tab of ['food','bills','weather','bank']) select(`phone-${tab}`).addEventListener('click', () => {
  phoneApp = tab;
  showPhonePage('app');
  select('phone-app-back').focus();
});

function updateRemote() {
  select('tv-channel').textContent = state.tvOn ? `CH 0${channel+1} · ${channels[channel]}` : 'TV kapalı';
}
function switchChannel(direction) {
  if (!state.tvOn) return;
  channel = (channel + direction + channels.length) % channels.length;
  tvTime = 0;
  cafe.updateTV(channel,-1);
  sound.play('click');
  updateRemote();
}
function sitOnSofa() {
  seatDestination = 'tv';
  const position = camera.position.clone();
  const seated = new THREE.Vector3(8.55, 1.20, 5.52);
  const view = new THREE.PerspectiveCamera();
  view.position.copy(seated);
  view.lookAt(11.77,1.14,5.52);
  walkPath = [position, new THREE.Vector3(8.93,1.48,5.52), seated];
  beginSeatMotion(walkPath, view.quaternion, 0.56);
  setMode('sitting');
}
select('tv-power').addEventListener('click', () => {
  state.tvOn = !state.tvOn;
  cafe.updateTV(channel,tvTime);
  sound.play('click');
  updateRemote();
});
select('tv-prev').addEventListener('click', () => switchChannel(-1));
select('tv-next').addEventListener('click', () => switchChannel(1));
select('tv-stand').addEventListener('click', () => leaveSeat(true));

function syncPhysicalScreen() {
  let page = { title: 'Masaüstü', rows: ['▤  Yönetim', 'Z  Zamazingo'] };
  if (currentApp === 'shop') {
    page = { title: 'Zamazingo', rows: shop.orders.length
      ? shop.orders.map(order => `#${order.id} · ${catalog[order.kind].name} · ${shippingText(order)}`)
      : ['Masa ve sandalye · 450 TL', 'Bilgisayar seti · 950 TL'] };
  } else if (currentApp === 'management') {
    page = { title: 'Yönetim', rows: [`${customers.waitingCount} sırada · ${customers.paymentCount} ödeme`] };
  }
  if (currentApp === 'arcade') page = { title: 'Oyunlar', rows: ['Pac-Man','Yılan'] };
  if (currentApp === 'bills') page = { title: 'Fatura', rows: state.bills.map(item => `Hafta ${item.week} · ${item.amount} TL · ${item.paid ? 'Ödendi' : 'Bekliyor'}`) };
  cafe.powerOffice(officeOn, officeOn ? page : null);
}

function renderApp() {
  syncPhysicalScreen();
  arcade = null;
  const body = select('app-body');
  body.replaceChildren();
  select('app-window').hidden = !currentApp;
  if (!currentApp) return;
  select('app-title').textContent = { shop:'Zamazingo', arcade:'Oyunlar', bills:'Fatura', management:'Yönetim' }[currentApp];
  if (currentApp === 'shop') shopUi.renderShop(body);
  else if (currentApp === 'arcade') renderArcade(body);
  else if (currentApp === 'bills') renderBills(body, renderApp);
  else renderReception(body);
  panelSignature = appSignature();
}

function updateComputer() {
  select('desktop').hidden = !officeOn;
  select('computer-off').hidden = officeOn;
  select('pc-led').classList.toggle('on', officeOn);
  renderApp();
}

function setOfficePower(on) {
  if (officeOn === on) return;
  sound.unlock();
  officeOn = on;
  state.officePower = officeOn;
  currentApp = null;
  sound.play(officeOn ? 'boot' : 'pcShutdown');
  updateComputer();
  select(officeOn ? 'app-management' : 'pc-power').focus();
}
select('pc-power').addEventListener('click', () => setOfficePower(true));
select('pc-shutdown').addEventListener('click', () => setOfficePower(false));
select('app-management').addEventListener('click', () => {
  currentApp = 'management';
  sound.play('click');
  renderApp();
});
select('app-shop').addEventListener('click', () => {
  currentApp = 'shop';
  sound.play('click');
  renderApp();
});
for (const tab of ['arcade','bills']) select(`app-${tab}`).addEventListener('click', () => {
  currentApp = tab;
  sound.play('click');
  renderApp();
});
select('app-close').addEventListener('click', () => {
  currentApp = null;
  renderApp();
});

function beginSeatMotion(points, rotation, duration) {
  const cumulative = [0];
  for (let i = 1; i < points.length; i++) {
    cumulative.push(cumulative.at(-1) + points[i - 1].distanceTo(points[i]));
  }
  seatMotion = {
    points, cumulative, total: cumulative.at(-1), elapsed: 0, duration,
    from: camera.quaternion.clone(), to: rotation,
  };
}

function sit() {
  seatDestination = 'desk';
  const position = camera.position.clone();
  const y = position.y;
  const seated = new THREE.Vector3(-3.38, 1.22, -4.40);
  const side = position.x < -4.52 ? -4.75 : -1.86;
  walkPath = [position, new THREE.Vector3(side, y, position.z),
    new THREE.Vector3(side, 1.64, -4.42), new THREE.Vector3(seated.x, 1.64, seated.z), seated];
  const view = new THREE.PerspectiveCamera();
  view.position.copy(seated);
  view.lookAt(-2.95, 1.42, -0.20);
  beginSeatMotion(walkPath, view.quaternion, 0.96);
  setMode('sitting');
  sound.play('step');
}

function leaveSeat(lock) {
  if (mode !== 'desk' && mode !== 'tv') return;
  if (mode === 'desk') syncPhysicalScreen();
  const rotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(player.pitch, player.yaw, 0, 'YXZ'));
  beginSeatMotion(walkPath.slice().reverse(), rotation, seatDestination === 'tv' ? 0.56 : 0.96);
  setMode('standing');
  if (lock) requestPlay();
}

function animateSeat(dt) {
  const motion = seatMotion;
  motion.elapsed += dt;
  const t = Math.min(1, motion.elapsed / motion.duration);
  const progress = t * t * (3 - 2 * t);
  const distance = motion.total * progress;
  const index = motion.cumulative.findIndex((value, i) => i > 0 && value >= distance);
  const end = index === -1 ? motion.points.length - 1 : index;
  const length = motion.cumulative[end] - motion.cumulative[end - 1];
  camera.position.lerpVectors(motion.points[end - 1], motion.points[end],
    length ? (distance - motion.cumulative[end - 1]) / length : 1);
  camera.quaternion.copy(motion.from).slerp(motion.to, progress);
  if (t < 1) return;
  if (mode === 'sitting') {
    sound.play('place');
    setMode(seatDestination);
    if (seatDestination === 'desk') {
      updateComputer();
      select(officeOn ? 'app-management' : 'pc-power').focus();
    } else {
      updateRemote();
      select('tv-power').focus();
    }
  } else {
    if (pendingLock) return;
    player.syncCamera();
    setMode(document.pointerLockElement === canvas() ? 'play' : 'pause');
  }
}

function flashCash(amount) {
  cashGoal = state.cash;
  cashTimer = 1.15;
  const card = select('cash-card');
  const gain = select('cash-gain');
  gain.hidden = true;
  card.classList.remove('cash-glow');
  void card.offsetWidth;
  gain.textContent = `+${money.format(amount)} TL`;
  gain.hidden = false;
  card.classList.add('cash-glow');
}

function flashEnergy(previousEnergy, showAtFull = false) {
  const gained = Math.round(state.energy) - Math.round(previousEnergy);
  if (gained === 0 && !showAtFull) return;
  energyGainTimer = 1.15;
  energyGain.hidden = true;
  void energyGain.offsetWidth;
  energyGain.textContent = gained > 0 ? `+${gained} enerji` : 'Enerji dolu';
  energyGain.hidden = false;
}

function enterOrLeaveHome() {
  home = !home;
  player.stop();
  player.feet.set(11.13, 0, home ? 7.36 : 9.0);
  player.verticalSpeed = 0;
  player.pitch = -0.03;
  player.yaw = home ? -0.24 : Math.PI;
  camera.rotation.set(player.pitch, player.yaw, 0, 'YXZ');
  player.syncCamera();
  sound.play('apartmentDoor');
}

function interact() {
  target = cafe.findTarget(camera);
  const kind = shop.carried?.kind;
  if (movingFurniture) {
    const candidate = cafe.previewDesk(camera,player,deskAngle,movingFurniture.kind,movingFurniture);
    if (!cafe.moveFurniture(movingFurniture,candidate,player)) return;
    movingFurniture = null;
    cafe.previewDesk(null);
    sound.play('place');
    renderer.shadowMap.needsUpdate = true;
    return;
  }
  if ((kind === 'desk' || decor[kind]) && target?.type !== 'pickup') {
    const floorSpot = cafe.previewDesk(camera, player, deskAngle, kind);
    const installed = kind === 'desk' ? shop.installDesk(floorSpot, player) : shop.installDecor(floorSpot, player);
    if (!installed) return;
    cafe.previewDesk(null);
    sound.play('place');
    renderer.shadowMap.needsUpdate = true;
    syncHud();
    return;
  }
  if (!target) return;
  switch (target.type) {
    case 'owned-car':
      drivingController.enter(target);
      return;
    case 'business':
      state.open = !state.open;
      cafe.syncBusiness();
      sound.play(state.open ? 'shopOpen' : 'click');
      shopOpenTimer = state.open ? 1.8 : 0;
      shopOpenNote.hidden = !state.open;
      return;
    case 'home-door':
      enterOrLeaveHome();
      return;
    case 'fridge':
      sound.play(target.activate() ? 'fridgeOpen' : 'doorClose');
      return;
    case 'food': {
      const previousEnergy = state.energy;
      if (!state.eat()) return;
      flashEnergy(previousEnergy);
      sound.play('place');
      return;
    }
    case 'home-light':
      state.homeLights = !state.homeLights;
      sound.play('click');
      return;
    case 'sofa':
      sitOnSofa();
      return;
    case 'coffee-machine':
      if (target.remaining > 0) return;
      if (shop.carried || coffee || batEquipped) return;
      if (target.ready) {
        target.take();
        coffee = true;
        sound.play('place');
      } else {
        target.start();
        sound.play('brew');
      }
      return;
    case 'coffee-table':
      if (target.full && !coffee && !shop.carried && !batEquipped) {
        coffee = true;
        cafe.setCoffee(target.key, false);
      } else if (coffee && !target.full) {
        coffee = false;
        cafe.setCoffee(target.key, true);
      } else return;
      sound.play('place');
      return;
    case 'bed':
      if (!state.canSleep) return;
      if (state.open) return;
      if (state.stations.some(station => station.session) || customers.paymentCount) return;
      if (!state.sleep()) return;
      shop.update(60);
      const fade = select('sleep-fade');
      fade.classList.remove('sleeping');
      void fade.offsetWidth;
      fade.classList.add('sleeping');
      sound.play('boot');
      return;
    case 'door': {
      target.activate(player);
      return;
    }
    case 'office':
      sit();
      return;
    case 'pickup': {
      if (shop.carried) {
        shop.returnPackage();
        sound.play('place');
        syncHud();
        return;
      }
      if (coffee || batEquipped) return;
      const item = shop.collect();
      if (item) sound.play('place');
      syncHud();
      return;
    }
    case 'build':
      if (!shop.installPC(target.slot)) return;
      sound.play('place');
      renderer.shadowMap.needsUpdate = true;
      syncHud();
      return;
    case 'station': {
      const station = target.station;
      customers.setPower(station, !station.powered);
      sound.play(station.powered ? 'boot' : 'pcShutdown');
      return;
    }
    case 'bat-rack':
      if (shop.carried || coffee) return;
      batEquipped = !batEquipped;
      bat.visible = batEquipped;
      target.setEquipped(batEquipped);
      renderer.shadowMap.needsUpdate = true;
      sound.play('place');
      return;
  }
}

canvas().addEventListener('mousedown', event => {
  if (event.button !== 0 || mode !== 'play' || !batEquipped || shop.carried || coffee || strikeTime > 0) return;
  strikeTime = 0.38;
  sound.play('swing');
  const object = cafe.strikeTarget(camera);
  if (object && customers.eject(object)) {
    sound.play('hit');
  }
});

window.addEventListener('keydown', event => {
  if (event.code === 'Escape' && !event.repeat) {
    if (mode === 'desk') leaveSeat(false);
    else if (mode === 'tv') leaveSeat(false);
    else if (mode === 'phone') { phoneClosing = false; if (phoneOrigin === 'desk') openPhone(); else setMode('pause'); }
    else if (mode === 'settings' || mode === 'play' || mode === 'driving') setMode('pause');
    return;
  }
  if (mode === 'driving') {
    if (driveKeys.has(event.code)) {
      event.preventDefault();
      player.keys.add(event.code);
    } else if (event.code === 'KeyE' && !event.repeat) {
      event.preventDefault();
      drivingController.leave();
    }
    return;
  }
  if (event.code === 'KeyP' && !event.repeat && ['play','pause','phone','desk'].includes(mode)) {
    openPhone();
    return;
  }
  if ((mode === 'desk' || mode === 'tv') && event.code === 'KeyE' && !event.repeat) {
    event.preventDefault();
    leaveSeat(true);
    return;
  }
  if (mode === 'desk' && arcade?.key(event.code)) { event.preventDefault(); return; }
  if (mode === 'tv' && ['ArrowLeft','ArrowRight'].includes(event.code)) {
    event.preventDefault();
    switchChannel(event.code === 'ArrowLeft' ? -1 : 1);
    return;
  }
  if (mode !== 'play') return;
  if (movementKeys.has(event.code) || event.code === 'KeyE') event.preventDefault();
  if (movementKeys.has(event.code)) player.keys.add(event.code);
  if (event.repeat) return;
  if (event.code === 'KeyE') interact();
  if (event.code === 'KeyC' && coffee) {
    coffee = false;
    const previousEnergy = state.energy;
    state.drinkCoffee();
    flashEnergy(previousEnergy, true);
    sound.play('sip');
  }
  if (event.code === 'KeyG') {
    if (movingFurniture) {
      movingFurniture = null;
      cafe.previewDesk(null);
    } else if (!shop.carried && !coffee) {
      const item = cafe.findTarget(camera)?.furniture;
      if (!item) return;
      if (state.stations.find(station => station.id === item.slot.id)?.session) return;
      movingFurniture = item;
      deskAngle = item.slot.angle;
    }
  }
  if (event.code === 'KeyR' && (movingFurniture || (shop.carried && shop.carried.kind !== 'pc'))) deskAngle = (deskAngle + Math.PI / 2) % (Math.PI * 2);
  if (event.code === 'Space') player.jump();
});
window.addEventListener('keyup', event => player.keys.delete(event.code));
window.addEventListener('resize', resize);
let voicedWords = 0;
function soundWords(finalWord = false) {
  const words = cafeNameInput.value.match(finalWord ? /\S+/g : /\S+(?=\s)/g)?.length ?? 0;
  for (let i = voicedWords; i < words; i++) sound.play('key', (i - voicedWords) * 0.065);
  voicedWords = words;
}
cafeNameInput.addEventListener('keydown', () => sound.unlock(), { once: true });
cafeNameInput.addEventListener('pointerdown', () => sound.unlock(), { once: true });
cafeNameInput.addEventListener('input', event => {
  if (!event.isComposing) soundWords();
  nameError.hidden = true;
});
cafeNameInput.addEventListener('compositionend', () => soundWords());
nameForm.addEventListener('submit', event => {
  event.preventDefault();
  if (mode !== 'naming') return;
  if (!cafeNameInput.value.trim()) {
    nameError.textContent = 'Kafene bir isim yaz.';
    nameError.hidden = false;
    cafeNameInput.focus();
    return;
  }
  soundWords(true);
  requestPlay();
});
select('resume').addEventListener('click', requestPlay);

function updateHudAndDesk(dt) {
  if (shopOpenTimer > 0) {
    shopOpenTimer = Math.max(0, shopOpenTimer - dt);
    if (shopOpenTimer === 0) shopOpenNote.hidden = true;
  }
  if (energyGainTimer > 0) {
    energyGainTimer = Math.max(0, energyGainTimer - dt);
    if (energyGainTimer === 0) energyGain.hidden = true;
  }
  if (cashTimer > 0) {
    cashTimer = Math.max(0, cashTimer - dt);
    shownCash += (cashGoal - shownCash) * (1 - Math.exp(-7 * dt));
    if (cashTimer === 0) {
      shownCash = state.cash;
      select('cash-gain').hidden = true;
    }
  }
  syncHud();
  packageMesh.visible = mode === 'play' && Boolean(shop.carried);
  carriedCoffee.visible = mode === 'play' && coffee;
  bat.visible = mode === 'play' && batEquipped && !shop.carried && !coffee;
  for (const [id, name, value] of [['hunger', 'Tokluk', state.hunger], ['energy', 'Enerji', state.energy]]) {
    const item = select(id);
    const label = `${name} %${Math.round(value)}`;
    if (item.textContent !== label) item.textContent = label;
    item.classList.toggle('low', value < 35);
  }
  if (lightingNight !== state.night) {
    lightingNight = state.night;
    scene.background.set(state.night ? 0x23364d : 0xc4d6e9);
    scene.fog.color.copy(scene.background);
    cafe.setNight(state.night);
  }
  const time = state.time;
  if (clock.textContent !== time) {
    clock.textContent = time;
    day.textContent = String(state.day).padStart(2, '0');
  }
  const showingBills = (mode === 'phone' && phonePage === 'app' && phoneApp === 'bills') ||
    (mode === 'desk' && officeOn && currentApp === 'bills');
  if (showingBills) {
    if (visibleBillCount !== state.bills.length) {
      if (mode === 'phone') renderPhone();
      else renderApp();
    } else {
      const usage = select('current-usage');
      const label = `Bu hafta · ${state.weekUsage.toFixed(2)} kWh`;
      if (usage && usage.textContent !== label) usage.textContent = label;
    }
  }
  if (mode === 'phone' && phonePage === 'app' && phoneApp === 'weather' && forecastDay !== state.day) renderPhone();
  if (mode !== 'desk' || !officeOn) {
    if (officeOn && currentApp === 'shop' && Math.floor(state.minute) % 2 === 0 && physicalMinute !== state.minute) {
      physicalMinute = state.minute;
      syncPhysicalScreen();
    }
    return;
  }
  select('os-clock').textContent = time;
  if (currentApp === 'management' && appSignature() !== panelSignature) renderApp();
  if (currentApp === 'shop') {
    for (const order of shop.orders) {
      const node = select(`shipping-${order.id}`);
      if (node) {
        const text = shippingText(order);
        if (node.textContent !== text) node.textContent = text;
      }
    }
  }
}

function frame(timestamp) {
  requestAnimationFrame(frame);
  const dt = lastTime === null ? 0 : Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;
  if (mode === 'sitting' || mode === 'standing') animateSeat(dt);
  if (!['play','driving','desk','tv','phone','sitting','standing'].includes(mode)) return;
  if (mode === 'desk') arcade?.update(dt);
  if (state.tvOn) tvTime += dt;
  cafe.updateTV(channel,tvTime);
  if (mode === 'phone') syncPhoneClock();
  else select('phone-trigger').classList.toggle('bank-pending',shop.pending);
  sound.updateMusic(true);
  if (mode === 'driving') drivingController.update(dt);
  if (mode === 'play') {
    player.energyFactor = 0.65 + state.energy * 0.0035;
    updateActionHint({ coffee, movingFurniture, packageKind: shop.carried?.kind });
    player.update(dt);
    const kind = movingFurniture?.kind ?? shop.carried?.kind;
    candidate = cafe.previewDesk(kind === 'desk' || decor[kind] ? camera : null, player, deskAngle, kind, movingFurniture);
    if (player.verticalSpeed === 0 && player.stride - lastStride > 3.9) {
      lastStride = player.stride;
      sound.play('step');
    }
    strikeTime = Math.max(0, strikeTime - dt);
    const swing = Math.sin(Math.PI * strikeTime / 0.38);
    bat.position.set(0.37 - swing * 0.23, -0.32 + swing * 0.11, -0.57);
    bat.rotation.set(-0.47 - swing * 0.64, 0, -0.37 + swing * 1.15);
  }
  const activePlayer = (['desk','tv','sitting','standing'].includes(mode) || (mode === 'phone' && phoneOrigin === 'desk')) ? { feet: camera.position } : player;
  customers.update(dt, activePlayer);
  shop.update(dt, activePlayer);
  if (cafe.update(dt, activePlayer)) {
    renderer.shadowMap.needsUpdate = true;
    if (cafe.door.opening !== lastDoorDirection) {
      lastDoorDirection = cafe.door.opening;
      const x = activePlayer.feet.x + 3.72;
      const z = activePlayer.feet.z - 5.43;
      if (Math.hypot(x,z) < 8) sound.play(lastDoorDirection ? 'doorOpen' : 'doorClose');
    }
  }
  state.advance(dt);
  updateHudAndDesk(dt);
  saveElapsed += dt;
  if (saveElapsed >= 2) {
    saveElapsed = 0;
    saveProgress();
  }
  if (mode === 'play') {
    targetCountdown -= dt;
    if (targetCountdown <= 0) {
      targetCountdown = 0.065;
      target = cafe.findTarget(camera);
      const label = target?.type === 'pickup' && shop.carried ? 'Paketi rafa geri bırak'
        : movingFurniture ? 'Yerleştir · R döndür · G iptal'
        : shop.carried && candidate ? 'Yerleştir · R döndür'
        : target?.furniture ? `${target.label?.() ?? catalog[target.furniture.kind].name} · G taşı`
        : target?.label() ?? '';
      if (label !== previousLabel) {
        prompt.querySelector('span').textContent = label;
        prompt.hidden = !label;
        aim.classList.toggle('target', !!label);
        previousLabel = label;
      }
    }
  }
  renderer.render(scene, camera);
}

function syncHud() {
  if (cashTimer === 0) shownCash = state.cash;
  const value = Math.round(shownCash);
  if (displayedCash !== value) {
    displayedCash = value;
    cash.textContent = `${money.format(value)} TL`;
  }
  const objective = select('car-goal');
  const car = shop.carOrder;
  const goal = car?.phase === 'parked' ? '🚘 Araba hedefi tamamlandı' : car
    ? '🚘 Araba teslimatı yolda' : `🚘 ${money.format(Math.min(state.cash,carPrice))} / ${money.format(carPrice)} TL`;
  if (objective.textContent !== goal) objective.textContent = goal;
  const progress = select('car-progress');
  const saved = car ? carPrice : Math.max(0, Math.min(state.cash,carPrice));
  if (progress.value !== saved) progress.value = saved;
  const summary = [];
  if (customers.waitingCount) summary.push(`${customers.waitingCount} sırada`);
  if (customers.activeCount) summary.push(`${customers.activeCount} seansta`);
  if (customers.paymentCount) summary.push(`${customers.paymentCount} ödeme`);
  if (customers.misconductCount) summary.push(`${customers.misconductCount} kural ihlali`);
  if (shop.carried) summary.push(`Paket: ${catalog[shop.carried.kind].name}`);
  const activity = summary.join(' · ') || (state.open ? 'Kafe açık' : 'Kapalı · Kapı tabelasına bak');
  if (customerStatus.textContent !== activity) customerStatus.textContent = activity;
}

window.addEventListener('pagehide', saveProgress);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') saveProgress();
});
if (savedProgress) restoreProgress(savedProgress);
else cafeNameInput.focus();
syncHud();
resize();
requestAnimationFrame(frame);
