import { overlapsCollider } from './player.js';

const min = -5.1;
const step = 0.30;
const size = 35;
export const inCafe = ([x, z]) => Math.abs(x) <= 5.2 && Math.abs(z) <= 5.2;

export function makePathfinder(colliders) {
  function blocked(x, z, extra) {
    return colliders.some(item => item.enabled && !item.localize && item.bottom < 1.45 &&
      item.top > 0.14 && overlapsCollider(x, z, item)) ||
      extra.some(item => overlapsCollider(x, z, item));
  }
  function clear(from, to, extra) {
    const steps = Math.max(1, Math.ceil(Math.hypot(to[0] - from[0], to[1] - from[1]) / 0.13));
    for (let i = 0; i <= steps; i++) {
      if (blocked(from[0] + (to[0] - from[0]) * i / steps, from[1] + (to[1] - from[1]) * i / steps, extra)) return false;
    }
    return true;
  }
  const point = key => [min + (key % size) * step, min + Math.floor(key / size) * step];
  function closest(target, extra) {
    const col = Math.round((target[0] - min) / step);
    const row = Math.round((target[1] - min) / step);
    let key = -1;
    let distance = Infinity;
    for (let z = Math.max(0, row - 3); z <= Math.min(size - 1, row + 3); z++) {
      for (let x = Math.max(0, col - 3); x <= Math.min(size - 1, col + 3); x++) {
        const candidate = z * size + x;
        const p = point(candidate);
        const d = Math.hypot(p[0] - target[0], p[1] - target[1]);
        if (d < distance && clear(p, target, extra)) {
          key = candidate;
          distance = d;
        }
      }
    }
    return key;
  }
  return function path(from, to, extra = []) {
    if (!inCafe(from) || !inCafe(to) || clear(from, to, extra)) return [to];
    const start = closest(from, extra);
    const end = closest(to, extra);
    if (start < 0 || end < 0) return null;
    const parent = new Int16Array(size * size).fill(-1);
    const queue = [start];
    parent[start] = start;
    for (let i = 0; i < queue.length && parent[end] < 0; i++) {
      const key = queue[i];
      const [x, z] = point(key);
      for (const [dx, dz] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        const col = key % size + dx;
        const row = Math.floor(key / size) + dz;
        if (col < 0 || col >= size || row < 0 || row >= size) continue;
        const next = row * size + col;
        if (parent[next] >= 0 || !clear([x,z], point(next), extra)) continue;
        parent[next] = key;
        queue.push(next);
      }
    }
    if (parent[end] < 0) return null;
    const route = [to];
    for (let key = end; key !== start; key = parent[key]) route.push(point(key));
    route.push(point(start));
    route.reverse();
    const result = [];
    let anchor = from;
    for (let i = 0; i < route.length; i++) {
      let next = i;
      while (next + 1 < route.length && clear(anchor, route[next + 1], extra)) next++;
      result.push(route[next]);
      anchor = route[next];
      i = next;
    }
    return result;
  };
}
