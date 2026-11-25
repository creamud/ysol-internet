const progressKey = 'ysol-internet-progress-v1';
const settingsKey = 'ysol-internet-controls-v1';
const progressVersion = 1;

function read(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}

function write(key, snapshot) {
  try {
    localStorage.setItem(key, JSON.stringify(snapshot()));
  } catch {
    // The game and its settings still work if browser storage is unavailable.
  }
}

export function readProgress() {
  const save = read(progressKey);
  if (save?.version !== progressVersion || !Number.isFinite(save.state?.absoluteTime) ||
      typeof save.state.cafeName !== 'string' || !Array.isArray(save.state.stations) ||
      !Array.isArray(save.state.bills) || !isVector(save.player?.feet) ||
      !Number.isFinite(save.player.yaw) || !Number.isFinite(save.player.pitch) ||
      !Number.isInteger(save.television?.channel) || !Number.isFinite(save.television.tvTime)) return null;
  const { shop, scene, customers, walkthrough } = save;
  if (!hasLists(shop, ['slots', 'decorations', 'orders', 'basket']) ||
      !shop.basket.every(entry => Array.isArray(entry) && entry.length === 2) ||
      !hasLists(scene, ['tables', 'coffeeMachines']) ||
      !hasLists(customers, ['customers', 'admission', 'payments', 'doorway']) ||
      !customers.customers.every(visitor => isVector(visitor?.position)) ||
      !['admission', 'payments', 'doorway'].every(queue => customers[queue].every(index =>
        Number.isInteger(index) && index >= 0 && index < customers.customers.length)) ||
      (walkthrough != null && (!Number.isInteger(walkthrough) || walkthrough < 0 || walkthrough > 3))) return null;
  return save;
}

function hasLists(value, keys) {
  return keys.every(key => Array.isArray(value?.[key]));
}

function isVector(value) {
  return Array.isArray(value) && value.length === 3 && value.every(Number.isFinite);
}

export function writeProgress(snapshot) {
  write(progressKey, () => ({ ...snapshot(), version: progressVersion }));
}

export function readSettings() {
  return read(settingsKey);
}

export function writeSettings(settings) {
  write(settingsKey, () => settings);
}
