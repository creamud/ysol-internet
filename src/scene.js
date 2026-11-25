import { texture, randomGenerator, floorMaterial, woodMaterial } from './materials.js';
import { decor } from './shop.js';
import { drawChannel } from './television.js';
import { makePathfinder } from './navigation.js';
import * as THREE from '../vendor/three.module.js';
import { overlapsCollider } from './player.js';

const standard = (color, roughness = 0.7, metalness = 0) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });
const matte = color => new THREE.MeshBasicMaterial({ color });
const unitBox = new THREE.BoxGeometry(1, 1, 1);
const unitPlane = new THREE.PlaneGeometry(1, 1);
const unitCylinder = new THREE.CylinderGeometry(1, 1, 1, 14);
const unitSphere = new THREE.SphereGeometry(1, 14, 10);

function form(parent, geometry, material, x, y, z, sx, sy, sz, shadows = true) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  mesh.castShadow = shadows;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function box(parent, material, x, y, z, w, h, d, shadows) {
  return form(parent, unitBox, material, x, y, z, w, h, d, shadows);
}

function cylinder(parent, material, x, y, z, radius, height, depth = radius) {
  return form(parent, unitCylinder, material, x, y, z, radius, height, depth);
}

function group(parent, x, y, z, angle = 0) {
  const object = new THREE.Group();
  object.position.set(x, y, z);
  object.rotation.y = angle;
  parent.add(object);
  return object;
}

function sign(parent, x, y, z, width, height, draw) {
  const material = new THREE.MeshBasicMaterial({ map: texture(768, Math.round(768 * height / width), draw) });
  return form(parent, unitPlane, material, x, y, z, width, height, 1, false);
}

