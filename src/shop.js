export const carPrice = 50000;
export const decor = {
  plant: { width: 0.59, depth: 0.59, height: 1.30 },
  rug: { width: 1.65, depth: 1.03, height: 0.023 },
  lamp: { width: 0.48, depth: 0.48, height: 1.63 },
};
export const catalog = {
  desk: { name: 'Masa ve sandalye', icon: '🪑', price: 450, duration: 24, description: 'Bir yeni istasyonun çalışma alanı.' },
  pc: { name: 'Bilgisayar seti', icon: '🖥️', price: 950, duration: 36, description: 'Kasa, monitör, klavye ve fare. Yerleştirmek için masa gerekir.' },
  plant: { name: 'Salon bitkisi', icon: '🪴', price: 380, duration: 19, description: 'Seramik saksıda geniş yapraklı bitki.' },
  rug: { name: 'Gece mavisi halı', icon: '🔷', price: 550, duration: 23, description: 'Çizgili, ince dokuma halı.' },
  lamp: { name: 'Sıcak ışıklı lambader', icon: '💡', price: 760, duration: 28, description: 'Keten başlıklı ayaklı lamba.' },
  car: { name: 'YSOL GT · Otomobil', icon: '🚘', price: carPrice, duration: 75, description: 'Ana hedef. Teslimat kafenin önündeki park yerine yapılır.' },
};

export function createShop(state, cafe, onDelivery) {
  const slots = [];
  const decorations = [];
  const orders = [];
  let carried = null;
  const basket = new Map();
  let linked = false;
  let pending = false;
  const total = () => [...basket].reduce((sum, [kind, quantity]) => sum + catalog[kind].price * quantity, 0);

  function carOrder() {
    return orders.find(order => order.kind === 'car') ?? null;
  }
  function canAdd(kind) {
    return Boolean(Object.hasOwn(catalog, kind) && (kind !== 'car' || (!carOrder() && !basket.has(kind))));
  }

  return {
    snapshot() {
      return { slots, decorations, orders, basket: [...basket], linked, pending };
    },
    restore(save) {
      slots.push(...save.slots);
      decorations.push(...save.decorations);
      orders.push(...save.orders);
      for (const [kind, quantity] of save.basket) basket.set(kind, quantity);
      carried = orders.find(order => order.phase === 'carried') ?? null;
      linked = save.linked;
      pending = save.pending;
      for (const slot of slots) {
        cafe.installFurniture('desk', slot);
        if (slot.pc) {
          const station = { id: slot.id, name: `Bilgisayar ${slot.id}`, powered: true, session: null };
          state.stations.push(station);
          cafe.buildStation(station, slot);
        }
      }
      for (const { kind, slot } of decorations) cafe.installFurniture(kind, slot);
      if (carOrder()?.phase === 'parked') cafe.deliverCar();
      cafe.showPackages(Boolean(this.nextPackage));
    },
    orders,
    get carOrder() { return carOrder(); },
    get carried() { return carried; },
    get nextPackage() {
      const pending = orders.filter(order => order.phase === 'delivered');
      if (slots.some(slot => slot.desk && !slot.pc)) return pending[0];
      return pending.find(order => order.kind === 'desk') ?? pending[0];
    },
    get basket() { return [...basket]; },
    get total() { return total(); },
    get linked() { return linked; },
    get pending() { return pending; },
    canAdd,
    add(kind) {
      if (!canAdd(kind)) return false;
      basket.set(kind, (basket.get(kind) ?? 0) + 1);
      return true;
    },
    remove(kind) {
      const quantity = basket.get(kind);
      if (quantity > 1) basket.set(kind, quantity - 1);
      else basket.delete(kind);
    },
    requestLink() {
      if (linked || pending) return false;
      pending = true;
      return true;
    },
    approveLink() {
      if (!pending) return false;
      linked = true;
      pending = false;
      return true;
    },
    linkFromBank() {
      linked = true;
      pending = false;
    },
    unlink() {
      linked = false;
      pending = false;
    },
    checkout() {
      const amount = total();
      if (!linked || !basket.size || state.cash < amount) return false;
      for (const [kind, quantity] of basket) {
        if (kind === 'car' && carOrder()) return false;
        if (!Number.isSafeInteger(quantity) || quantity < 1) return false;
      }
      for (const [kind, quantity] of basket) {
        for (let i = 0; i < quantity; i++) {
          orders.push({ id: orders.length + 1, kind, left: catalog[kind].duration, phase: 'preparing' });
        }
      }
      state.cash -= amount;
      basket.clear();
      return true;
    },
    collect() {
      const order = this.nextPackage;
      if (carried || !order) return null;
      order.phase = 'carried';
      carried = order;
      return catalog[order.kind].name;
    },
    returnPackage() {
      if (!carried) return;
      carried.phase = 'delivered';
      carried = null;
    },
    installDesk(candidate, player) {
      if (carried?.kind !== 'desk' || !candidate || !cafe.placementValid(candidate, player, true)) return false;
      const slot = { ...candidate, id: slots.length + 6, desk: true, pc: false };
      cafe.installFurniture('desk', slot);
      slots.push(slot);
      carried.phase = 'installed';
      carried = null;
      return true;
    },
    installPC(slot) {
      if (carried?.kind !== 'pc' || !slots.includes(slot) || slot.pc) return false;
      const station = { id: slot.id, name: `Bilgisayar ${String(slot.id).padStart(2, '0')}`, powered: true, session: null };
      cafe.buildStation(station, slot);
      state.stations.push(station);
      state.stations.sort((a, b) => a.id - b.id);
      slot.pc = true;
      carried.phase = 'installed';
      carried = null;
      return true;
    },
    installDecor(candidate, player) {
      if (!carried || !decor[carried.kind] || !candidate ||
          !cafe.placementValid(candidate, player, true, carried.kind)) return false;
      cafe.installFurniture(carried.kind, candidate);
      decorations.push({ kind: carried.kind, slot: candidate });
      carried.phase = 'installed';
      carried = null;
      return true;
    },
    update(dt, player) {
      for (const order of orders) {
        if (order.left === 0) continue;
        order.left = Math.max(0, order.left - dt);
        if (order.left === 0) {
          if (order.kind === 'car') {
            if (!cafe.deliverCar(player)) {
              order.left = 0.25;
              continue;
            }
            order.phase = 'parked';
          } else {
            order.phase = 'delivered';
          }
          onDelivery(order);
        } else if (order.left < catalog[order.kind].duration * 0.75) {
          order.phase = 'transit';
        }
      }
      cafe.showPackages(Boolean(this.nextPackage));
    },
  };
}
