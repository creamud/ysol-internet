import * as THREE from '../vendor/three.module.js';

export const driveKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space']);

export function createDriving({ player, camera, shadowMap, driveSpeed, setMode, sound }) {
  let vehicle = null;
  let vehicleSpeed = 0;
  const chaseCameraPosition = new THREE.Vector3();

  function updateDriving(dt, snapCamera = false) {
    const { car } = vehicle;
    const throttle = Number(player.keys.has('KeyW')) - Number(player.keys.has('KeyS'));
    const steer = Number(player.keys.has('KeyA')) - Number(player.keys.has('KeyD'));
    const braking = player.keys.has('Space');
    const targetSpeed = braking ? 0 : throttle > 0 ? 11.5 : throttle < 0 ? -4.2 : 0;
    vehicleSpeed = THREE.MathUtils.lerp(vehicleSpeed, targetSpeed, 1 - Math.exp(-(braking ? 9 : 2.5) * dt));
    if (Math.abs(vehicleSpeed) < 0.025) vehicleSpeed = 0;
    const yaw = car.rotation.y + steer * THREE.MathUtils.clamp(vehicleSpeed / 3.5, -0.85, 1) * 1.42 * dt;
    const x = car.position.x - Math.cos(yaw) * vehicleSpeed * dt;
    const z = car.position.z + Math.sin(yaw) * vehicleSpeed * dt;
    if (vehicleSpeed !== 0) {
      if (!vehicle.move(x, z, yaw)) vehicleSpeed = 0;
      else shadowMap.needsUpdate = true;
    }
    player.feet.copy(car.position);
    const c = Math.cos(car.rotation.y);
    const s = Math.sin(car.rotation.y);
    chaseCameraPosition.set(car.position.x + c * 4.5, 2.75, car.position.z - s * 4.5);
    camera.position.lerp(chaseCameraPosition, snapCamera ? 1 : 1 - Math.exp(-12 * dt));
    camera.lookAt(car.position.x - c * 1.15, 0.75, car.position.z + s * 1.15);
    const speedLabel = `${Math.round(Math.abs(vehicleSpeed) * 3.6)} km/sa`;
    if (driveSpeed.textContent !== speedLabel) driveSpeed.textContent = speedLabel;
  }

  function restore(target) {
    vehicle = target;
    updateDriving(0, true);
  }

  function enterCar(target) {
    vehicle = target;
    vehicleSpeed = 0;
    player.stop();
    player.verticalSpeed = 0;
    setMode('driving');
    updateDriving(0, true);
    sound.play('boot');
  }

  function leaveCar() {
    if (Math.abs(vehicleSpeed) > 0.6) return;
    const { car } = vehicle;
    const yaw = car.rotation.y;
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    const exitOffsets = [[0, 1.24], [0, -1.24], [2, 0], [-2, 0]];
    for (const [along, side] of exitOffsets) {
      const x = car.position.x + c * along + s * side;
      const z = car.position.z - s * along + c * side;
      if (player.blocked(x, z)) continue;
      vehicle = null;
      vehicleSpeed = 0;
      player.stop();
      player.feet.set(x, 0, z);
      player.yaw = Math.atan2(c, -s);
      player.pitch = -0.05;
      player.bob = 0;
      player.syncCamera();
      camera.rotation.set(player.pitch, player.yaw, 0, 'YXZ');
      setMode('play');
      return;
    }
  }

  return {
    get active() { return vehicle !== null; },
    update: updateDriving,
    enter: enterCar,
    leave: leaveCar,
    restore,
  };
}
