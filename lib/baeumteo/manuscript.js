// 외솔 배움터 — 잃어버린 원고 (기획서 §8-3)
//
// 탑뷰 타일맵 위에서 형사의 부채꼴 시야를 피해 원고 상자를 모아 출구로 간다.
// 여기는 판(세계)을 짜고 한 틱을 셈하는 자리다. 그리기와 손은 컴포넌트가 맡는다.
//
// 좌표는 전부 타일 단위다(한 칸 = 1). 화면 크기는 여기서 모른다.
// 판은 초당 예순 번 바뀌므로 복사하지 않고 그 자리에서 고친다.

const WALL = '#';

// 사람 반지름. 칸의 반보다 작아야 한 칸 폭 길을 지나간다
const BODY = 0.3;

// ── 지도 ────────────────────────────────────────────────────────

/** 문자 지도를 벽·출발·출구·상자로 푼다 */
export function parseStage(stage) {
  const rows = stage.map;
  const h = rows.length;
  const w = rows[0].length;
  const walls = rows.map((row) => [...row].map((c) => c === WALL));

  let start = null;
  let exit = null;
  const boxes = [];
  rows.forEach((row, y) => {
    [...row].forEach((c, x) => {
      if (c === 'S') start = { x: x + 0.5, y: y + 0.5 };
      if (c === 'E') exit = { x: x + 0.5, y: y + 0.5 };
      if (c === 'B') boxes.push({ x: x + 0.5, y: y + 0.5 });
    });
  });

  return { id: stage.id, name: stage.name, brief: stage.brief, w, h, walls, start, exit, boxes, guards: stage.guards };
}

/** 그 자리가 벽인가. 지도 밖도 벽이다 */
export function isWall(stage, x, y) {
  const tx = Math.floor(x);
  const ty = Math.floor(y);
  if (ty < 0 || ty >= stage.h || tx < 0 || tx >= stage.w) return true;
  return stage.walls[ty][tx];
}

/** 몸통 네 귀가 다 길인가 */
function free(stage, x, y) {
  return (
    !isWall(stage, x - BODY, y - BODY) &&
    !isWall(stage, x + BODY, y - BODY) &&
    !isWall(stage, x - BODY, y + BODY) &&
    !isWall(stage, x + BODY, y + BODY)
  );
}

