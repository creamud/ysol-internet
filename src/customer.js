const walkSpeed = 1.55;
const runSpeed = 3.55;
const sessionSeconds = 30;
const sessionPrice = 30;
const maxVisitors = 4;
const street = [-10.8, 7.55];
const pavement = [-3.72, 7.55];
const doorstep = [-3.72, 6.39];
const threshold = [-3.72, 5.87];
const inside = [-3.72, 3.55];
const exitRoute = [[-1.72, 2.75], inside];
const admissionApproach = [[-4.23, 3.4], [-4.23, 1.1], [-3.34, 1.1]];

const admissionSpot = index => [-3.34, -2.21 + index * 0.78];
const paymentSpot = index => [-1.72 + index * 0.81, -2.69];

export function createCustomerLoop(state, cafe) {
  const admission = [];
  const payments = [];
  const doorQueue = [];
  const customers = Array.from({ length: maxVisitors }, (_, index) => {
    const actor = cafe.createVisitor(index);
    actor.setVisible(false);
    return { actor, phase: 'idle', route: [], stride: 0, pose: 0 };
  });
  let nextArrival = 5;
  let nextId = 1;

  function setRoute(customer, phase, route) {
    customer.phase = phase;
    customer.layoutRevision = cafe.layoutRevision;
    let point = [customer.actor.position.x, customer.actor.position.z];
    customer.route = route.flatMap(next => {
      const leg = cafe.path(point, next) ?? [next];
      point = next;
      return leg;
    });
  }

  function nearPlayer(player, x, z) {
    return player.feet.y < 1.65 && Math.hypot(x - player.feet.x, z - player.feet.z) < 0.48;
  }

  function face(customer, angle, dt) {
    const delta = angle - customer.actor.rotation;
    const error = Math.atan2(Math.sin(delta), Math.cos(delta));
    const limit = dt * 7;
    const turn = Math.max(-limit, Math.min(error, limit));
    customer.actor.rotation += turn;
    return error - turn;
  }

  function move(customer, point, dt, player) {
    const position = customer.actor.position;
    const dx = point[0] - position.x;
    const dz = point[1] - position.z;
    const distance = Math.hypot(dx, dz);
    if (distance < 0.005) {
      position.set(point[0], 0, point[1]);
      return { arrived: true, walking: false };
    }
    const turn = Math.abs(face(customer, Math.atan2(dx, dz), dt));
    if (turn > Math.PI / 6) return { arrived: false, walking: false };
    const speed = (customer.ejected ? runSpeed : walkSpeed) * Math.cos(turn);
    const step = Math.min(distance, speed * dt);
    const x = position.x + dx * step / distance;
    const z = position.z + dz * step / distance;
    if (nearPlayer(player, x, z)) return { arrived: false, walking: false };
    position.set(x, 0, z);
    customer.stride += step * 8.5;
    return { arrived: step >= distance, walking: step > 0 };
  }

  function useDoor(customer, phase) {
    customer.phase = phase;
    doorQueue.push(customer);
  }

  function releaseDoor() {
    doorQueue.shift();
    cafe.door.hold(false);
  }

  function advanceRoute(customer) {
    switch (customer.phase) {
      case 'arrival':
        useDoor(customer, 'entrance');
        break;
      case 'entering':
        releaseDoor();
        setRoute(customer, 'to-line', admissionApproach);
        break;
      case 'to-line':
        customer.phase = 'admission';
        if (state.open) admission.push(customer);
        else setRoute(customer, 'to-exit', exitRoute.slice());
        break;
      case 'to-seat':
        customer.phase = 'sitting';
        break;
      case 'to-payment':
        customer.phase = 'payment';
        payments.push(customer);
        break;
      case 'to-exit':
        useDoor(customer, 'exit-door');
        break;
      case 'exiting':
        releaseDoor();
        setRoute(customer, 'leaving', [pavement, street]);
        break;
      case 'leaving':
        customer.phase = 'idle';
        customer.actor.setVisible(false);
        break;
    }
  }

  function updateLine(customer, line, spot, dt, player) {
    const index = line.indexOf(customer);
    const destination = spot(index);
    const predecessor = line[index - 1];
    const position = customer.actor.position;
    if (predecessor) {
      const ahead = predecessor.actor.position;
      const aheadSpot = spot(index - 1);
      if (Math.hypot(ahead.x - aheadSpot[0], ahead.z - aheadSpot[1]) > 0.28 &&
          Math.hypot(position.x - ahead.x, position.z - ahead.z) < 0.69) {
        customer.ready = false;
        return false;
      }
    }
    const movement = move(customer, destination, dt, player);
    customer.ready = movement.arrived;
    if (customer.ready) face(customer, line === admission ? Math.PI : -Math.PI / 2, dt);
    return movement.walking;
  }

  function updateCustomer(customer, dt, player) {
    const position = customer.actor.position;
    let walking = false;
    if (customer.route.length) {
      if (customer.layoutRevision !== cafe.layoutRevision && customer.phase.startsWith('to-')) {
        setRoute(customer, customer.phase, [customer.route.at(-1)]);
      }
      const movement = move(customer, customer.route[0], dt, player);
      walking = movement.walking;
      if (movement.arrived) {
        customer.route.shift();
        if (!customer.route.length) advanceRoute(customer);
      }
    } else {
      switch (customer.phase) {
        case 'entrance':
        case 'exit-door':
          if (doorQueue[0] === customer) {
            cafe.door.hold(true);
            if (cafe.door.passable) {
              const entering = customer.phase === 'entrance';
              setRoute(customer, entering ? 'entering' : 'exiting', entering ? [threshold, inside] : [threshold, doorstep]);
            }
          }
          break;
        case 'admission':
          walking = updateLine(customer, admission, admissionSpot, dt, player);
          break;
        case 'payment':
          walking = updateLine(customer, payments, paymentSpot, dt, player);
          break;
        case 'sitting':
        case 'standing': {
          const sitting = customer.phase === 'sitting';
          const seat = customer.seat;
          const pose = Math.max(0, Math.min(1, customer.pose + dt / (customer.ejected ? 0.25 : 0.56) * (sitting ? 1 : -1)));
          const x = seat.approach[0] + (seat.x - seat.approach[0]) * pose;
          const z = seat.approach[1] + (seat.z - seat.approach[1]) * pose;
          face(customer, seat.yaw, dt);
          if (nearPlayer(player, x, z)) break;
          customer.pose = pose;
          position.set(x, 0, z);
          if (sitting && pose === 1) {
            customer.station.session.status = 'Kullanımda';
            customer.phase = 'playing';
            cafe.syncStation(customer.station);
          } else if (!sitting && pose === 0) {
            customer.station.session = null;
            cafe.syncStation(customer.station);
            customer.station = null;
            if (customer.ejected) {
              setRoute(customer, 'to-exit', exitRoute.slice());
            } else {
              setRoute(customer, 'to-payment', [[1.85, -2.69]]);
            }
          }
          break;
        }
        case 'playing': {
          const session = customer.station.session;
          session.remaining = Math.max(0, session.remaining - dt);
          if (customer.id % 3 === 1 && session.remaining < sessionSeconds - 6 && !session.misconduct) {
            session.misconduct = true;
            cafe.syncStation(customer.station);
          }
          if (session.remaining === 0) {
            session.misconduct = false;
            session.status = 'Seans bitti';
            cafe.syncStation(customer.station);
            customer.phase = 'standing';
          }
          break;
        }
      }
    }
    customer.actor.pose(walking ? Math.sin(customer.stride) : 0, customer.pose, customer.phase === 'playing', dt);
  }

  return {
    snapshot() {
      return {
        nextArrival, nextId,
        customers: customers.map(({ actor, station, ...visitor }) => ({
          ...visitor, stationId: station?.id ?? null, position: actor.position.toArray(), rotation: actor.rotation,
        })),
        admission: admission.map(customer => customers.indexOf(customer)),
        payments: payments.map(customer => customers.indexOf(customer)),
        doorway: doorQueue.map(customer => customers.indexOf(customer)),
      };
    },
    restore(save) {
      nextArrival = save.nextArrival;
      nextId = save.nextId;
      save.customers.forEach(({ position, rotation, stationId, ...visitor }, index) => {
        const customer = customers[index];
        Object.assign(customer, visitor, { layoutRevision: cafe.layoutRevision });
        customer.station = state.stations.find(station => station.id === stationId) ?? null;
        if (customer.station) customer.seat = cafe.getSeat(stationId);
        customer.actor.position.fromArray(position);
        customer.actor.rotation = rotation;
        customer.actor.setVisible(customer.phase !== 'idle');
        customer.actor.pose(0, customer.pose, customer.phase === 'playing', 0);
      });
      admission.push(...save.admission.map(index => customers[index]));
      payments.push(...save.payments.map(index => customers[index]));
      doorQueue.push(...save.doorway.map(index => customers[index]));
      cafe.door.hold(doorQueue.length > 0);
    },
    get activeCount() { return customers.filter(({ phase }) => phase === 'playing').length; },
    get misconductCount() { return customers.filter(customer => customer.station?.session?.misconduct).length; },
    get waitingCount() { return admission.length; },
    get paymentCount() { return payments.length; },
    get nextAdmission() { return admission[0]?.ready ? admission[0].id : null; },
    get nextPayment() { return payments[0]?.ready ? payments[0].id : null; },
    sessionPrice,
    assign(stationId) {
      const customer = admission[0];
      const station = state.stations.find(item => item.id === stationId);
      if (!state.open || !customer?.ready || !station?.powered || station.session) return false;
      admission.shift();
      if (admission[0]) admission[0].ready = false;
      customer.station = station;
      customer.seat = cafe.getSeat(station.id);
      station.session = { status: 'Ayrıldı', remaining: sessionSeconds };
      setRoute(customer, 'to-seat', [customer.seat.approach]);
      return true;
    },
    collect() {
      const customer = payments[0];
      if (!customer?.ready) return 0;
      payments.shift();
      if (payments[0]) payments[0].ready = false;
      const total = state.recordPayment(sessionPrice);
      setRoute(customer, 'to-exit', exitRoute.slice());
      return total;
    },
    setPower(station, on) {
      station.powered = on;
      if (!on && station.session) {
        const customer = customers.find(item => item.station === station);
        if (customer.phase === 'to-seat') {
          customer.station = null;
          station.session = null;
          setRoute(customer, 'to-line', admissionApproach.slice(1));
        } else if (customer.phase === 'sitting' || customer.phase === 'playing') {
          customer.ejected = Boolean(station.session.misconduct);
          station.session.misconduct = false;
          station.session.status = 'Seans bitti';
          customer.phase = 'standing';
        }
      }
      cafe.syncStation(station);
    },
    eject(object) {
      const customer = customers.find(item => item.actor.object === object && item.phase === 'playing' && item.station.session.misconduct);
      if (!customer) return false;
      customer.ejected = true;
      customer.station.session.misconduct = false;
      customer.station.session.status = 'Seans bitti';
      cafe.syncStation(customer.station);
      customer.phase = 'standing';
      return true;
    },
    update(dt, player) {
      if (!state.open && admission.length) {
        for (const customer of admission.splice(0)) setRoute(customer, 'to-exit', exitRoute.slice());
      }
      nextArrival -= dt;
      const available = customers.find(customer => customer.phase === 'idle');
      const doorwayBusy = customers.some(({ phase }) => ['arrival', 'entrance', 'entering', 'exiting', 'leaving'].includes(phase));
      if (state.open && nextArrival <= 0 && available && !doorwayBusy && !nearPlayer(player, ...street)) {
        available.id = nextId++;
        available.ejected = false;
        available.actor.position.set(street[0], 0, street[1]);
        available.actor.rotation = Math.PI / 2;
        available.actor.setVisible(true);
        setRoute(available, 'arrival', [pavement, doorstep]);
        nextArrival = 13;
      }
      for (const customer of customers) {
        if (customer.phase !== 'idle') updateCustomer(customer, dt, player);
      }
    },
  };
}
