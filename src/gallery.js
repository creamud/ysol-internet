import * as THREE from '../vendor/three.module.js';
import { buildCafe } from './scene.js';
import { createCafeState } from './state.js';

const state = createCafeState();
state.cafeName = 'YSOL INTERNET';
state.open = true;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xc4d6e9);
scene.fog = new THREE.Fog(0xc4d6e9, 16, 42);
const cafe = buildCafe(scene, state);
cafe.syncBusiness();
cafe.deliverCar();
const views = {
  kafe: { position: [-1.1, 2.08, 4.35], focus: [1.25, 0.97, -2.35] },
  mahalle: { position: [6.75, 3.55, 19.45], focus: [4.2, 1.17, 4.45] },
  ev: { position: [10.2, 1.93, 7.16], focus: [12.6, 0.92, 4.15] },
};
const requested = new URLSearchParams(location.search).get('sahne');
const key = Object.hasOwn(views, requested) ? requested : 'kafe';
const view = views[key];
document.querySelector(`a[href="?sahne=${key}"]`).setAttribute('aria-current','page');
const renderer = new THREE.WebGLRenderer({ antialias:true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.append(renderer.domElement);
const camera = new THREE.PerspectiveCamera(63, 1, 0.055, 65);
camera.position.set(...view.position);
camera.lookAt(...view.focus);
function draw() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.render(scene, camera);
}
addEventListener('resize', draw);
draw();