function lettering(ctx, value, size, x, y, color = '#1d1d1f', weight = 700) {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px system-ui, sans-serif`;
  ctx.fillText(value, x, y);
}

function drawStationScreen(ctx, width, height, cafeName, warning) {
  const background = ctx.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, warning ? '#871f35' : '#eff5ff');
  background.addColorStop(1, warning ? '#4f1223' : '#a9c6f3');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = warning ? '#fff5f7' : '#151f32';
  ctx.font = '650 70px system-ui, sans-serif';
  ctx.fillText(cafeName, width / 2, height / 2, width - 96);
}

export function buildCafe(scene, state) {
  const colliders = [];
  const surfaces = new THREE.Group();
  const visitors = new THREE.Group();
  scene.add(surfaces, visitors);

  const plaster = standard(0xe7e9ed);
  const aluminum = standard(0xd7dde5);
  const black = standard(0x687582, 0.49, 0.32);
  const plastic = standard(0x343b46);
  const keycap = standard(0x929ca9);
  const fabric = standard(0x4b5668, 0.95);
  const wood = woodMaterial();
  const glow = matte(0xf4f9ff);
  const screenOff = matte(0x161b23);
  const ledOn = matte(0x7ebdff);
  const contactMap = texture(128, 128, (ctx, width, height) => {
    const center = width / 2;
    const fade = ctx.createRadialGradient(center, center, 8, center, center, center);
    fade.addColorStop(0, '#171710a6');
    fade.addColorStop(0.48, '#17171057');
    fade.addColorStop(1, '#17171000');
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, width, height);
  });
  const contact = new THREE.MeshBasicMaterial({
    map: contactMap, transparent: true, depthWrite: false, opacity: 0.64,
  });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xb7d5ee, transparent: true, opacity: 0.13, roughness: 0.28, depthWrite: false });

  function solid(x, z, width, depth, top, bottom = 0) {
    const collider = { minX: x - width / 2, maxX: x + width / 2,
      minZ: z - depth / 2, maxZ: z + depth / 2, bottom, top, enabled: true };
    colliders.push(collider);
    return collider;
  }

  function floorShade(x, z, width, depth) {
    const shade = form(surfaces, unitPlane, contact, x, 0.003, z, width, depth, 1, false);
    shade.rotation.x = -Math.PI / 2;
    shade.userData.ignoreRay = true;
  }

  function wall(x, y, z, width, height, depth, material = plaster) {
    box(surfaces, material, x, y, z, width, height, depth, false);
    solid(x, z, width, depth, y + height / 2, y - height / 2);
  }

  function register(object, interaction) {
    object.userData.interaction = interaction;
  }

  box(surfaces, floorMaterial(), 0, -0.065, -0.04, 11.4, 0.13, 10.94, false);
  box(surfaces, standard(0xe3e7ec), 0, 3.38, 0, 11.35, 0.18, 10.9, false);
  wall(-5.55, 1.65, 0, 0.18, 3.3, 11);
  wall(5.55, 1.65, 0, 0.18, 3.3, 11, aluminum);
  wall(0, 1.65, -5.45, 11.1, 3.3, 0.18, aluminum);
  for (const x of [-5.43, 5.43]) box(surfaces, black, x, 0.085, 0, 0.045, 0.17, 10.8);
  box(surfaces, black, 0, 0.085, -5.33, 11, 0.17, 0.035);
  const displayWall = standard(0xd1dae7, 0.62);
  box(surfaces, displayWall, 0.24, 1.65, -5.33, 5.5, 3.13, 0.038, false);
  for (const x of [-2.54, 3.02]) {
    box(surfaces, glow, x, 1.64, -5.31, 0.025, 2.86, 0.027, false);
  }
  box(surfaces, wood, 0.24, 0.43, -5.20, 5.42, 0.085, 0.25);
  function drawCafeSign(ctx, w, h) {
    const background = ctx.createLinearGradient(0, 0, w, h);
    background.addColorStop(0, '#eaf0fa');
    background.addColorStop(1, '#c5d4e8');
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = 'center';
    lettering(ctx, state.cafeName, Math.min(77, 1030 / state.cafeName.length), w / 2, 112, '#1d293c', 680);
    lettering(ctx, 'İ N T E R N E T   K A F E', 19, w / 2, 165, '#4b617b', 560);
  }
  const cafeSign = sign(surfaces, 0.24, 2.01, -5.303, 3.95, 1.17, drawCafeSign);

  // Glazed storefront and a walkable entrance vestibule.
  wall(-4.96, 1.65, 5.43, 1.17, 3.3, 0.2);
  wall(-3.73, 2.87, 5.43, 1.3, 0.86, 0.2, aluminum);
  wall(1.48, 0.29, 5.43, 8.09, 0.58, 0.2, aluminum);
  wall(1.48, 2.98, 5.43, 8.09, 0.64, 0.2, aluminum);
  solid(1.48, 5.43, 8.09, 0.13, 2.66, 0.58);
  const frontGlass = box(surfaces, glass, 1.48, 1.62, 5.43, 8.09, 2.08, 0.028, false);
  frontGlass.userData.ignoreRay = true;
  for (const x of [-4.39, -3.07, -2.55, -0.53, 1.49, 3.51, 5.51]) {
    box(surfaces, black, x, 1.53, 5.43, 0.055, 2.51, 0.12);
  }
  box(surfaces, black, 1.48, 2.64, 5.43, 8.09, 0.055, 0.14);
  box(surfaces, black, 1.48, 0.6, 5.43, 8.09, 0.055, 0.14);
  box(surfaces, black, -3.73, 2.43, 5.43, 1.34, 0.07, 0.15);
  solid(-3.07, 5.43, 0.055, 0.12, 2.5);
  solid(-2.82, 5.43, 0.5, 0.2, 3.3);
  box(surfaces, aluminum, -2.82, 1.65, 5.43, 0.5, 3.3, 0.2, false);

  const door = group(surfaces, -4.36, 0, 5.43);
  for (const x of [0.023, 1.235]) box(door, black, x, 1.2, 0, 0.046, 2.39, 0.065);
  for (const y of [0.08, 1.03, 2.34]) box(door, black, 0.63, y, 0, 1.26, 0.09, 0.065);
  box(door, glass, 0.63, 1.22, 0, 1.24, 2.26, 0.027, false);
  for (const z of [-0.085, 0.085]) cylinder(door, standard(0xd3deeb, 0.37, 0.65), 1.1, 1.18, z, 0.025, 0.29);
  const doorCollider = solid(0.63, 0, 1.26, 0.07, 2.4);
  let doorAngle = 0;
  doorCollider.localize = (x, z) => {
    const dx = x - door.position.x;
    const dz = z - door.position.z;
    return [dx * Math.cos(doorAngle) - dz * Math.sin(doorAngle),
      dx * Math.sin(doorAngle) + dz * Math.cos(doorAngle)];
  };
  let doorOpen = false;
  let visitorHoldingDoor = false;
  const doorInteraction = {
    type: 'door',
    label: () => visitorHoldingDoor ? 'Müşteri Geçişi' : doorOpen ? 'Kapıyı Kapat' : 'Kapıyı Aç',
    activate(player) {
      if (visitorHoldingDoor) return 'Müşteri geçerken kapı açık tutuluyor.';
      const dx = player.feet.x - door.position.x;
      const dz = player.feet.z - door.position.z;
      if (dx >= -0.27 && dz >= -0.27 && Math.hypot(dx, dz) < 1.53) {
        return 'Kapıyı hareket ettirmek için biraz geri çekil.';
      }
      doorOpen = !doorOpen;
      return doorOpen ? 'Giriş kapısı açıldı.' : 'Giriş kapısı kapatıldı.';
    },
  };
  register(door, doorInteraction);

  // The storefront opens onto a two-sided street and a small public square.
  const asphaltMap = texture(256,256,(ctx,w,h) => {
    const random = randomGenerator(813);
    ctx.fillStyle = '#50555b'; ctx.fillRect(0,0,w,h);
    for (let i=0;i<11000;i++) {
      const shade = 55 + Math.floor(random()*55);
      ctx.fillStyle = `rgba(${shade},${shade+3},${shade+6},.42)`;
      ctx.fillRect(random()*w,random()*h,1+random()*1.8,1+random());
    }
  });
  asphaltMap.wrapS = asphaltMap.wrapT = THREE.RepeatWrapping;
  asphaltMap.repeat.set(18,2);
  const asphalt = new THREE.MeshStandardMaterial({map:asphaltMap,roughness:0.97});
  const pavementMap = texture(256,256,(ctx,w,h) => {
    const random = randomGenerator(178);
    ctx.fillStyle = '#7f7970'; ctx.fillRect(0,0,w,h);
    for (let y=0;y<4;y++) for (let x=0;x<4;x++) {
      const light = 144+Math.floor(random()*27);
      ctx.fillStyle = `rgb(${light+9},${light+6},${light})`;
      ctx.fillRect(x*64+1,y*64+1,62,62);
    }
  });
  pavementMap.wrapS = pavementMap.wrapT = THREE.RepeatWrapping;
  pavementMap.repeat.set(25,2);
  const stone = new THREE.MeshStandardMaterial({map:pavementMap,roughness:0.88});
  const curb = standard(0xb4aca0);
  box(surfaces, stone, 0, -0.077, 7.505, 63.8, 0.15, 4.15, false);
  box(surfaces, curb, 16.5, -0.078, 2.35, 21.6, 0.15, 6.16, false);
  box(surfaces, curb, -18.8, -0.078, 2.35, 26.2, 0.15, 6.16, false);
  box(surfaces, asphalt, 0, -0.13, 12.51, 78.4, 0.13, 6.22, false);
  box(surfaces, stone, 0, -0.077, 18.76, 63.8, 0.15, 6.28, false);
  box(surfaces, curb, 0, -0.078, 23.46, 66, 0.15, 3.12, false);

  const cityGround = standard(0x8f8b80, 1);
  box(surfaces, cityGround, 0, -0.2, 19, 232, 0.21, 190, false);
  const roadMark = matte(0xcfd0c6);
  const crossStreets = [-15, 12.51, 34, 51];
  for (const z of crossStreets) {
    if (z !== 12.51) {
      box(surfaces, asphalt, 0, -0.13, z, 78.4, 0.13, 6.4, false);
      for (const edge of [-1, 1]) box(surfaces, stone, 0, -0.077, z + edge * 4.1, 63.8, 0.15, 1.8, false);
      for (let x = -30; x <= 30; x += 4) box(surfaces, roadMark, x, -0.061, z, 1.55, 0.004, 0.085, false);
    }
  }
  for (const x of [-36, 36]) {
    const streetMin = -18.2;
    const streetMax = 54.2;
    box(surfaces, asphalt, x, -0.129, (streetMin + streetMax) / 2, 6.4, 0.13, streetMax - streetMin, false);
    for (let i = 1; i < crossStreets.length; i++) {
      const from = crossStreets[i - 1] + 3.2;
      const to = crossStreets[i] - 3.2;
      for (const edge of [-1, 1]) box(surfaces, stone, x + edge * 4.1, -0.077, (from + to) / 2,
        1.8, 0.15, to - from, false);
      for (let z = from + 1.7; z < to - 1; z += 3.8) box(surfaces, roadMark, x, -0.060, z, 0.085, 0.004, 1.55, false);
    }
  }

  for (const z of [9.59,15.58]) box(surfaces, curb, 0,-0.037,z,63.8,0.075,0.12,false);
  for (let i=-8;i<=8;i++) {
    const x=i*3.7;
    if (Math.abs(x-7.1)>1.55) box(surfaces, roadMark,x,-0.061,12.52,1.65,0.004,0.085,false);
  }
  for (let i=0;i<10;i++) box(surfaces,roadMark,7.1,-0.059,9.83+i*.59,1.9,0.004,.27,false);
  const facadeColors = [0x8d8c89,0xaba08e,0x877c73,0xa6a29b];
  const windowGlass = standard(0x4e677a,0.34,0.16);
  const windowFrame = standard(0x363d45);
  for (let i=-5;i<=5;i++) {
    const x=i*5.75;
    if (i===3 || i===4) continue;
    const rows=3+Math.abs(i)%2;
    const height=1.35+rows*1.45;
    const block=group(surfaces,x,0,22.02);
    const shell=standard(facadeColors[(i+8)%facadeColors.length]);
    box(block,shell,0,height/2,1.12,5.57,height,2.22,false);
    box(block,curb,0,height,-0.015,5.62,0.18,.13,false);
    box(block,windowFrame,-1.48,1.05,-.029,1.08,2.1,.11,false);
    box(block,windowGlass,-1.48,1.15,-.09,.84,1.66,.018,false);
    box(block,windowFrame,0.97,1.15,-.029,2.2,1.42,.10,false);
    box(block,windowGlass,0.97,1.15,-.088,2.06,1.29,.018,false);
    for(let row=0;row<rows;row++) {
      const y=2.47+row*1.45;
      box(block,curb,0,y-.51,-.08,5.52,.065,.20,false);
      for(const col of [-1.52,0,1.52]) {
        box(block,windowFrame,col,y,-.035,.88,.94,.11,false);
        box(block,windowGlass,col,y,-.096,.77,.82,.016,false);
        box(block,windowFrame,col,y,-.113,.032,.84,.022,false);
      }
    }
    solid(x,23.12,5.58,2.21,height);
  }
  const districtWalls = facadeColors.map(color => standard(color, 0.9));
  const cityRandom = randomGenerator(561);
  const districtParts = new Map([...districtWalls, curb, windowGlass].map(material => [material, []]));
  function districtBox(material, x, y, z, width, height, depth) {
    const transform = new THREE.Matrix4().makeScale(width, height, depth);
    transform.setPosition(x, y, z);
    districtParts.get(material).push(transform);
  }
  for (const z of [-44, -20, -9, 28, 42, 60]) {
    for (let i = -11; i <= 11; i++) {
      const x = i * 5.95 + (z === 42 ? 1.4 : 0);
      if (Math.abs(Math.abs(x) - 36) < 6 || (z === 28 && Math.abs(x) < 9)) continue;
      const stories = 2 + Math.floor(cityRandom() * 4);
      const height = 1.6 + stories * 1.14;
      const width = 4.3 + cityRandom() * 1.05;
      const depth = 4.4 + cityRandom() * 0.9;
      const wall = districtWalls[(i + 12 + stories) % districtWalls.length];
      districtBox(wall, x, height / 2 - 0.1, z, width, height, depth);
      if (Math.abs(x) < 42 && z >= -21 && z <= 56) solid(x, z, width, depth, height);
      districtBox(curb, x, height - 0.08, z, width + 0.1, 0.16, depth + 0.1);
      const facade = Math.sign(12 - z);
      for (let floor = 0; floor < stories; floor++) {
        for (const column of [-1.25, 0, 1.25]) {
          districtBox(windowGlass, x + column, 1.35 + floor * 1.14, z + facade * (depth / 2 + 0.01),
            0.63, 0.64, 0.035);
        }
      }
    }
  }
  for (const [material, transforms] of districtParts) {
    const blockMeshes = new THREE.InstancedMesh(unitBox, material, transforms.length);
    transforms.forEach((transform, index) => blockMeshes.setMatrixAt(index, transform));
    blockMeshes.instanceMatrix.needsUpdate = true;
    scene.add(blockMeshes);
  }
  for (const edge of [-42, 42]) solid(edge, 17, 0.2, 76, 5);
  for (const end of [-21, 55]) solid(0, end, 84, 0.2, 5);
  for(const x of [-27,-20,-12,-6.5,0,6.5,16.5,24,30]) {
    cylinder(surfaces,black,x,1.64,9.27,.045,3.28);
    box(surfaces,black,x,3.23,9.04,.075,.063,.47,false);
    box(surfaces,glow,x,3.18,8.85,.21,.055,.35,false);
  }
  for (const [x, width] of [[-9, 5.4], [-15, 5.4], [20, 6], [27, 6]]) {
    const facade = group(surfaces, x, 0, 2.65);
    const height = x < 0 ? 6.2 : 5.15;
    box(facade, districtWalls[x < 0 ? 1 : 3], 0, height / 2 - 0.08, 0, width, height, 5.2, false);
    box(facade, curb, 0, height - 0.08, 0, width + 0.18, 0.14, 5.38, false);
    for (const y of [1.37, 2.95, 4.45]) {
      for (const column of [-1.52, 0, 1.52]) {
        box(facade, windowFrame, column, y, 2.612, 0.91, 1.03, 0.052, false);
        box(facade, windowGlass, column, y, 2.647, 0.78, 0.91, 0.02, false);
      }
    }
    solid(x, 2.65, width, 5.2, height);
  }
  const rubber=standard(0x212428);
  function parkedCar(x,z,color) {
    const car=group(surfaces,x,0,z);
    const paint=standard(color,.38,.16);
    box(car,paint,0,.43,0,3.25,.43,1.42);
    box(car,windowGlass,.12,.78,0,1.75,.33,1.23);
    box(car,paint,.12,.97,0,1.58,.08,1.18);
    for(const side of [-1,1]) {
      box(car,windowFrame,.12,.77,side*.624,.06,.31,.021);
      box(car,curb,-1.66,.41,side*.46,.052,.15,.28);
      box(car,matte(0xa32d34),1.66,.43,side*.46,.052,.15,.27);
      for(const wheel of [-1.02,1.02]) {
        const tire=cylinder(car,rubber,wheel,.27,side*.69,.245,.17);
        tire.rotation.x=Math.PI/2;
        const hub=cylinder(car,curb,wheel,.27,side*.786,.11,.028);
        hub.rotation.x=Math.PI/2;
      }
    }
    const collider = solid(x,z,3.35,1.58,1.02);
    return { car, collider };
  }
  parkedCar(-10,10.64,0x456879);
  parkedCar(12.4,14.45,0x999691);
  parkedCar(25.7,10.64,0x705c62);
  for (const z of [9.95,11.77]) box(surfaces,roadMark,2.65,-0.059,z,4.12,.004,.045,false);
  for (const x of [0.59,4.71]) box(surfaces,roadMark,x,-0.059,10.86,.045,.004,1.82,false);
  let ownCar = null;
  const lawn=standard(0x65785e);
  const bark=standard(0x635246);
  const leaves=[standard(0x526f55),standard(0x607e57),standard(0x789161)];
  for(const x of [17.15,21.05,24.65,28.1]) {
    box(surfaces,curb,x,.11,20.48,2.23,.23,2.18,false);
    box(surfaces,lawn,x,.227,20.48,2.06,.022,2.02,false);
    solid(x,20.48,2.23,2.18,.24);
    cylinder(surfaces,bark,x,1.46,20.48,.115,2.48);
    solid(x,20.48,.24,.24,2.4);
    for(let i=0;i<4;i++) {
      form(surfaces,unitSphere,leaves[i%3],x+Math.sin(i*2.3)*.55,2.48+i*.14,20.48+Math.cos(i*2.3)*.5,1.04,.8,.95,false);
    }
  }
  for(const x of [19.4,25.9]) {
    const bench=group(surfaces,x,0,18.75);
    for(const leg of [-.70,.70]) box(bench,black,leg,.22,0,.07,.44,.45);
    box(bench,wood,0,.46,0,1.68,.07,.54);
    box(bench,wood,0,.69,.24,1.68,.32,.07);
    solid(x,18.75,1.69,.57,.85);
  }
  const streetSign = group(surfaces, -3.72, 2.59, 5.565);
  function doorPlaque(value, color) {
    return new THREE.MeshBasicMaterial({ map: texture(384, 96, (ctx, w, h) => {
      ctx.fillStyle = color; ctx.fillRect(0, 0, w, h);
      ctx.textAlign = 'center';
      lettering(ctx, value, 46, w / 2, 65, '#ffffff');
    }) });
  }
  const openPlaque = doorPlaque('●  AÇIK', '#246349');
  const closedPlaque = doorPlaque('●  KAPALI', '#514359');
  const doorSign = form(streetSign, unitPlane, closedPlaque, 0, 0, 0, 0.83, 0.21, 1, false);
  const innerPlaque = form(streetSign, unitPlane, closedPlaque, 0, 0, -0.28, 0.83, 0.21, 1, false);
  innerPlaque.rotation.y = Math.PI;
  register(streetSign, { type: 'business', label: () => state.open ? 'Dükkânı kapat' : 'Dükkânı aç' });

  function plant(x, z, size) {
    floorShade(x, z, size * 1.14, size * 1.1);
    const planter = group(surfaces, x, 0, z);
    const pot = standard(0xc9ced4);
    cylinder(planter, pot, 0, size * 0.23, 0, size * 0.27, size * 0.46);
    cylinder(planter, standard(0x463a2a), 0, size * 0.46, 0, size * 0.248, 0.026);
    const leaves = [standard(0x445e39), standard(0x647644), standard(0x354f35)];
    for (let i = 0; i < 11; i++) {
      const angle = i * 2.4;
      const reach = (0.17 + i % 3 * 0.09) * size;
      const y = (0.65 + i % 5 * 0.105) * size;
      const stem = cylinder(planter, leaves[0], Math.cos(angle) * reach * 0.4, (y + size * 0.43) / 2,
        Math.sin(angle) * reach * 0.4, size * 0.012, y - size * 0.41);
      stem.rotation.z = -Math.cos(angle) * 0.3;
      stem.rotation.x = Math.sin(angle) * 0.3;
      const leaf = form(planter, unitSphere, leaves[i % 3], Math.cos(angle) * reach, y,
        Math.sin(angle) * reach, size * 0.21, size * 0.035, size * 0.084);
      leaf.rotation.set(0, -angle, 0.28 + i % 3 * 0.16);
    }
    solid(x, z, size * 0.54, size * 0.54, size * 0.46);
  }
  plant(-4.94, 4.45, 1.12);
  plant(0.02, -4.72, 0.94);
  plant(4.81, 4.77, 0.93);

  // Furniture shares geometry and materials. Each station owns its screen and state.
  const displays = new Map();
  const seats = new Map();
  const stationScreen = warning => new THREE.MeshBasicMaterial({
    map: texture(768, 432, (ctx, w, h) => drawStationScreen(ctx, w, h, state.cafeName, warning)),
  });
  const stationReady = stationScreen(false);
  const stationWarning = stationScreen(true);
  const gameFrame = texture(256, 144, (ctx, w, h) => {
    ctx.fillStyle = '#07142b';
    ctx.fillRect(0, 0, w, h);
  });
  const stationGame = new THREE.MeshBasicMaterial({ map: gameFrame });
  let gameTime = 0;
  let gameTick = -1;
  function updateStationGame(dt) {
    if (!state.stations.some(station => station.powered && station.session?.status === 'Kullanımda' &&
        !station.session.misconduct)) return;
    gameTime += dt;
    const tick = Math.floor(gameTime * 15);
    if (tick === gameTick) return;
    gameTick = tick;
    const ctx = gameFrame.image.getContext('2d');
    ctx.fillStyle = '#07142b';
    ctx.fillRect(0, 0, 256, 144);
    ctx.fillStyle = '#47638a';
    for (let i = 0; i < 30; i++) ctx.fillRect(i * 67 % 256, (i * 39 + tick) % 144, 1, 2);
    lettering(ctx, 'ORBIT PATROL', 10, 10, 14, '#8adfff');
    lettering(ctx, String(240 + Math.floor(tick / 12) * 20), 10, 214, 14, '#fff0aa');
    const drift = Math.sin(gameTime * 1.8) * 19;
    for (let i = 0; i < 18; i++) {
      const x = 53 + (i % 6) * 25 + drift;
      const y = 34 + Math.floor(i / 6) * 15;
      if (i === Math.floor(tick / 4) % 18) continue;
      ctx.fillStyle = i < 6 ? '#ff86b6' : '#ad8fff';
      ctx.fillRect(x, y, 13, 6);
      ctx.fillRect(x + 3, y - 3, 7, 11);
    }
    const shipX = 122 + Math.sin(gameTime * 2.3) * 66;
    ctx.fillStyle = '#79e4ea';
    ctx.fillRect(shipX, 126, 15, 5);
    ctx.fillRect(shipX + 5, 120, 5, 8);
    ctx.fillStyle = '#ffcf70';
    ctx.fillRect(shipX + 6, 114 - tick * 5 % 78, 3, 8);
    gameFrame.needsUpdate = true;
  }
  function monitor(parent, active, x, y, z, powered) {
    box(parent, black, x, y - 0.22, z - 0.03, 0.27, 0.029, 0.18);
    box(parent, black, x, y - 0.125, z - 0.072, 0.055, 0.2, 0.052);
    box(parent, plastic, x, y + 0.04, z, 0.62, 0.355, 0.044);
    const screen = form(parent, unitPlane, powered ? active : screenOff, x, y + 0.045, z + 0.023, 0.592, 0.329, 1, false);
    const led = box(parent, powered ? ledOn : black, x + 0.271, y - 0.126, z + 0.024, 0.019, 0.006, 0.004, false);
    return { screen, led, active };
  }

  function keyboardAndMouse(parent, x, y, z) {
    const base = box(parent, plastic, x, y + 0.016, z, 0.37, 0.027, 0.126);
    const keys = new THREE.InstancedMesh(unitBox, keycap, 41);
    const matrix = new THREE.Matrix4();
    for (let i = 0; i < 40; i++) {
      matrix.makeScale(0.022, 0.009, 0.017);
      matrix.setPosition((i % 10 - 4.5) * 0.033, 0.017, (Math.floor(i / 10) - 1.9) * 0.023);
      keys.setMatrixAt(i, matrix);
    }
    matrix.makeScale(0.13, 0.009, 0.013);
    matrix.setPosition(0, 0.017, 0.047);
    keys.setMatrixAt(40, matrix);
    keys.position.copy(base.position);
    parent.add(keys);
    box(parent, fabric, x + 0.32, y + 0.004, z + 0.01, 0.22, 0.008, 0.22);
    form(parent, unitSphere, plastic, x + 0.32, y + 0.024, z + 0.02, 0.038, 0.025, 0.06);
    box(parent, keycap, x + 0.32, y + 0.047, z - 0.003, 0.009, 0.006, 0.021);
  }

  function chair(x, z, angle) {
    floorShade(x, z, 0.94, 0.94);
    const seat = group(surfaces, x, 0, z, angle);
    form(seat, unitSphere, fabric, 0, 0.46, 0, 0.28, 0.071, 0.25);
    form(seat, unitSphere, fabric, 0, 0.78, 0.208, 0.256, 0.29, 0.061).rotation.x = -0.12;
    cylinder(seat, black, 0, 0.24, 0, 0.042, 0.36);
    for (let i = 0; i < 5; i++) {
      const arm = group(seat, 0, 0, 0, i * Math.PI * 0.4);
      box(arm, black, 0, 0.085, 0.11, 0.045, 0.04, 0.27);
      cylinder(arm, plastic, 0, 0.039, 0.229, 0.035, 0.067);
    }
    for (const side of [-1, 1]) {
      box(seat, black, side * 0.247, 0.55, 0.02, 0.036, 0.18, 0.05);
      box(seat, plastic, side * 0.247, 0.65, 0, 0.067, 0.044, 0.29);
    }
    solid(x, z, 0.52, 0.59, 1.07);
  }

  const desks = new Map();
  let layoutRevision = 0;

  const path = makePathfinder(colliders);
  function deskLayout(slot) {
    const angle = slot.angle ?? -Math.PI / 2;
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);
    const local = (x, z) => [slot.x + x * cos + z * sin, slot.z - x * sin + z * cos];
    function bounds(x, z, width, depth, top) {
      const [cx, cz] = local(x, z);
      const w = Math.abs(cos) * width + Math.abs(sin) * depth;
      const d = Math.abs(sin) * width + Math.abs(cos) * depth;
      return { minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2, top };
    }
    const [x, z] = local(0, 1.01);
    return {
      seat: { x, z, yaw: angle + Math.PI, approach: local(0, 1.63) },
      bounds: [bounds(0, 0, 1.58, 0.91, 0.797), bounds(0, 1.01, 0.57, 0.59, 1.07),
        bounds(0.57, -0.13, 0.23, 0.33, 1.17), bounds(-0.12, -0.18, 0.62, 0.08, 1.27)],
    };
  }

  const ghostMaterial = new THREE.MeshBasicMaterial({ color: 0x4889e6, transparent: true, opacity: 0.44, depthWrite: false });
  const ghost = group(scene, 0, 0, 0);
  box(ghost, ghostMaterial, 0, 0.765, 0, 1.58, 0.063, 0.91, false);
  for (const x of [-0.69, 0.69]) for (const z of [-0.36, 0.36]) {
    box(ghost, ghostMaterial, x, 0.36, z, 0.047, 0.72, 0.05, false);
  }
  box(ghost, ghostMaterial, 0, 0.47, 1.01, 0.52, 0.09, 0.50, false);
  box(ghost, ghostMaterial, 0, 0.76, 1.23, 0.52, 0.54, 0.07, false);
  ghost.visible = false;
  const decorGhosts = new Map();
  for (const [kind, item] of Object.entries(decor)) {
    const marker = group(scene, 0, 0, 0);
    box(marker, ghostMaterial, 0, item.height / 2 + 0.006, 0, item.width, item.height, item.depth, false);
    marker.visible = false;
    decorGhosts.set(kind, marker);
  }
  const rugs = [];
  const furnitureByDesk = new Map();
  function decorBounds(slot, kind) {
    const item = decor[kind];
    const cos = Math.abs(Math.cos(slot.angle));
    const sin = Math.abs(Math.sin(slot.angle));
    const w = cos * item.width + sin * item.depth;
    const d = sin * item.width + cos * item.depth;
    return { minX: slot.x - w / 2, maxX: slot.x + w / 2, minZ: slot.z - d / 2, maxZ: slot.z + d / 2, top: item.height };
  }
  const rugMaterial = standard(0x293f60,0.94);
  const rugThread = standard(0xb6bdc6,0.92);
  const shadeMaterial = new THREE.MeshBasicMaterial({color:0xffd7a1});
  const lampGlow = texture(64,64,(ctx,w,h) => {
    const gradient = ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);
    gradient.addColorStop(0,'#fff2d9b8');
    gradient.addColorStop(1,'#fff2d900');
    ctx.fillStyle = gradient;
    ctx.fillRect(0,0,w,h);
  });
  const lamplight = new THREE.MeshBasicMaterial({
    color:0xf5b76d, map:lampGlow, transparent:true, depthWrite:false, opacity:0.32,
  });
  function buildDecor(kind, slot) {
    const { x,z,angle } = slot;
    if (kind === 'plant') {
      plant(x,z,1.16);
      layoutRevision++;
      return;
    }
    const piece = group(surfaces,x,0,z,angle);
    if (kind === 'rug') {
      box(piece,rugMaterial,0,.012,0,1.65,.022,1.03);
      for (const x of [-.76,.76]) box(piece,rugThread,x,.024,0,.026,.002,.97,false);
      for (const z of [-.46,.46]) box(piece,rugThread,0,.024,z,1.48,.002,.026,false);
      rugs.push(decorBounds(slot,kind));
      return;
    }
    const pool = form(piece,unitPlane,lamplight,0,.004,0,1.34,1.34,1,false);
    pool.rotation.x = -Math.PI / 2;
    pool.userData.ignoreRay = true;
    cylinder(piece,black,0,.037,0,.23,.07);
    cylinder(piece,black,0,.75,0,.023,1.48);
    form(piece,new THREE.CylinderGeometry(.17,.237,.32,18),shadeMaterial,0,1.46,0,1,1,1);
    solid(x,z,.48,.48,1.63);
    layoutRevision++;
  }
  const overlaps = (a,b) => a.minX < b.maxX + 0.12 && a.maxX > b.minX - 0.12 &&
    a.minZ < b.maxZ + 0.12 && a.maxZ > b.minZ - 0.12;
  const serviceAreas = [
    { minX: -4.53, maxX: -2.97, minZ: -2.56, maxZ: 1.38 },
    { minX: -2.02, maxX: 2.07, minZ: -2.98, maxZ: -2.39 },
  ];
  const entranceArea = { minX: -4.55, maxX: -2.58, minZ: 1.25, maxZ: 5.43 };
  function placementValid(slot, player, checkPaths = false, kind = 'desk', moving = null) {
    const { bounds, seat } = kind === 'desk' ? deskLayout(slot) : { bounds: [decorBounds(slot,kind)] };
    if (kind === 'rug') {
      const [item] = bounds;
      return item.minX >= -5.25 && item.maxX <= 5.25 && item.minZ >= -5.15 && item.maxZ <= 5.15 &&
        !rugs.some(other => other !== moving?.rug && overlaps(item,other));
    }
    if (bounds.some(item => item.minX < -5.25 || item.maxX > 5.25 ||
        item.minZ < -5.15 || item.maxZ > 5.15 || serviceAreas.some(area => overlaps(item, area)) ||
        overlaps(item, entranceArea) || overlapsCollider(player.feet.x, player.feet.z, item) ||
        visitors.children.some(person => person.visible && overlapsCollider(person.position.x, person.position.z, item)) ||
        colliders.some(solid => solid.enabled && !moving?.colliders.includes(solid) && !solid.localize && solid.bottom < item.top && overlaps(item, solid)))) return false;
    if (!checkPaths) return true;
    const anchors = [...(seat ? [seat.approach] : []), [-3.02, 2.75], [-3.02, 3.55], [1.85, -2.69], [-4.23, 1.1], ...Array.from(seats).filter(([id]) => id !== moving?.slot.id).map(([,item]) => item.approach)];
    const disabled = moving?.colliders.filter(item => item.enabled) ?? [];
    disabled.forEach(item => { item.enabled = false; });
    try {
      return anchors.every(point => path([-1.72, 2.75], point, bounds));
    } finally {
      disabled.forEach(item => { item.enabled = true; });
    }
  }

  function buildDesk(slot) {
    const { x, z, id } = slot;
    floorShade(x, z, 1.48, 1.72);
    const angle = slot.angle ?? -Math.PI / 2;
    const desk = group(surfaces, x, 0, z, angle);
    desks.set(id, desk);
    layoutRevision++;
    box(desk, wood, 0, 0.765, 0, 1.58, 0.063, 0.91);
    box(desk, black, 0, 0.58, -0.31, 1.42, 0.095, 0.06);
    for (const side of [-0.69, 0.69]) {
      for (const depth of [-0.36, 0.36]) box(desk, black, side, 0.36, depth, 0.047, 0.72, 0.05);
      box(desk, black, side, 0.075, 0, 0.047, 0.045, 0.76);
    }
    const layout = deskLayout(slot);
    for (const item of layout.bounds) {
      if (item.top < 1) solid((item.minX + item.maxX) / 2, (item.minZ + item.maxZ) / 2,
        item.maxX - item.minX, item.maxZ - item.minZ, item.top);
    }
    chair(layout.seat.x, layout.seat.z, angle);
    seats.set(id, layout.seat);
    register(desk, { type: 'build', slot, label: () => `PC ${id} · Bilgisayar kur` });
  }

  function installFurniture(kind, slot) {
    const first = surfaces.children.length;
    const firstCollider = colliders.length;
    if (kind === 'desk') buildDesk(slot);
    else buildDecor(kind, slot);
    const pieces = surfaces.children.slice(first);
    const root = group(surfaces, slot.x, 0, slot.z);
    for (const piece of pieces) {
      piece.position.x -= slot.x;
      piece.position.z -= slot.z;
      root.add(piece);
    }
    const item = { kind, slot, root, colliders: colliders.slice(firstCollider), rug: kind === 'rug' ? rugs.at(-1) : null };
    root.userData.furniture = item;
    root.updateMatrixWorld(true);

    if (kind === 'desk') furnitureByDesk.set(slot.id,item);
    return item;
  }

  function moveFurniture(item, candidate, player) {
    if (!candidate || state.stations.find(station => station.id === item.slot.id)?.session ||
        !placementValid(candidate,player,true,item.kind,item)) return false;
    const previous = item.slot;
    const angle = candidate.angle - previous.angle;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    for (const collider of item.colliders) {
      const dx = (collider.minX + collider.maxX) / 2 - previous.x;
      const dz = (collider.minZ + collider.maxZ) / 2 - previous.z;
      const x = candidate.x + dx * cos + dz * sin;
      const z = candidate.z - dx * sin + dz * cos;
      const w = collider.maxX - collider.minX;
      const d = collider.maxZ - collider.minZ;
      const halfX = (Math.abs(cos) * w + Math.abs(sin) * d) / 2;
      const halfZ = (Math.abs(sin) * w + Math.abs(cos) * d) / 2;
      Object.assign(collider,{ minX:x-halfX,maxX:x+halfX,minZ:z-halfZ,maxZ:z+halfZ });
    }
    item.root.position.set(candidate.x,0,candidate.z);
    item.root.rotation.y += angle;
    Object.assign(previous,candidate);
    if (item.rug) Object.assign(item.rug,decorBounds(previous,item.kind));
    if (item.kind === 'desk') seats.set(previous.id,deskLayout(previous).seat);
    layoutRevision++;
    item.root.updateMatrixWorld(true);
    return true;
  }

  function buildStation(station, slot) {
    const desk = desks.get(station.id);
    const firstCollider = colliders.length;
    const display = monitor(desk, stationReady, -0.12, 1.05, -0.18, station.powered);
    displays.set(station.id, display);
    layoutRevision++;
    keyboardAndMouse(desk, -0.17, 0.801, 0.30);
    const tower = group(desk, 0.57, 0, 0);
    box(tower, plastic, 0, 0.984, -0.13, 0.23, 0.365, 0.33);
    box(tower, black, 0, 0.978, 0.038, 0.203, 0.336, 0.009);
    for (let i = 0; i < 7; i++) box(tower, keycap, 0, 0.85 + i * 0.017, 0.045, 0.16, 0.004, 0.004, false);
    const caseLed = box(tower, station.powered ? ledOn : black, 0.05, 1.116, 0.044, 0.023, 0.01, 0.003, false);
    display.caseLed = caseLed;
    for (const item of deskLayout(slot).bounds.filter(item => item.top >= 1.1)) {
      solid((item.minX + item.maxX) / 2, (item.minZ + item.maxZ) / 2,
        item.maxX - item.minX, item.maxZ - item.minZ, item.top, 0.797);
    }
    furnitureByDesk.get(station.id)?.colliders.push(...colliders.slice(firstCollider));
    delete desk.userData.interaction;
    register(tower, { type: 'station', station, label: () => station.powered
      ? 'Bilgisayarı kapat' : 'Bilgisayarı aç' });
  }

  state.stations.forEach((station, index) => {
    const z = -4.25 + index * 1.82;
    const slot = { id: station.id, x: 4.69, z };
    buildDesk(slot);
    buildStation(station, slot);

  });

  const pickup = group(surfaces, -4.91, 0, 6.13);
  box(pickup, aluminum, 0, 0.43, 0, 0.86, 0.85, 0.52);
  const parcel = group(pickup, 0, 0.87, 0);
  box(parcel, standard(0xb69569), 0, 0.15, 0, 0.61, 0.30, 0.42);
  box(parcel, standard(0xe2c49c), 0, 0.304, 0, 0.08, 0.008, 0.42);
  parcel.visible = false;
  sign(pickup, 0, 0.61, 0.266, 0.62, 0.17, (ctx, w, h) => {
    ctx.fillStyle = '#e5eaf3'; ctx.fillRect(0, 0, w, h);
    lettering(ctx, 'KARGO TESLİM', 75, 70, 129, '#293b56');
  });
  solid(-4.91, 6.13, 0.86, 0.52, 0.85);
  register(pickup, { type: 'pickup', label: () => parcel.visible ? 'Kargo paketini al' : 'Kargo teslim noktası' });

  floorShade(-3.35, -3.31, 3.05, 1.58);
  const counter = group(surfaces, -3.35, 0, -3.31);
  box(counter, aluminum, 0, 0.48, 0, 2.29, 0.96, 0.88);
  box(counter, wood, 0, 0.995, 0, 2.42, 0.071, 1.01);
  box(counter, plaster, 0, 0.50, 0.45, 2.24, 0.88, 0.028);
  box(counter, glow, 0, 0.91, 0.47, 2.18, 0.018, 0.025, false);
  box(counter, black, 0, 0.055, 0.01, 2.35, 0.105, 0.94);
  const deskScreen = group(counter, -0.4, 0, -0.105, Math.PI - 0.18);
  const officeDisplay = monitor(deskScreen, new THREE.MeshBasicMaterial({ map: texture(768, 432, () => {}) }), 0, 1.284, 0, false);
  box(counter, plastic, 0.78, 1.18, -0.09, 0.23, 0.30, 0.29);
  const officeLed = box(counter, black, 0.83, 1.20, -0.24, 0.024, 0.023, 0.01, false);
  keyboardAndMouse(deskScreen, 0, 1.035, 0.22);
  box(counter, standard(0x8093ad), 0.58, 1.044, 0.07, 0.28, 0.018, 0.19);
  cylinder(counter, standard(0xc7d1dd), 0.95, 1.09, -0.07, 0.054, 0.115);
  sign(counter, 0.04, 0.73, 0.472, 0.92, 0.224, (ctx, w, h) => {
    ctx.fillStyle = '#e7e9ed'; ctx.fillRect(0, 0, w, h);
    lettering(ctx, 'R E S E P S İ Y O N', 53, 105, 116, '#33465f');
  });
  solid(-3.35, -3.31, 2.42, 1.01, 1.03);
  solid(-3.75, -3.41, 0.63, 0.15, 1.51, 1.03);
  chair(-3.54, -4.27, Math.PI);
  register(counter, { type: 'office', label: () => 'Resepsiyona otur' });

  const batRack = group(surfaces, -5.435, 1.22, -2.42, Math.PI / 2);
  box(batRack, black, 0, 0, 0.02, 0.58, 0.79, 0.045);
  box(batRack, wood, 0, -0.38, 0.105, 0.58, 0.075, 0.21);
  for (const x of [-0.12, 0.12]) box(batRack, aluminum, x, 0.12, 0.086, 0.041, 0.06, 0.125);
  const rackedBat = group(batRack, 0, -0.016, 0.116);
  form(rackedBat, new THREE.CylinderGeometry(0.034, 0.018, 0.65, 12),
    standard(0x976442), 0, 0, 0, 1, 1, 1);
  cylinder(rackedBat, black, 0, -0.23, 0, 0.024, 0.16);
  register(batRack, {
    type: 'bat-rack',
    label: () => rackedBat.visible ? 'Sopayı al' : 'Sopayı rafa bırak',
    setEquipped(equipped) { rackedBat.visible = !equipped; },
  });

  const shelf = group(surfaces, -5.14, 0, -0.41, Math.PI / 2);
  for (const x of [-0.73, 0.73]) for (const z of [-0.25, 0.25]) {
    box(shelf, black, x, 1.06, z, 0.039, 2.12, 0.039);
  }
  const shelfColors = [standard(0x9da9b7), standard(0x78869a), standard(0xc7d3df), standard(0x343e4e)];
  for (let row = 0; row < 4; row++) {
    const y = 0.22 + row * 0.52;
    box(shelf, wood, 0, y, 0, 1.51, 0.045, 0.55);
    for (let item = 0; item < 7; item++) {
      const h = 0.12 + ((item + row * 2) % 5) * 0.036;
      box(shelf, shelfColors[(item + row) % shelfColors.length], -0.61 + item * 0.183, y + h / 2 + 0.026, -0.045, 0.11, h, 0.29);
    }
  }
  solid(-5.14, -0.41, 0.55, 1.52, 2.12);

  const posterWall = group(surfaces, -5.448, 1.77, 2.04, Math.PI / 2);
  box(posterWall, black, 0, 0, 0, 0.87, 1.14, 0.055);
  sign(posterWall, 0, 0, 0.029, 0.8, 1.07, (ctx, w, h) => {
    ctx.fillStyle = '#edf2fa'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#a6bce0'; ctx.beginPath(); ctx.arc(w / 2, h * 0.58, 230, 0, 2 * Math.PI); ctx.fill();
    ctx.strokeStyle = '#eef5ff'; ctx.lineWidth = 10;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath(); ctx.ellipse(w / 2, h * 0.58, 220, 38 + i * 38, -0.37, 0, 2 * Math.PI); ctx.stroke();
    }
    lettering(ctx, 'YSOL', 151, 76, 239, '#253952');
    lettering(ctx, 'İSTANBUL / 2026', 42, 81, 923, '#3a516f');
  });

  box(surfaces, fabric, -3.73, 0.007, 4.85, 1.36, 0.014, 0.84, false);
  const overhead = new THREE.HemisphereLight(0xeaf4ff, 0xb3b9c4, 1.55);
  scene.add(overhead);
  const daylight = new THREE.DirectionalLight(0xfff5e8, 1.8);
  daylight.position.set(-4.6, 5.8, 9);
  daylight.target.position.set(1.1, 0, -2.4);
  daylight.castShadow = true;
  daylight.shadow.mapSize.set(1536, 1536);
  Object.assign(daylight.shadow.camera, { left: -8.8, right: 8.8, top: 8.8, bottom: -8.8, near: 0.2, far: 27 });
  daylight.shadow.camera.updateProjectionMatrix();
  daylight.shadow.bias = -0.00035;
  daylight.shadow.normalBias = 0.023;
  daylight.shadow.intensity = 0.6;
  scene.add(daylight, daylight.target);

  for (const z of [-3.6, -0.35, 2.9]) {
    for (const x of [-2.7, 2.7]) {
      box(surfaces, aluminum, x, 3.186, z, 2.58, 0.086, 0.94);
      box(surfaces, glow, x, 3.135, z, 2.48, 0.025, 0.84, false);
    }
    const lamp = new THREE.PointLight(0xe8f1ff, 29, 9, 2);
    lamp.position.set(0, 3.04, z);
    scene.add(lamp);
  }

  function createVisitor(index = 0) {
    const person = group(visitors, 0, 0, 0);
    const coat = standard([0x3e4c65, 0x687073, 0x928377, 0x4d5764][index % 4]);
    const shirt = standard(0xc2b6a0);
    const jeans = standard(0x343e47);
    const shoe = standard(0x262621);
    const sole = standard(0x858071);
    const skin = standard([0xb98968, 0x936a54, 0xd3a78b, 0xac785b][index % 4]);
    const hair = standard(0x332b25);
    const shadow = form(person, unitPlane, contact, 0, 0.005, 0, 0.82, 0.88, 1, false);
    shadow.rotation.x = -Math.PI / 2;
    shadow.userData.ignoreRay = true;

    const hips = group(person, 0, 0.89, 0);
    form(hips, unitSphere, jeans, 0, 0.005, 0, 0.165, 0.122, 0.115, false);
    const torso = group(hips, 0, 0.05, 0);
    form(torso, unitSphere, coat, 0, 0.225, 0, 0.217, 0.266, 0.123, false);
    form(torso, unitSphere, shirt, 0, 0.322, 0.103, 0.065, 0.105, 0.028, false);
    form(torso, unitCylinder, skin, 0, 0.49, 0, 0.065, 0.10, 0.06, false);
    const head = group(torso, 0, 0.59, 0.013);
    form(head, unitSphere, skin, 0, 0.03, 0, 0.094, 0.126, 0.09, false);
    form(head, unitSphere, hair, 0, 0.097, -0.022, 0.098, 0.079, 0.084, false);
    form(head, unitSphere, skin, 0, 0.022, 0.089, 0.02, 0.023, 0.019, false);
    for (const side of [-1, 1]) {
      form(head, unitSphere, skin, side * 0.087, 0.026, -0.004, 0.018, 0.03, 0.018, false);
      form(head, unitSphere, hair, side * 0.037, 0.047, 0.081, 0.012, 0.006, 0.005, false);
    }

    const limbs = [-1, 1].map(side => {
      const thigh = group(hips, side * 0.088, -0.038, 0);
      form(thigh, unitSphere, jeans, 0, -0.194, 0, 0.082, 0.219, 0.091, false);
      const shin = group(thigh, 0, -0.384, 0);
      form(shin, unitSphere, jeans, 0, -0.166, 0, 0.062, 0.193, 0.065, false);
      form(shin, unitSphere, shoe, 0, -0.397, 0.045, 0.072, 0.054, 0.133, false);
      form(shin, unitSphere, sole, 0, -0.425, 0.052, 0.074, 0.025, 0.135, false);
      const arm = group(torso, side * 0.193, 0.374, 0);
      arm.rotation.z = side * 0.09;
      form(arm, unitSphere, coat, 0, -0.13, 0, 0.068, 0.168, 0.067, false);
      const forearm = group(arm, 0, -0.247, 0);
      form(forearm, unitSphere, coat, 0, -0.104, 0, 0.051, 0.135, 0.052, false);
      form(forearm, unitSphere, skin, 0, -0.227, 0, 0.043, 0.059, 0.034, false);
      return { side, thigh, shin, arm, forearm };
    });
    const collider = solid(0, 0, 0.34, 0.26, 1.68);
    collider.localize = (x, z) => [x - person.position.x, z - person.position.z];
    let motion = 0;
    let cycle = 0;
    return {
      position: person.position,
      object: person,
      get rotation() { return person.rotation.y; },
      set rotation(value) { person.rotation.y = value; },
      setVisible(visible) {
        person.visible = collider.enabled = visible;
      },
      pose(stride, sitting, playing, dt) {
        cycle += dt;
        motion = THREE.MathUtils.lerp(motion, stride, 1 - Math.exp(-16 * dt));
        collider.top = THREE.MathUtils.lerp(1.68, 1.31, sitting);
        hips.position.y = 0.88 - sitting * 0.33 + Math.abs(motion) * 0.022;
        torso.rotation.x = sitting * 0.26;
        head.rotation.y = playing ? Math.sin(cycle * 1.5) * 0.07 : 0;
        for (const { side, thigh, shin, arm, forearm } of limbs) {
          thigh.rotation.x = -sitting * 1.52 + side * motion * 0.41;
          shin.rotation.x = sitting * 1.48 + Math.max(0, -side * motion) * 0.38;
          arm.rotation.x = -sitting * 0.71 - side * motion * 0.27;
          forearm.rotation.x = -0.18 - sitting * 0.77 + (playing ? Math.sin(cycle * 9 + side) * 0.065 : 0);
        }
      },
    };
  }

  // Street-facing apartment. The interior is built at ground level, inside the facade.
  const homeWall = standard(0xe5dfd5);
  const homeTrim = standard(0x9a8271);
  const linen = standard(0xc7b7a9);
  const nightWindow = matte(0x758faf);
  const apartment = group(surfaces, 11.65, 0, 4.02);
  box(apartment, wood, 0, -0.061, 0, 7.62, 0.13, 8.42, false);
  box(apartment, homeWall, 0, 2.75, 0, 7.62, 0.16, 8.42, false);
  wall(7.88, 1.35, 4.02, 0.18, 2.7, 8.4, homeWall);
  wall(15.42, 1.35, 4.02, 0.18, 2.7, 8.4, homeWall);
  wall(11.65, 1.35, -0.10, 7.62, 2.7, 0.18, homeWall);
  wall(9.18, 1.35, 8.16, 2.62, 2.7, 0.18, homeWall);
  wall(13.64, 1.35, 8.16, 3.69, 2.7, 0.18, homeWall);
  wall(11.13, 2.55, 8.16, 1.27, 0.30, 0.18, homeWall);
  wall(10.10, 1.35, 2.98, 4.25, 2.7, 0.13, homeWall);
  wall(14.43, 1.35, 2.98, 1.84, 2.7, 0.13, homeWall);
  box(apartment, homeTrim, 0, 5.55, 0, 7.66, 5.55, 8.45, false);
  for (const y of [3.6, 5.3, 7.0]) {
    box(apartment, aluminum, 0, y - 0.44, 4.25, 7.7, 0.08, 0.14, false);
    for (const x of [-2.45, 0, 2.45]) {
      box(apartment, black, x, y, 4.249, 1.29, 1.02, 0.08, false);
      box(apartment, nightWindow, x, y, 4.298, 1.17, 0.89, 0.018, false);
      box(apartment, black, x, y, 4.32, 0.027, 0.91, 0.025, false);
    }
  }
  const aptDoor = group(surfaces, 11.13, 0, 8.16);
  box(aptDoor, black, 0, 1.14, 0, 1.27, 2.28, 0.12);
  box(aptDoor, wood, 0, 1.14, 0.072, 1.12, 2.18, 0.026);
  box(aptDoor, wood, 0, 1.14, -0.072, 1.12, 2.18, 0.026);
  for (const side of [-1, 1]) box(aptDoor, aluminum, 0.39, 1.04, side * 0.105, 0.15, 0.045, 0.065);
  sign(aptDoor, 0, 2.42, 0.106, 1.23, 0.28, (ctx, w, h) => {
    ctx.fillStyle = '#3d3432'; ctx.fillRect(0, 0, w, h);
    ctx.textAlign = 'center'; lettering(ctx, 'YSOL APARTMANI · 01', 54, w / 2, 109, '#fff3e7');
  });
  solid(11.13, 8.16, 1.30, 0.16, 2.28);
  register(aptDoor, { type: 'home-door', label: () => 'Apartman · Daire 1' });

  function furniture(material, x, y, z, w, h, d) {
    box(surfaces, material, x, y, z, w, h, d);
    solid(x, z, w, d, y + h / 2, y - h / 2);
  }
  const apartmentGlass = standard(0x9eb9c9, 0.42);
  for (const x of [8.98, 13.63]) {
    box(surfaces, black, x, 1.54, 8.038, 1.55, 1.18, 0.06);
    box(surfaces, apartmentGlass, x, 1.54, 7.999, 1.42, 1.06, 0.018);
    box(surfaces, aluminum, x, 1.54, 7.984, 0.03, 1.08, 0.022);
    box(surfaces, black, x, 1.54, 8.27, 1.55, 1.18, 0.06);
    box(surfaces, apartmentGlass, x, 1.54, 8.31, 1.42, 1.06, 0.018);
  }
  const sofa = standard(0x819190);
  const couch = group(surfaces, 8.49, 0, 5.52);
  box(couch, sofa, 0, 0.31, 0, 0.84, 0.62, 2.12);
  box(couch, sofa, -0.36, 0.70, 0, 0.20, 0.58, 2.12);
  solid(8.49, 5.52, 0.84, 2.12, 0.91);
  register(couch, { type: 'sofa', label: () => 'Koltuğa otur' });
  for (const z of [-1, 1]) box(couch, linen, -0.03, 0.55, z, 0.75, 0.34, 0.16);
  box(surfaces, linen, 9.77, 0.009, 5.54, 1.59, 0.015, 2.62, false);
  furniture(wood, 9.72, 0.35, 5.55, 0.70, 0.09, 1.05);
  for (const z of [5.18, 5.92]) cylinder(surfaces, black, 9.72, 0.16, z, 0.075, 0.32);
  furniture(homeTrim, 14.90, 0.47, 5.43, 0.61, 0.94, 2.42);
  box(surfaces, plaster, 14.90, 0.965, 5.43, 0.64, 0.055, 2.43);
  box(surfaces, black, 14.90, 0.996, 5.69, 0.38, 0.018, 0.43);
  box(surfaces, aluminum, 14.90, 1.00, 4.95, 0.39, 0.028, 0.41);
  cylinder(surfaces, black, 15.12, 1.08, 4.95, 0.024, 0.19);
  for (const z of [4.75, 5.42, 6.09]) box(surfaces, aluminum, 15.06, 1.98, z, 0.46, 0.56, 0.62);

  const tv = group(surfaces, 11.77, 0, 5.52, -Math.PI / 2);
  box(tv, wood, 0, 0.38, 0, 1.85, 0.46, 0.36);
  solid(11.77, 5.52, 0.40, 1.85, 0.62);
  solid(11.77, 5.52, 0.13, 1.70, 1.62, 0.64);
  box(tv, black, 0, 0.64, 0, 0.73, 0.045, 0.22);
  box(tv, black, 0, 1.14, 0, 1.68, 0.96, 0.075);
  const tvTexture = texture(480, 270, (ctx,w,h) => drawChannel(ctx,0,0,w,h));
  const tvPicture = new THREE.MeshBasicMaterial({ map: tvTexture, toneMapped: false });
  const tvScreen = form(tv, unitPlane, screenOff, 0, 1.14, 0.039, 1.60, 0.90, 1, false);
  let tvFrame = -1;

  const surfacesWithCoffee = new Map();
  const coffeeMachines = [];
  const coffeeLiquid = standard(0x3d2114, 0.30);
  const mugMaterial = standard(0xe6d7c6);
  function coffeeMug(parent, x, y, z) {
    const mug = group(parent, x, y, z);
    cylinder(mug, mugMaterial, 0, 0.052, 0, 0.042, 0.104);
    cylinder(mug, coffeeLiquid, 0, 0.105, 0, 0.035, 0.005);
    const handle = form(mug, new THREE.TorusGeometry(0.026, 0.008, 8, 14), mugMaterial, 0.042, 0.058, 0, 1, 1, 1, false);
    handle.rotation.y = 0;
    return mug;
  }
  function coffeeSurface(x,y,z,key,w,d) {
    const top = group(surfaces,x,y,z);
    box(top, wood, 0, -0.024, 0, w, 0.047, d, false);
    const mug = coffeeMug(top,0,0,0);
    mug.visible = false;
    const surface = { type:'coffee-table', key, full:false, label: () => surface.full ? 'Kahveyi al' : 'Kahveyi masaya koy' };
    register(top,surface);
    surfacesWithCoffee.set(key,{ mug,surface });
  }
  function coffeeMachine(x,y,z,angle) {
    const machine = group(surfaces,x,y,z,angle);
    box(machine, black, 0, 0.17, -0.035, 0.30, 0.34, 0.26);
    box(machine, aluminum, 0, 0.042, 0.047, 0.29, 0.074, 0.31);
    box(machine, aluminum, 0, 0.261, 0.088, 0.24, 0.13, 0.14);
    cylinder(machine, black, 0, 0.204, 0.111, 0.043, 0.034);
    const indicator = box(machine, black, 0.065, 0.274, 0.165, 0.032, 0.018, 0.007);
    const brewingLight = matte(0xf9ad53);
    const mug = coffeeMug(machine, 0, 0.079, 0.111);
    mug.visible = false;
    const coffeeMachine = {
      type: 'coffee-machine',
      remaining: 0,
      ready: false,
      label: () => coffeeMachine.ready ? 'Kahveyi al'
        : coffeeMachine.remaining > 0 ? `Kahve hazırlanıyor · ${Math.ceil(coffeeMachine.remaining)} sn` : 'Kahve hazırla',
      start() {
        coffeeMachine.remaining = 8;
        indicator.material = brewingLight;
      },
      take() {
        coffeeMachine.ready = false;
        mug.visible = false;
        indicator.material = black;
      },
      update(dt) {
        if (coffeeMachine.remaining <= 0) return;
        coffeeMachine.remaining = Math.max(0, coffeeMachine.remaining - dt);
        if (coffeeMachine.remaining > 0) return;
        coffeeMachine.ready = true;
        mug.visible = true;
        indicator.material = ledOn;
      },
    };
    coffeeMachines.push(coffeeMachine);
    register(machine, coffeeMachine);
  }
  coffeeMachine(-2.53,1.035,-3.26,0);
  coffeeMachine(14.89,0.996,6.26,-Math.PI/2);
  coffeeSurface(-4.10,1.037,-3.02,'cafe',0.31,0.22);
  coffeeSurface(9.72,0.398,5.55,'home',0.69,1.04);

  const fridge = group(surfaces, 14.87, 0, 7.18, -Math.PI / 2);
  box(fridge, aluminum, 0, 0.91, -0.12, 0.71, 1.82, 0.43);
  box(fridge, plaster, 0, 0.91, 0.10, 0.63, 1.68, 0.027);
  const food = [];
  const ceramic = standard(0xe8e8e3,0.34);
  const rice = standard(0xe8d6a6);
  const greens = [standard(0x678445),standard(0x8da855),standard(0xbb553c),standard(0xb67c47)];
  for (const y of [0.46, 0.92, 1.34]) {
    box(fridge, plaster, 0, y, 0.17, 0.63, 0.036, 0.20);
    const meal = group(fridge,0.04,y+0.025,0.17);
    cylinder(meal, ceramic, 0, .017, 0, .112, .034, .075);
    cylinder(meal, rice, 0, .038, 0, .097, .014, .065);
    for (let i=0;i<13;i++) {
      const dx=Math.sin(i*2.44)*(.024+i*.004);
      const dz=Math.cos(i*2.44)*(.017+i*.002);
      const piece=form(meal,unitSphere,greens[i%4],dx,.052,dz,.017,.011,.013,false);
      piece.rotation.y=i*1.4;
    }
    register(meal,{type:'food',label:()=>state.food ? `Yemek ye · ${state.food} porsiyon` : 'Yemek kalmadı'});
    food.push(meal);
  }
  const fridgeDoor = group(fridge, -0.35, 0, 0.28);
  box(fridgeDoor, aluminum, 0.35, 0.91, 0, 0.70, 1.81, 0.062);
  box(fridgeDoor, black, 0.63, 1.06, 0.057, 0.035, 0.24, 0.048);
  solid(14.87, 7.18, 0.71, 0.74, 1.82);
  let fridgeOpen = false;
  register(fridge, { type: 'fridge', label: () => fridgeOpen ? 'Buzdolabını kapat' : 'Buzdolabını aç',
    activate() {
      fridgeOpen = !fridgeOpen;
      return fridgeOpen;
    },
  });

  const bed = group(surfaces, 9.43, 0, 1.35);
  box(bed, homeTrim, 0, 0.23, 0, 1.60, 0.34, 2.30);
  box(bed, homeTrim, 0, 0.64, -1.07, 1.65, 0.86, 0.13);
  box(bed, plaster, 0, 0.49, 0, 1.54, 0.25, 2.19);
  box(bed, sofa, 0, 0.62, 0.31, 1.55, 0.04, 1.58);
  for (const x of [-0.37, 0.37]) form(bed, unitSphere, linen, x, 0.64, -0.75, 0.30, 0.10, 0.20);
  solid(9.43, 1.35, 1.62, 2.31, 0.62);
  register(bed, { type: 'bed', label: () => state.canSleep ? 'Uyu' : 'Uyku · 21.00 sonrası' });
  furniture(homeTrim, 11.02, 0.23, 0.65, 0.54, 0.46, 0.55);
  cylinder(surfaces, glow, 11.02, 0.65, 0.65, 0.125, 0.25);

  const homeLamps = [];
  for (const [x, z] of [[9.35, 5.5], [13.8, 5.4], [10.7, 1.6]]) {
    const fixture = cylinder(surfaces, glow, x, 2.56, z, 0.19, 0.09);
    const lamp = new THREE.PointLight(0xffe7c7, 19, 7, 2);
    lamp.position.set(x, 2.41, z);
    scene.add(lamp);
    homeLamps.push({lamp,fixture});
  }

  const switchPlate = group(surfaces, 11.94, 1.28, 7.995);
  box(switchPlate, aluminum, 0,0,0,0.15,0.19,0.042);
  box(switchPlate, black, 0,0,-0.031,0.051,0.071,0.024);
  register(switchPlate,{type:'home-light',label:()=>state.homeLights?'Ev ışıklarını kapat':'Ev ışıklarını aç'});
  const raycaster = new THREE.Raycaster();
  raycaster.far = 2.6;
  const center = new THREE.Vector2();
  const hits = [];
  return {
    colliders,
    buildDesk, buildStation, path, placementValid, coffeeMug,
    renameCafe() {
      const map = cafeSign.material.map;
      drawCafeSign(map.image.getContext('2d'), map.image.width, map.image.height);
      map.needsUpdate = true;
      for (const material of [stationReady, stationWarning]) {
        const screen = material.map;
        drawStationScreen(screen.image.getContext('2d'), screen.image.width, screen.image.height,
          state.cafeName, material === stationWarning);
        screen.needsUpdate = true;
      }
    },
    get ownedCar() { return ownCar; },
    snapshot() {
      return {
        doorOpen, fridgeOpen,
        parkedCar: ownCar ? [ownCar.car.position.x, ownCar.car.position.z, ownCar.car.rotation.y] : null,
        tables: [...surfacesWithCoffee].filter(([, item]) => item.surface.full).map(([key]) => key),
        coffeeMachines: coffeeMachines.map(({ remaining, ready }) => ({ remaining, ready })),
      };
    },
    restore(save, batEquipped) {
      doorOpen = save.doorOpen;
      fridgeOpen = save.fridgeOpen;
      rackedBat.visible = !batEquipped;
      if (ownCar && save.parkedCar) ownCar.move(...save.parkedCar);
      for (const key of save.tables) this.setCoffee(key, true);
      save.coffeeMachines.forEach(({ remaining, ready }, index) => {
        if (remaining <= 0 && !ready) return;
        coffeeMachines[index].start();
        coffeeMachines[index].update(8 - remaining);
      });
      this.renameCafe();
      this.syncBusiness();
      state.stations.forEach(station => this.syncStation(station));
    },
    setCoffee(key, full) {
      const item = surfacesWithCoffee.get(key);
      item.mug.visible = item.surface.full = full;
    },
    updateTV(channel, time) {
      tvScreen.material = state.tvOn ? tvPicture : screenOff;
      const frame = Math.floor(time * 18);
      if (!state.tvOn || frame === tvFrame) return;
      tvFrame = frame;
      drawChannel(tvTexture.image.getContext('2d'), channel, time, 480, 270);
      tvTexture.needsUpdate = true;
    },
    get layoutRevision() { return layoutRevision; },
    installFurniture, moveFurniture,
    deliverCar(player) {
      if (ownCar) return true;
      if (player && Math.abs(player.feet.x - 2.65) < 1.95 && Math.abs(player.feet.z - 10.86) < 1.05) return false;
      const { car, collider } = parkedCar(2.65,10.86,0x2765a4);
      const halfLength = 1.675;
      const halfWidth = 0.79;
      // Walking collisions follow the parked car's local axes after a turn.
      Object.assign(collider, {
        minX: -halfLength, maxX: halfLength, minZ: -halfWidth, maxZ: halfWidth,
        localize(x, z) {
          const dx = x - car.position.x;
          const dz = z - car.position.z;
          const c = Math.cos(car.rotation.y);
          const s = Math.sin(car.rotation.y);
          return [dx * c - dz * s, dx * s + dz * c];
        },
      });
      ownCar = {
        type: 'owned-car',
        label: () => 'YSOL GT · Arabaya bin',
        car,
        move(x, z, yaw) {
          const c = Math.cos(yaw);
          const s = Math.sin(yaw);
          const extentX = Math.abs(c) * halfLength + Math.abs(s) * halfWidth;
          const extentZ = Math.abs(s) * halfLength + Math.abs(c) * halfWidth;
          const blocked = colliders.some(item => {
            if (!item.enabled || item.localize || item.bottom >= 1 || item.top < 0.17) return false;
            const rx = (item.maxX - item.minX) / 2;
            const rz = (item.maxZ - item.minZ) / 2;
            const dx = (item.minX + item.maxX) / 2 - x;
            const dz = (item.minZ + item.maxZ) / 2 - z;
            return Math.abs(dx) < rx + extentX && Math.abs(dz) < rz + extentZ &&
              Math.abs(dx * c - dz * s) < halfLength + rx * Math.abs(c) + rz * Math.abs(s) &&
              Math.abs(dx * s + dz * c) < halfWidth + rx * Math.abs(s) + rz * Math.abs(c);
          });
          if (blocked) return false;
          car.position.set(x, 0, z);
          car.rotation.y = yaw;
          car.updateMatrixWorld(true);
          return true;
        },
      };
      register(car, ownCar);
      return true;
    },
    previewDesk(camera, player, angle, kind = 'desk', moving = null) {
      ghost.visible = false;
      for (const marker of decorGhosts.values()) marker.visible = false;
      if (!camera) return null;
      camera.updateMatrixWorld();
      raycaster.setFromCamera(center, camera);
      const direction = raycaster.ray.direction;
      const distance = -camera.position.y / direction.y;
      if (direction.y >= -0.04 || distance > 4.2) return null;
      const position = raycaster.ray.at(distance, new THREE.Vector3());
      const slot = { x: Math.round(position.x * 10) / 10, z: Math.round(position.z * 10) / 10, angle };
      const marker = kind === 'desk' ? ghost : decorGhosts.get(kind);
      marker.position.set(slot.x, 0, slot.z);
      marker.rotation.y = angle;
      marker.visible = true;
      ghostMaterial.color.set(placementValid(slot, player, false, kind, moving) ? 0x4889e6 : 0xe54d60);
      return slot;
    },
    syncBusiness() {
      doorSign.material = innerPlaque.material = state.open ? openPlaque : closedPlaque;
    },
    showPackages(available) { parcel.visible = available; },
    powerOffice(on, page = null) {
      if (page) {
        const map = officeDisplay.active.map;
        const ctx = map.image.getContext('2d');
        ctx.fillStyle = '#dbe7fb'; ctx.fillRect(0, 0, 768, 432);
        ctx.fillStyle = '#f7faff'; ctx.fillRect(0, 0, 768, 43);
        lettering(ctx, 'YSOL OS', 23, 22, 31, '#263852');
        lettering(ctx, page.title, 53, 36, 112, '#1b3051');
        page.rows.slice(0, 5).forEach((line, index) => {
          ctx.fillStyle = '#f7faff'; ctx.fillRect(36, 142 + index * 51, 696, 40);
          lettering(ctx, line, 23, 51, 170 + index * 51, '#293e5d');
        });
        map.needsUpdate = true;
      }
      officeDisplay.screen.material = on ? officeDisplay.active : screenOff;
      officeDisplay.led.material = officeLed.material = on ? ledOn : black;
    },
    strikeTarget(camera) {
      camera.updateMatrixWorld();
      raycaster.setFromCamera(center, camera);
      const obstacles = raycaster.intersectObject(surfaces, true);
      const obstacle = obstacles.find(hit => !hit.object.userData.ignoreRay);
      let closest = null;
      let distance = Math.min(1.8, obstacle?.distance ?? Infinity);
      for (const person of visitors.children) {
        if (!person.visible) continue;
        const hit = raycaster.intersectObject(person, true).find(entry => !entry.object.userData.ignoreRay);
        if (hit && hit.distance < distance) {
          closest = person;
          distance = hit.distance;
        }
      }
      return closest;
    },
    setNight(night) {
      daylight.intensity = night ? 0.23 : 1.8;
      overhead.intensity = night ? 0.63 : 1.55;
      nightWindow.color.set(night ? 0xf4cf9d : 0x758faf);
    },
    createVisitor,
    getSeat: id => seats.get(id),
    door: {
      get opening() { return doorOpen || visitorHoldingDoor; },
      hold(held) { visitorHoldingDoor = held; },
      get passable() { return doorAngle < -1.43; },
    },
    findTarget(camera) {
      camera.updateMatrixWorld();
      raycaster.setFromCamera(center, camera);
      hits.length = 0;
      raycaster.intersectObject(surfaces, true, hits);
      const hit = hits.find(entry => {
        for (let node = entry.object; node; node = node.parent) {
          if (!node.visible || node.userData.ignoreRay) return false;
        }
        return true;
      });
      let interaction = null;
      for (let object = hit?.object; object; object = object.parent) {
        interaction ??= object.userData.interaction;
        if (object.userData.furniture) return { ...interaction, furniture: object.userData.furniture };
      }
      return interaction ?? null;
    },
    syncStation(station) {
      const { screen, led, caseLed, active } = displays.get(station.id);
      if (!station.powered) screen.material = screenOff;
      else if (station.session?.misconduct) screen.material = stationWarning;
      else screen.material = station.session?.status === 'Kullanımda' ? stationGame : active;
      led.material = caseLed.material = station.powered ? ledOn : black;
    },
    update(dt, player) {
      updateStationGame(dt);
      for (const machine of coffeeMachines) machine.update(dt);
      homeLamps.forEach(({lamp,fixture}) => {
        lamp.visible = state.homeLights;
        fixture.material = state.homeLights ? glow : aluminum;
      });
      food.forEach((meal,index) => { meal.visible = fridgeOpen && index < state.food; });
      fridgeDoor.rotation.y = THREE.MathUtils.lerp(fridgeDoor.rotation.y, fridgeOpen ? -Math.PI * 0.57 : 0, 1 - Math.exp(-10 * dt));
      const target = doorOpen || visitorHoldingDoor ? -Math.PI / 2 : 0;
      if (doorAngle === target) return false;
      const previousAngle = doorAngle;
      doorAngle = THREE.MathUtils.lerp(doorAngle, target, 1 - Math.exp(-9 * dt));
      if (Math.abs(doorAngle - target) < 0.004) doorAngle = target;
      if (overlapsCollider(player.feet.x, player.feet.z, doorCollider)) {
        doorAngle = previousAngle;
        return false;
      }
      door.rotation.y = doorAngle;
      door.updateMatrixWorld(true);
      return true;
    },
  };
}
