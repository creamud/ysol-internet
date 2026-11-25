import * as THREE from '../vendor/three.module.js';

const radius = 0.25;
const eyeHeight = 1.67;
const bodyHeight = 1.76;
const pitchLimit = Math.PI / 2 - 0.07;

export function overlapsCollider(x, z, collider) {
  if (collider.localize) [x, z] = collider.localize(x, z);
  const nearestX = Math.max(collider.minX, Math.min(x, collider.maxX));
  const nearestZ = Math.max(collider.minZ, Math.min(z, collider.maxZ));
  return (x - nearestX) ** 2 + (z - nearestZ) ** 2 < radius ** 2;
}

export class Player {
  constructor(camera, colliders) {
    this.camera = camera;
    this.colliders = colliders;
    this.feet = new THREE.Vector3(-1.35, 0, 4.25);
    this.velocity = new THREE.Vector2();
    this.verticalSpeed = 0;
    this.yaw = -0.48;
    this.pitch = -0.035;
    this.keys = new Set();
    this.stride = 0;
    this.bob = 0;
    this.syncCamera();
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }

  look(dx, dy) {
    this.yaw -= dx * 0.0021;
    this.pitch = THREE.MathUtils.clamp(this.pitch - dy * 0.0021, -pitchLimit, pitchLimit);
  }

  stop() {
    this.keys.clear();
    this.velocity.set(0, 0);
  }

  blocked(x, z) {
    return this.colliders.some(collider => collider.enabled &&
      this.feet.y < collider.top && this.feet.y + bodyHeight > collider.bottom &&
      overlapsCollider(x, z, collider));
  }

  update(dt) {
    const { feet, keys, velocity } = this;
    const forward = Number(keys.has('KeyW')) - Number(keys.has('KeyS'));
    const right = Number(keys.has('KeyD')) - Number(keys.has('KeyA'));
    const speed = (this.energyFactor ?? 1) * (keys.has('ShiftLeft') || keys.has('ShiftRight') ? 4.6 : 2.65);
    const scale = speed / Math.max(1, Math.hypot(forward, right));
    const cos = Math.cos(this.yaw);
    const sin = Math.sin(this.yaw);
    const easing = 1 - Math.exp(-14 * dt);
    velocity.x = THREE.MathUtils.lerp(velocity.x, (right * cos - forward * sin) * scale, easing);
    velocity.y = THREE.MathUtils.lerp(velocity.y, (-right * sin - forward * cos) * scale, easing);

    const oldX = feet.x;
    const oldZ = feet.z;
    const steps = Math.max(1, Math.ceil(velocity.length() * dt / 0.075));
    for (let i = 0; i < steps; i++) {
      const x = feet.x + velocity.x * dt / steps;
      const z = feet.z + velocity.y * dt / steps;
      if (!this.blocked(x, feet.z)) feet.x = x;
      if (!this.blocked(feet.x, z)) feet.z = z;
    }

    if (this.verticalSpeed > 0 || feet.y > 0) {
      this.verticalSpeed -= 9.81 * dt;
      const landing = this.colliders.reduce((height, collider) => {
        if (collider.enabled && collider.top <= feet.y && overlapsCollider(feet.x, feet.z, collider)) {
          return Math.max(height, collider.top);
        }
        return height;
      }, 0);
      const nextY = feet.y + this.verticalSpeed * dt;
      if (nextY <= landing) this.verticalSpeed = 0;
      feet.y = Math.max(landing, nextY);
    }
    const distance = Math.hypot(feet.x - oldX, feet.z - oldZ);
    this.stride += distance * 6.8;
    const targetBob = distance > 0.0005 && this.verticalSpeed === 0 ? Math.sin(this.stride) * 0.018 : 0;
    this.bob = THREE.MathUtils.lerp(this.bob, targetBob, easing);
    this.syncCamera();
    this.camera.rotation.x = THREE.MathUtils.lerp(this.camera.rotation.x, this.pitch, 1 - Math.exp(-42 * dt));
    this.camera.rotation.y = THREE.MathUtils.lerp(this.camera.rotation.y, this.yaw, 1 - Math.exp(-42 * dt));
  }

  jump() {
    if (this.verticalSpeed === 0) this.verticalSpeed = 3.12;
  }

  syncCamera() {
    this.camera.position.set(this.feet.x, this.feet.y + eyeHeight + this.bob, this.feet.z);
  }
}
