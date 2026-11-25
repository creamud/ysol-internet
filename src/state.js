const initialMinutes = 9 * 60;
const minutesPerDay = 24 * 60;
const minutesPerWeek = 7 * minutesPerDay;
export const clockRate = 0.85;
export const foodPrice = 75;
const cafeMilestones = [[5,4500],[12,8500],[22,13000],[35,19000]];
function milestoneFor(visits) {
  return cafeMilestones.find(([count]) => count > visits) ??
    [35 + (Math.floor((visits - 35) / 10) + 1) * 10, 3500];
}

export function createCafeState() {
  const stations = Array.from({ length: 5 }, (_, index) => ({
    id: index + 1,
    name: `Bilgisayar ${String(index + 1).padStart(2, '0')}`,
    powered: index < 2,
    session: null,
  }));
  let absoluteTime = initialMinutes;
  function advanceClock(state, minutes) {
    const end = absoluteTime + minutes;
    const power = (state.homeLights ? 0.16 : 0) + (state.tvOn ? 0.11 : 0) +
      (state.open ? 0.31 : 0) + (state.officePower ? 0.18 : 0) +
      state.stations.filter(station => station.powered).length * 0.095;
    while (absoluteTime < end) {
      const week = Math.floor(absoluteTime / minutesPerWeek) + 1;
      const boundary = week * minutesPerWeek;
      const next = Math.min(end, boundary);
      state.weekUsage += power * (next - absoluteTime) / 60;
      absoluteTime = next;
      if (absoluteTime >= boundary) {
        state.bills.push({ week, usage: state.weekUsage, amount: Math.round(40 + state.weekUsage * 5), paid: false });
        state.weekUsage = 0;
      }
    }
  }
  const savedFields = ['cafeName', 'cash', 'paidVisits', 'lastCafeBonus', 'open', 'hunger',
    'energy', 'food', 'homeLights', 'tvOn', 'officePower', 'weekUsage', 'bills'];
  return {
    snapshot() {
      return { absoluteTime, ...Object.fromEntries(savedFields.map(key => [key, this[key]])), stations };
    },
    restore(save) {
      absoluteTime = save.absoluteTime;
      for (const key of savedFields) this[key] = save[key];
      for (const saved of save.stations) {
        const station = stations.find(item => item.id === saved.id);
        if (station) Object.assign(station, saved);
      }
    },
    cafeName: 'Benim Kafem',
    cash: 5000,
    paidVisits: 0,
    lastCafeBonus: 0,
    open: false,
    hunger: 100,
    energy: 100,
    food: 3,
    homeLights: true,
    tvOn: false,
    officePower: false,
    weekUsage: 0,
    bills: [],
    stations,
    advance(seconds) {
      advanceClock(this, seconds * clockRate);
      this.hunger = Math.max(0, this.hunger - seconds * 0.17);
      this.energy = Math.max(10, this.energy - seconds * (this.hunger < 35 ? 0.48 : 0.075));
    },
    recordPayment(fee) {
      const [count, reward] = milestoneFor(this.paidVisits);
      this.paidVisits++;
      this.lastCafeBonus = this.paidVisits === count ? reward : 0;
      const total = fee + this.lastCafeBonus;
      this.cash += total;
      return total;
    },
    get nextCafeMilestone() {
      const [count, reward] = milestoneFor(this.paidVisits);
      return { count, reward };
    },
    eat() {
      if (!this.food || this.hunger >= 100) return false;
      this.food--;
      this.hunger = Math.min(100, this.hunger + 48);
      this.energy = Math.min(100, this.energy + 18);
      return true;
    },
    buyFood() {
      if (this.cash < foodPrice) return false;
      this.cash -= foodPrice;
      this.food++;
      return true;
    },
    drinkCoffee() {
      this.energy = Math.min(100, this.energy + 23);
    },
    payBill(bill) {
      if (!this.bills.includes(bill) || bill.paid || this.cash < bill.amount) return false;
      this.cash -= bill.amount;
      bill.paid = true;
      return true;
    },
    sleep() {
      if (!this.canSleep) return false;
      const wake = (this.day - 1 + Number(this.hour >= 21)) * minutesPerDay + 8 * 60;
      advanceClock(this, wake - absoluteTime);
      this.hunger = Math.max(15, this.hunger - 20);
      this.energy = 100;
      return true;
    },
    get day() { return 1 + Math.floor(absoluteTime / minutesPerDay); },
    get minute() { return Math.floor(absoluteTime) % minutesPerDay; },
    get hour() { return Math.floor(this.minute / 60); },
    get night() { return this.hour >= 20 || this.hour < 6; },
    get canSleep() { return this.hour >= 21 || this.hour < 6; },
    get time() {
      return [this.hour, this.minute % 60].map(value => String(value).padStart(2, '0')).join(':');
    },
  };
}
