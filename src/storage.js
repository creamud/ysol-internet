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
      !save.shop || !save.scene || !save.customers || !Array.isArray(save.player?.feet)) return null;
  return save;
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
