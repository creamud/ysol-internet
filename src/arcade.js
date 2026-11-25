const vectors = { ArrowUp: [0,-1], ArrowDown: [0,1], ArrowLeft: [-1,0], ArrowRight: [1,0] };
const same = (a,b) => a[0] === b[0] && a[1] === b[1];
const maze = [
  '#################',
  '#o......#......o#',
  '#.###.#.#.#.###.#',
  '#.....#...#.....#',
  '###.#.##.##.#.###',
  '#...#.......#...#',
  '#.#.#.#####.#.#.#',
  '#.#...........#.#',
  '#.###.#####.###.#',
  '#...............#',
  '#o###.#.#.#.###o#',
  '#################',
];

export function createArcade(kind, canvas, status, rng = Math.random) {
  const ctx = canvas.getContext('2d');
  const snake = kind === 'snake';
  const width = snake ? 20 : maze[0].length;
  const height = snake ? 12 : maze.length;
  const tile = 22;
  canvas.width = width * tile;
  canvas.height = height * tile;
  const walkable = (x,y) => x >= 0 && y >= 0 && x < width && y < height && (snake || maze[y][x] !== '#');
  let segments, pellets, ghosts, direction, next, time, total, powered, score, done;
  function makeFood() {
    const empty = [];
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      if (!segments.some(piece => same(piece,[x,y]))) empty.push([x,y]);
    }
    if (!empty.length) return false;
    const [x,y] = empty[Math.floor(rng() * empty.length)];
    pellets.set(y * width + x, '.');
    return true;
  }
  function reset() {
    segments = snake ? [[6,6],[5,6],[4,6]] : [[8,7]];
    pellets = new Map();
    ghosts = snake ? [] : [{ pos:[8,3], home:[8,3], color:'#ff536c' }, { pos:[13,9], home:[13,9], color:'#44dcff' }];
    direction = next = snake ? vectors.ArrowRight : [0,0];
    time = total = powered = score = 0;
    done = '';
    if (snake) makeFood();
    else for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const cell = maze[y][x];
      if (cell !== '#' && !same([x,y], segments[0])) pellets.set(y * width + x, cell);
    }
    draw();
  }
  function encounter() {
    for (const ghost of ghosts) if (same(ghost.pos, segments[0])) {
      if (powered) {
        score += 100;
        ghost.pos = ghost.home;
      } else done = 'Hayalet yakaladı';
    }
  }
  function tick() {
    const [x,y] = segments[0];
    const desired = [x + next[0], y + next[1]];
    if (snake || walkable(...desired)) direction = next;
    const head = [x + direction[0], y + direction[1]];
    if (snake) {
      const eats = pellets.has(head[1] * width + head[0]);
      const body = eats ? segments : segments.slice(0,-1);
      if (!walkable(...head) || body.some(piece => same(piece,head))) { done = 'Oyun bitti'; return; }
      segments.unshift(head);
      if (!eats) segments.pop();
      else {
        pellets.clear();
        score++;
        if (!makeFood()) done = 'Kazandın';
      }
      return;
    }
    if (walkable(...head)) segments[0] = head;
    const key = segments[0][1] * width + segments[0][0];
    const pellet = pellets.get(key);
    if (pellet) {
      pellets.delete(key);
      score += pellet === 'o' ? 50 : 10;
      if (pellet === 'o') powered = 29;
    }
    if (powered) powered--;
    encounter();
    if (done) return;
    if (++total % 2 === 0) {
      for (const ghost of ghosts) {
        const [gx,gy] = ghost.pos;
        const options = Object.values(vectors).map(([dx,dy]) => [gx+dx,gy+dy]).filter(point => walkable(...point));
        const distance = point => Math.abs(point[0]-segments[0][0]) + Math.abs(point[1]-segments[0][1]);
        options.sort((a,b) => (distance(a)-distance(b)) * (powered ? -1 : 1));
        if (options.length) ghost.pos = rng() < 0.22 ? options[Math.floor(rng()*options.length)] : options[0];
      }
      encounter();
    }
    if (!done && !pellets.size) done = 'Kazandın';
  }
  function circle(x,y,r,color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc((x + 0.5) * tile, (y + 0.5) * tile, r, 0, Math.PI*2);
    ctx.fill();
  }
  function draw() {
    ctx.fillStyle = snake ? '#102b26' : '#101530';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    if (!snake) for (let y=0;y<height;y++) for (let x=0;x<width;x++) if (maze[y][x] === '#') {
      ctx.fillStyle = '#374c9c';
      ctx.fillRect(x*tile+1,y*tile+1,tile-2,tile-2);
    }
    for (const [key,type] of pellets) circle(key%width,Math.floor(key/width),snake ? 6 : type==='o' ? 5 : 2,snake ? '#ff6a66' : '#f8d9a4');
    if (snake) segments.forEach(([x,y],index) => {
      ctx.fillStyle = index ? '#63c68e' : '#a1f6ac';
      ctx.fillRect(x*tile+2,y*tile+2,tile-4,tile-4);
    });
    else {
      const [x,y] = segments[0];
      const angle = Math.atan2(direction[1], direction[0]);
      const bite = total % 2 ? .22 : .52;
      ctx.fillStyle = '#ffe45a';
      ctx.beginPath();
      ctx.moveTo((x+.5)*tile,(y+.5)*tile);
      ctx.arc((x+.5)*tile,(y+.5)*tile,9,angle+bite,angle+Math.PI*2-bite);
      ctx.fill();
      ghosts.forEach(({pos,color}) => circle(...pos,8,powered ? '#638bf4' : color));
    }
    status.textContent = done ? `${done} · Puan ${score} · Yeniden başlat` : `Puan ${score} · Ok tuşları`;
  }
  reset();
  return {
    reset,
    key(code) {
      const move = vectors[code];
      if (!move) return false;
      if (!snake || move[0] !== -direction[0] || move[1] !== -direction[1]) next = move;
      return true;
    },
    update(dt) {
      if (done || (!snake && !next[0] && !next[1])) return;
      time += dt;
      if (time >= 0.14) {
        time -= 0.14;
        tick();
        draw();
      }
    },
  };
}