/** 두 점 사이에 벽이 없는가 (0.15칸마다 짚어 본다) */
function lineClear(stage, x0, y0, x1, y1) {
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 0.15);
  for (let i = 1; i <= n; i += 1) {
    const t = i / n;
    if (isWall(stage, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return false;
  }
  return true;
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** -π..π 로 접은 각 차이 */
function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** 짧은 쪽으로 최대 max 만큼 돈다 */
function turnToward(angle, want, max) {
  const d = angleDiff(want, angle);
  if (Math.abs(d) <= max) return want;
  return angle + Math.sign(d) * max;
}

// ── 판 짜기 ─────────────────────────────────────────────────────

function makeGuard(def) {
  const path = def.path.map(([x, y]) => ({ x: x + 0.5, y: y + 0.5 }));
  const first = path[0];
  const next = path[1] || path[0];
  return {
    x: first.x,
    y: first.y,
    path,
    to: path.length > 1 ? 1 : 0, // 다음 목표 자리
    step: 1, // 끝에 닿으면 되돌아온다
    angle: Math.atan2(next.y - first.y, next.x - first.x),
    pause: 0,
    sees: false,
  };
}

/** 한 스테이지의 새 판 */
export function makeWorld(config, stageIndex) {
  const stage = parseStage(config.stages[stageIndex]);
  return {
    stageIndex,
    stage,
    player: { x: stage.start.x, y: stage.start.y, face: 0 },
    boxes: stage.boxes.map((b) => ({ ...b, taken: false })),
    order: [], // 주운 차례. 잡히면 마지막 것을 놓고 온다
    guards: stage.guards.map(makeGuard),
    seen: 0, // 시야에 든 시간(ms). 벗어나면 줄어든다
    elapsed: 0,
    caught: 0,
    exitArmed: true, // 출구 위에 서 있는 동안 두 번 묻지 않게
  };
}

/** 들고 있는 상자 수 */
export function held(world) {
  return world.order.length;
}

// ── 한 틱 ───────────────────────────────────────────────────────

function movePlayer(world, config, input, dt) {
  let { dx, dy } = input;
  if (!dx && !dy) return;
  const len = Math.hypot(dx, dy);
  dx /= len;
  dy /= len;

  const p = world.player;
  const s = config.player_speed * dt;
  p.face = Math.atan2(dy, dx);

  // 가로·세로를 따로 밀어야 벽을 따라 미끄러진다
  const nx = p.x + dx * s;
  if (free(world.stage, nx, p.y)) p.x = nx;
  const ny = p.y + dy * s;
  if (free(world.stage, p.x, ny)) p.y = ny;
}

function moveGuard(g, config, dt) {
  const target = g.path[g.to];
  // 서 있는 동안에도 다음 갈 곳으로 몸을 돌린다. 그래서 시야가 휙 도는 순간이 보인다
  if (dist(g, target) > 0.001) {
    const want = Math.atan2(target.y - g.y, target.x - g.x);
    g.angle = turnToward(g.angle, want, ((config.guard_turn_deg * Math.PI) / 180) * dt);
  }

  if (g.pause > 0) {
    g.pause -= dt * 1000;
    return;
  }
  if (g.path.length < 2) return;

  const d = dist(g, target);
  const s = config.guard_speed * dt;
  if (d <= s) {
    g.x = target.x;
    g.y = target.y;
    let next = g.to + g.step;
    if (next >= g.path.length || next < 0) {
      g.step = -g.step;
      next = g.to + g.step;
    }
    g.to = next;
    g.pause = config.guard_pause_ms;
  } else {
    g.x += ((target.x - g.x) / d) * s;
    g.y += ((target.y - g.y) / d) * s;
  }
}

/** 형사가 그 자리를 보는가 (거리·각도·벽) */
export function canSee(g, p, stage, config) {
  const dx = p.x - g.x;
  const dy = p.y - g.y;
  const d = Math.hypot(dx, dy);
  if (d > config.fov_range) return false;
  const half = ((config.fov_deg * Math.PI) / 180) / 2;
  if (Math.abs(angleDiff(Math.atan2(dy, dx), g.angle)) > half) return false;
  return lineClear(stage, g.x, g.y, p.x, p.y);
}

/**
 * 판을 dtMs 만큼 돌린다.
 * @param {{dx:number, dy:number}} input 손이 미는 방향
 * @returns {'box'|'caught'|'exit'|null} 이번 틱에 일어난 일
 */
export function step(world, config, input, dtMs) {
  const dt = dtMs / 1000;
  world.elapsed += dtMs;

  movePlayer(world, config, input, dt);
  for (const g of world.guards) moveGuard(g, config, dt);

  const p = world.player;
  let event = null;

  world.boxes.forEach((b, i) => {
    if (!b.taken && dist(p, b) < 0.55) {
      b.taken = true;
      world.order.push(i);
      event = 'box';
    }
  });

  let seen = false;
  for (const g of world.guards) {
    g.sees = canSee(g, p, world.stage, config);
    if (g.sees) seen = true;
    if (dist(g, p) < config.touch_radius) return 'caught';
  }
  world.seen = seen ? world.seen + dtMs : Math.max(0, world.seen - dtMs * config.seen_decay);
  if (world.seen >= config.seen_ms) return 'caught';

  const atExit = dist(p, world.stage.exit) < 0.5;
  if (!atExit) {
    world.exitArmed = true;
  } else if (world.exitArmed && held(world) >= 1) {
    world.exitArmed = false;
    return 'exit';
  }

  return event;
}

/**
 * 잡혔다. 상자가 있으면 마지막 것을 제자리에 놓고 출발점으로,
 * 없으면 스테이지 처음부터 (기획서 §8-3).
 * @returns {'drop'|'restart'}
 */
export function onCaught(world) {
  const had = held(world);
  if (had > 0) {
    const i = world.order.pop();
    world.boxes[i].taken = false;
  } else {
    world.boxes.forEach((b) => {
      b.taken = false;
    });
  }
  world.player = { x: world.stage.start.x, y: world.stage.start.y, face: 0 };
  world.seen = 0;
  world.caught += 1;
  for (const g of world.guards) g.sees = false;
  return had > 0 ? 'drop' : 'restart';
}

// ── 그리기를 돕는 셈 ────────────────────────────────────────────

/** 형사의 시야를 벽에서 잘라 낸 다각형. 3도마다 한 줄기씩 쏜다 */
export function fanPolygon(g, stage, config) {
  const half = ((config.fov_deg * Math.PI) / 180) / 2;
  const rays = Math.max(8, Math.ceil(config.fov_deg / 3));
  const pts = [{ x: g.x, y: g.y }];
  const stepLen = 0.1;
  for (let i = 0; i <= rays; i += 1) {
    const a = g.angle - half + (half * 2 * i) / rays;
    const cx = Math.cos(a);
    const cy = Math.sin(a);
    let r = 0;
    while (r < config.fov_range) {
      const nr = r + stepLen;
      if (isWall(stage, g.x + cx * nr, g.y + cy * nr)) break;
      r = nr;
    }
    pts.push({ x: g.x + cx * r, y: g.y + cy * r });
  }
  return pts;
}

// ── 점수 ────────────────────────────────────────────────────────

/** 스테이지의 상자 수 */
export function stageBoxes(stage) {
  return stage.map.join('').split('B').length - 1;
}

/** 이 게임에서 나올 수 있는 최고 점수 (상자 전부) */
export function maxScore(config) {
  return config.stages.reduce((n, s) => n + stageBoxes(s), 0);
}

/** 판이 끝났을 때 받는 낱말 카드 */
export function reward(boxes, cleared, config) {
  return boxes * config.reward.per_box + (cleared ? config.reward.clear : 0);
}
