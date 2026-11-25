import * as THREE from '../vendor/three.module.js';

export function texture(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return map;
}

export function randomGenerator(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

export function floorMaterial() {
  const map = texture(512, 512, (ctx, w, h) => {
    const random = randomGenerator(87);
    ctx.fillStyle = '#b5bbc1';
    ctx.fillRect(0, 0, w, h);
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        ctx.fillStyle = ['#c4c9ce', '#bfc5cb', '#c1c7cd', '#c8cdd2'][Math.floor(random() * 4)];
        ctx.fillRect(col * 128 + 1, row * 128 + 1, 126, 126);
      }
    }
    for (let i = 0; i < 11000; i++) {
      ctx.fillStyle = i % 2 ? '#6c758218' : '#f5f8ff2b';
      ctx.fillRect(random() * w, random() * h, random() * 3 + 1, 1);
    }
  });
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(4, 4);
  return new THREE.MeshStandardMaterial({ map, roughness: 0.86 });
}

export function woodMaterial() {
  const map = texture(512, 256, (ctx, w, h) => {
    const random = randomGenerator(731);
    ctx.fillStyle = '#cfb897';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 680; i++) {
      ctx.strokeStyle = i % 2 ? '#87664723' : '#fff1d345';
      ctx.lineWidth = 0.3 + random() * 1.2;
      const y = random() * h;
      ctx.beginPath();
      ctx.moveTo(-5, y);
      ctx.bezierCurveTo(w * 0.35, y - random() * 6, w * 0.68, y + random() * 7, w + 5, y);
      ctx.stroke();
    }
  });
  return new THREE.MeshStandardMaterial({ map, roughness: 0.62 });
}
