/**
 * BurgerScene — hamburguesa 3D procedural (Three.js) con ingredientes animados.
 *
 * Uso:
 *   const burger = new BurgerScene(divContenedor, { autoRotate: true });
 *   burger.setIngredients(['Queso Cheddar', 'Tocino', 'Salsa Mil Islas']);
 *   burger.dispose(); // al desmontar
 *
 * No necesita modelos externos: todo se genera por código. El detalle fino
 * (poros de la corteza, grietas de la carne, venas de la lechuga, vetas del
 * tocino) viene de texturas generadas una sola vez, así la geometría es liviana.
 * La infraestructura (renderer, luces, calidad, bucle) vive en ./core.js.
 */
import {
  THREE, mergeGeometries, Stage, fromTemplate, materialsOf, spring, sp, ease, clamp01, smooth, lerp, mulberry32, strHash, fbm,
  spline, flatLine, joinProfiles, latheGeo, cleanMerge, displace, paint, solidColor, col, WHITE, mesh, food,
} from './core.js';

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/* Constructores de cada capa (base en y = 0). ctx.q = calidad          */
/* ------------------------------------------------------------------ */

function buildBunTop(ctx) {
  const s = ctx.seed, q = ctx.q;
  const side = spline(
    [[0.98, 0], [1.07, 0.035], [1.12, 0.13], [1.125, 0.24], [1.07, 0.38], [0.95, 0.5], [0.77, 0.6], [0.53, 0.67], [0.27, 0.71], [0, 0.72]],
    56 * q.detail
  );
  const g = latheGeo(joinProfiles(flatLine(0, 0.98, 0, 8), side), q.seg);
  const disp = (v) => smooth(0.02, 0.15, v.y) * fbm(v.x * 1.8, v.y * 1.8, v.z * 1.8, s, 3) * 0.05;
  displace(g, disp);
  const crumb = col('#efd29c'), pale = col('#e9c08a'), gold = col('#c4813a'), dark = col('#6f3712');
  paint(g, (v, n, c) => {
    if (v.y < 0.015 && n.y < -0.6) {
      c.copy(crumb);
      return;
    }
    c.copy(pale).lerp(gold, smooth(0.0, 0.2, v.y)).lerp(dark, smooth(0.2, 0.7, v.y) * 0.85);
    c.multiplyScalar(0.88 + fbm(v.x * 3, v.y * 3, v.z * 3, s + 3, 3) * 0.3);
    // oclusión: el borde inferior queda en sombra sobre los ingredientes
    c.multiplyScalar(lerp(0.55, 1, smooth(0.0, 0.14, v.y)));
  });
  const group = new THREE.Group();
  group.add(mesh(g, food({ map: 'crust', bump: 'crust', bumpScale: 2.5, roughness: 0.45, clearcoat: 0.5, clearcoatRoughness: 0.28 })));

  // Ajonjolí (instanciado: 1 sola llamada de dibujo)
  const dome = side.filter((p) => p.y > 0.3);
  const heightAt = (r) => {
    for (let i = 0; i < dome.length - 1; i++) {
      const a = dome[i], b = dome[i + 1];
      if (a.x >= r && r >= b.x) {
        const t = (r - a.x) / (b.x - a.x || 1e-6);
        return { y: lerp(a.y, b.y, t), slope: (b.y - a.y) / (b.x - a.x || -1e-6) };
      }
    }
    return { y: 0.72, slope: 0 };
  };
  const N = q.sesame;
  const seedGeo = new THREE.SphereGeometry(1, 8, 6);
  solidColor(seedGeo, WHITE);
  const seeds = new THREE.InstancedMesh(seedGeo, food({ roughness: 0.45, clearcoat: 0.3, bumpScale: 0 }), N);
  seeds.castShadow = true;
  const m4 = new THREE.Matrix4(), qa = new THREE.Quaternion(), qb = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0), nrm = new THREE.Vector3(), pos = new THREE.Vector3(), sc = new THREE.Vector3(0.036, 0.012, 0.019);
  const cA = col('#f8eecd'), cB = col('#e2bf78'), cc = new THREE.Color();
  for (let i = 0; i < N; i++) {
    const r = 0.86 * Math.sqrt(ctx.rand()), th = ctx.rand() * Math.PI * 2;
    const h = heightAt(r);
    nrm.set(-h.slope * Math.cos(th), 1, -h.slope * Math.sin(th)).normalize();
    pos.set(r * Math.cos(th), h.y, r * Math.sin(th));
    pos.addScaledVector(nrm, disp(pos) + 0.004);
    qa.setFromUnitVectors(up, nrm);
    qb.setFromAxisAngle(nrm, ctx.rand() * Math.PI * 2);
    qa.premultiply(qb);
    m4.compose(pos, qa, sc);
    seeds.setMatrixAt(i, m4);
    seeds.setColorAt(i, cc.copy(cA).lerp(cB, ctx.rand()));
  }
  group.add(seeds);
  return group;
}

function buildBunBottom(ctx) {
  const s = ctx.seed, q = ctx.q;
  const side = spline([[0.93, 0], [1.03, 0.025], [1.09, 0.1], [1.105, 0.2], [1.08, 0.3], [1.0, 0.36]], 30 * q.detail);
  const g = latheGeo(joinProfiles(flatLine(0, 0.93, 0, 8), side, flatLine(1.0, 0, 0.36, 8)), q.seg);
  displace(g, (v) => smooth(0.85, 1.0, Math.hypot(v.x, v.z)) * fbm(v.x * 2, v.y * 2, v.z * 2, s, 3) * 0.03);
  const toast = col('#a5561a'), pale = col('#e3b46f'), gold = col('#c97c2e'), crumb = col('#e8c487');
  paint(g, (v, n, c) => {
    if (n.y > 0.6 && v.y > 0.3) c.copy(crumb);
    else if (n.y < -0.6) c.copy(toast);
    else c.copy(gold).lerp(pale, smooth(0.04, 0.24, v.y));
    c.multiplyScalar(0.9 + fbm(v.x * 3, v.y * 3, v.z * 3, s + 2, 3) * 0.25);
    // oclusión bajo la carne
    if (n.y <= 0.6) c.multiplyScalar(lerp(1, 0.7, smooth(0.26, 0.36, v.y)));
  });
  const group = new THREE.Group();
  group.add(mesh(g, food({ map: 'crust', bump: 'crust', bumpScale: 2.2, roughness: 0.55, clearcoat: 0.2, clearcoatRoughness: 0.5 })));
  const disk = new THREE.CircleGeometry(0.995, Math.round(q.seg * 0.75));
  disk.rotateX(-Math.PI / 2);
  const crumbMesh = mesh(disk, food({ map: 'crumb', bump: 'crumb', bumpScale: 1.2, roughness: 0.92 }));
  crumbMesh.position.y = 0.3615;
  group.add(crumbMesh);
  return group;
}

function pattyLike(ctx, { radius = 1.15, height = 0.3, amp = 1, colors, rough = 0.55, coat = 0.35, chicken = false }) {
  const s = ctx.seed, q = ctx.q;
  const R = radius, H = height;
  const side = spline(
    [[R * 0.83, 0], [R * 0.93, H * 0.08], [R * 0.985, H * 0.3], [R, H * 0.5], [R * 0.98, H * 0.73], [R * 0.93, H * 0.92], [R * 0.85, H]],
    32 * q.detail
  );
  const g = latheGeo(joinProfiles(flatLine(0, R * 0.83, 0, 12 * q.detail), side, flatLine(R * 0.85, 0, H, (chicken ? 12 : 30) * q.detail)), q.seg * 1.1);
  const dfn = chicken
    ? (v) => fbm(v.x * 3, v.y * 3, v.z * 3, s, 3) * 0.05 * amp + fbm(v.x * 11, v.y * 11, v.z * 11, s + 4, 2) * 0.03 * amp
    : (v) => fbm(v.x * 2.2, v.y * 2.2, v.z * 2.2, s, 3) * 0.035 * amp + fbm(v.x * 9, v.y * 9, v.z * 9, s + 4, 2) * 0.018 * amp;
  displace(g, (v, n) => dfn(v) * (Math.abs(n.y) > 0.8 ? (chicken ? 0.3 : 0.55) : 1));
  const [a, b, charC] = colors.map(col);
  paint(g, (v, n, c) => {
    const k = smooth(-0.35, 0.4, fbm(v.x * 4, v.y * 4, v.z * 4, s + 2, 3));
    c.copy(a).lerp(b, k);
    const ch = smooth(0.1, 0.45, fbm(v.x * 10, v.y * 10, v.z * 10, s + 6, 2));
    c.lerp(charC, ch * (chicken ? 0.5 : 0.75));
    if (Math.abs(n.y) > 0.7) c.multiplyScalar(chicken ? 0.95 : 0.82);
    if (!chicken && n.y > 0.7) {
      // marcas de parrilla: líneas diagonales quemadas, interrumpidas por el ruido
      const u = v.x * 0.88 + v.z * 0.47;
      const line = smooth(0.84, 0.97, Math.abs(Math.sin(u * 7.2))) * smooth(-0.35, 0.15, fbm(v.x * 5, 0, v.z * 5, s + 11, 2));
      c.multiplyScalar(1 - 0.72 * line);
    }
    c.multiplyScalar(lerp(0.7, 1, smooth(0.0, 0.06, v.y))); // oclusión al apoyar
  });
  return mesh(g, food({ map: 'meat', bump: 'meat', bumpScale: chicken ? 5 : 4, roughness: rough, clearcoat: coat, clearcoatRoughness: 0.45 }));
}

function buildPatty(ctx) {
  return pattyLike(ctx, { colors: ['#74412a', '#43220f', '#170a04'] });
}

function buildChicken(ctx) {
  const m = pattyLike(ctx, {
    radius: 1.13, height: 0.34, amp: 1.2, colors: ['#e6a84f', '#bd7428', '#7a3d12'], rough: 0.78, coat: 0.05, chicken: true,
  });
  m.scale.set(1.1, 1, 0.92);
  m.rotation.y = ctx.rand() * Math.PI;
  return m;
}

function buildCheese(ctx, variant) {
  const s = ctx.seed;
  const segs = Math.round(44 * ctx.q.detail);
  const g = new THREE.BoxGeometry(2.05, 0.03, 2.05, segs, 1, segs);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const d = Math.hypot(x, z);
    const over = Math.max(0, d - 0.95);
    const drop = over * over * 1.6 * (1 + 0.5 * fbm(x * 1.3, 0, z * 1.3, s, 2));
    const pull = 1 - over * 0.06;
    p.setXYZ(i, x * pull, y + 0.06 - drop, z * pull);
  }
  g.computeVertexNormals();
  const white = variant === 'white';
  const mat = food({
    color: white ? '#f0d48a' : '#f39a14',
    bumpScale: 0.25,
    roughness: white ? 0.5 : 0.36,
    clearcoat: 0.35,
    clearcoatRoughness: 0.35,
    env: 0.7,
  });
  const group = new THREE.Group();
  group.add(mesh(g, mat));
  // gotas de queso derretido colgando de las esquinas
  const corners = [[1, 1], [1, -1], [-1, 1], [-1, -1]].map(() => ({ best: -Infinity, x: 0, y: 0, z: 0 }));
  [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([sx, sz], k) => {
    for (let i = 0; i < p.count; i++) {
      const dot = p.getX(i) * sx + p.getZ(i) * sz - p.getY(i) * 0.01;
      if (dot > corners[k].best) corners[k] = { best: dot, x: p.getX(i), y: p.getY(i), z: p.getZ(i) };
    }
  });
  const dripGeo = new THREE.SphereGeometry(1, 12, 10);
  corners.forEach((cn, k) => {
    if (k > 1 && ctx.rand() < 0.4) return; // 2 a 4 gotas
    const len = 0.07 + ctx.rand() * 0.09;
    const neck = mesh(dripGeo, mat);
    neck.scale.set(0.04, len, 0.035);
    neck.position.set(cn.x * 0.985, cn.y - len * 0.75, cn.z * 0.985);
    const bulb = mesh(dripGeo, mat);
    bulb.scale.set(0.05, 0.055, 0.045);
    bulb.position.set(cn.x * 0.985, cn.y - len * 1.55, cn.z * 0.985);
    group.add(neck, bulb);
  });
  group.rotation.y = Math.PI / 4 + (ctx.rand() - 0.5) * 0.6;
  return group;
}

function leafGeo(ctx, radius, seedOff, colors, ruffleAmp = 0.065, freq = 13) {
  const s = ctx.seed + seedOff;
  const g = new THREE.RingGeometry(0.0, 1, Math.round(150 * ctx.q.detail), 10);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    const r = Math.hypot(x, z), th = Math.atan2(z, x);
    const c = Math.cos(th), sn = Math.sin(th);
    const R = radius * (1 + 0.08 * fbm(c * 1.7, sn * 1.7, 0, s, 3));
    const y =
      smooth(0.45, 1, r) * (ruffleAmp * Math.sin(th * freq + 4 * fbm(c, sn, 1, s + 3, 2)) + 0.05 * fbm(c * 3, sn * 3, r * 2, s + 7, 3)) +
      0.02 * (1 - r * r);
    p.setXYZ(i, c * r * R, y, sn * r * R);
  }
  g.computeVertexNormals();
  const [inner, outer] = colors.map(col);
  paint(g, (v, n, c) => {
    const r = Math.hypot(v.x, v.z) / radius;
    c.copy(inner).lerp(outer, smooth(0.2, 1, r));
    c.multiplyScalar(0.9 + fbm(v.x * 5, 0, v.z * 5, s + 9, 3) * 0.3);
  });
  return g;
}

function buildLettuce(ctx) {
  const group = new THREE.Group();
  const mat = food({ map: 'leaf', bump: 'leaf', bumpScale: 1.2, roughness: 0.45, clearcoat: 0.3, clearcoatRoughness: 0.3, side: THREE.DoubleSide });
  const a = mesh(leafGeo(ctx, 1.24, 0, ['#4f8f2a', '#a3d65e']), mat);
  a.position.y = 0.012;
  const b = mesh(leafGeo(ctx, 1.16, 50, ['#5a9a30', '#b6e270']), mat);
  b.position.y = 0.04;
  b.rotation.y = 1.3;
  group.add(a, b);
  return group;
}

const HAM_COLORS = {
  ham: [['#e9a3a0', '#d88884'], ['#efb0ac', '#dc8c88']],
  chorizo: [['#b8432a', '#8f2a17'], ['#c4502f', '#93301a']],
  chuleta: [['#d99a86', '#a8664a'], ['#e0a58f', '#b07052']],
};

function buildHam(ctx, variant) {
  const [c1, c2] = HAM_COLORS[variant] || HAM_COLORS.ham;
  const mat = food({ bumpScale: 0.6, roughness: 0.4, clearcoat: 0.4, side: THREE.DoubleSide });
  const group = new THREE.Group();
  const a = mesh(leafGeo(ctx, 1.12, 0, c1, 0.03, 6), mat);
  a.position.y = 0.015;
  const b = mesh(leafGeo(ctx, 1.08, 30, c2, 0.03, 7), mat);
  b.position.y = 0.035;
  b.rotation.y = 2;
  group.add(a, b);
  return group;
}

function buildTomato(ctx) {
  const group = new THREE.Group();
  const capMat = food({ map: 'tomato', bumpScale: 0.3, roughness: 0.22, clearcoat: 0.8, clearcoatRoughness: 0.15 });
  const sideMat = food({ color: '#b81d10', roughness: 0.3, clearcoat: 0.7 });
  const spots = [[-0.42, 0.0, 0.12], [0.43, 0.012, -0.14]];
  spots.forEach(([x, y, z], i) => {
    const g = new THREE.CylinderGeometry(0.64, 0.64, 0.075, Math.round(48 * ctx.q.detail), 1);
    const m = mesh(g, [sideMat, capMat, capMat]);
    m.position.set(x, 0.04 + y, z);
    m.rotation.set((ctx.rand() - 0.5) * 0.06, ctx.rand() * Math.PI * 2, (i ? -1 : 1) * 0.04);
    group.add(m);
  });
  return group;
}

function buildPickles(ctx) {
  const group = new THREE.Group();
  const capMat = food({ map: 'pickle', bumpScale: 0.3, roughness: 0.25, clearcoat: 0.9, clearcoatRoughness: 0.2 });
  const sideMat = food({ color: '#2f4a14', roughness: 0.35, clearcoat: 0.8 });
  const placed = [];
  let tries = 0;
  while (placed.length < 7 && tries++ < 300) {
    const r = placed.length < 5 ? lerp(0.82, 0.98, ctx.rand()) : Math.sqrt(ctx.rand()) * 0.5, th = ctx.rand() * Math.PI * 2;
    const x = Math.cos(th) * r, z = Math.sin(th) * r;
    if (placed.some(([px, pz]) => Math.hypot(px - x, pz - z) < 0.42)) continue;
    placed.push([x, z]);
  }
  const g = new THREE.CylinderGeometry(0.25, 0.25, 0.032, 48, 1);
  const p = g.attributes.position;
  for (let k = 0; k < p.count; k++) {
    const px = p.getX(k), pz = p.getZ(k);
    if (Math.hypot(px, pz) > 0.2) {
      const f = 1 + 0.045 * Math.sin(Math.atan2(pz, px) * 16);
      p.setX(k, px * f);
      p.setZ(k, pz * f);
    }
  }
  g.computeVertexNormals();
  placed.forEach(([x, z], i) => {
    const m = mesh(g, [sideMat, capMat, capMat]);
    m.position.set(x, 0.018 + (i % 3) * 0.008, z);
    m.rotation.set((ctx.rand() - 0.5) * 0.12, ctx.rand() * 6.28, (ctx.rand() - 0.5) * 0.12);
    group.add(m);
  });
  return group;
}

function arcsLayer(ctx, { count, rad, tube, arc, colors, spread, mat, edge = 0.5 }) {
  const geos = [];
  const [ca, cb] = colors.map(col);
  const c = new THREE.Color();
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  count = Math.max(6, Math.round(count * ctx.q.detail));
  for (let k = 0; k < count; k++) {
    const a = lerp(arc[0], arc[1], ctx.rand());
    const R = lerp(rad[0], rad[1], ctx.rand());
    const t = tube * (0.75 + ctx.rand() * 0.5);
    const tg = new THREE.TorusGeometry(R, t, 6, Math.max(8, Math.round(a * 8)), a);
    solidColor(tg, c.copy(ca).lerp(cb, ctx.rand()));
    const rr = (ctx.rand() < edge ? lerp(0.78, 1, ctx.rand()) : Math.sqrt(ctx.rand())) * spread, th = ctx.rand() * Math.PI * 2;
    e.set(Math.PI / 2 + (ctx.rand() - 0.5) * 0.5, (ctx.rand() - 0.5) * 0.5, ctx.rand() * Math.PI * 2, 'XYZ');
    q.setFromEuler(e);
    m4.compose(new THREE.Vector3(Math.cos(th) * rr, t + ctx.rand() * 0.03, Math.sin(th) * rr), q, new THREE.Vector3(1, 1, 1));
    tg.applyMatrix4(m4);
    geos.push(tg);
  }
  const merged = mergeGeometries(geos);
  geos.forEach((g) => g.dispose());
  return mesh(merged, mat);
}

function buildOnionCaramelized(ctx) {
  return arcsLayer(ctx, {
    count: 54, rad: [0.09, 0.22], tube: 0.024, arc: [1.4, 3.2], spread: 1.12, edge: 0.6,
    colors: ['#6b300c', '#b8681c'],
    mat: food({ bumpScale: 0.3, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.15 }),
  });
}

function buildOnionGrilled(ctx) {
  return arcsLayer(ctx, {
    count: 28, rad: [0.18, 0.34], tube: 0.03, arc: [1.6, 3.6], spread: 1.0, edge: 0.6,
    colors: ['#e6c58c', '#a8702e'],
    mat: food({ roughness: 0.35, clearcoat: 0.8 }),
  });
}

function buildOnionRaw(ctx) {
  return arcsLayer(ctx, {
    count: 14, rad: [0.25, 0.42], tube: 0.022, arc: [4.5, 6.28], spread: 0.85, edge: 0.5,
    colors: ['#f6f0f2', '#d9c2dc'],
    mat: food({ roughness: 0.25, clearcoat: 0.7, clearcoatRoughness: 0.15 }),
  });
}

function buildOnionCrispy(ctx) {
  return arcsLayer(ctx, {
    count: 70, rad: [0.06, 0.16], tube: 0.018, arc: [1.2, 3], spread: 1.1, edge: 0.6,
    colors: ['#c7802c', '#e9b357'],
    mat: food({ roughness: 0.7 }),
  });
}

function buildOnionRings(ctx) {
  const s = ctx.seed;
  const group = new THREE.Group();
  const mat = food({ roughness: 0.75, clearcoat: 0.15 });
  const base = ctx.rand() * Math.PI * 2;
  for (let i = 0; i < 3; i++) {
    const g = cleanMerge(new THREE.TorusGeometry(0.34, 0.095, Math.round(14 * ctx.q.detail), Math.round(44 * ctx.q.detail)));
    displace(g, (v) => fbm(v.x * 6, v.y * 6, v.z * 6, s + i, 3) * 0.03 + fbm(v.x * 18, v.y * 18, v.z * 18, s + 9, 2) * 0.012);
    paint(g, (v, n, c) => {
      c.copy(col('#d99b42')).lerp(col('#a8621f'), smooth(-0.3, 0.5, fbm(v.x * 7, v.y * 7, v.z * 7, s + 4, 2)));
    });
    const m = mesh(g, mat);
    const th = base + (i / 3) * Math.PI * 2;
    m.position.set(Math.cos(th) * 0.4, 0.1 + i * 0.025, Math.sin(th) * 0.4);
    m.rotation.set(Math.PI / 2 + (ctx.rand() - 0.5) * 0.25, (ctx.rand() - 0.5) * 0.25, 0);
    group.add(m);
  }
  return group;
}

function buildBacon(ctx) {
  const s = ctx.seed;
  const group = new THREE.Group();
  const mat = food({ map: 'bacon', bumpScale: 0.5, roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.3 });
  const yaw = ctx.rand() * Math.PI;
  for (let k = 0; k < 3; k++) {
    const g = new THREE.BoxGeometry(2.3, 0.024, 0.34, Math.round(64 * ctx.q.detail), 1, 3);
    const ph = ctx.rand() * 6.28, ph2 = ctx.rand() * 6.28;
    paint(g, (v, n, c) => c.setScalar(0.85 + fbm(v.x * 3, k, v.z * 3, s + 5, 2) * 0.25));
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const ax = Math.abs(x);
      const droop = ax > 1.0 ? Math.pow(ax - 1.0, 2) * 0.6 : 0;
      p.setXYZ(i, x, y + Math.sin(x * 4.5 + ph) * 0.04 + Math.sin(x * 11 + ph2) * 0.01 - droop, z + Math.sin(x * 3 + ph) * 0.035);
    }
    g.computeVertexNormals();
    const m = mesh(g, mat);
    m.rotation.y = yaw + (k - 1) * 0.55;
    m.position.set((k - 1) * 0.08, 0.03 + k * 0.015, (k - 1) * 0.28);
    group.add(m);
  }
  return group;
}

const SAUCE_COLORS = {
  milIslas: '#d9622e',
  mayo: '#f5ecd2',
  ketchup: '#a8140b',
  mostaza: '#e0ab0c',
  bbq: '#4f1909',
  buffalo: '#e05417',
  guacamole: '#7aa23a',
  cesar: '#eee0bc',
  queso: '#f2ae22',
  default: '#e7a05e',
};


function buildSauce(ctx, variant) {
  const s = ctx.seed;
  const g = new THREE.RingGeometry(0, 1, Math.round(120 * ctx.q.detail), 8);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  const drips = Array.from({ length: 6 }, () => ctx.rand() * Math.PI * 2);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    const r = Math.hypot(x, z), th = Math.atan2(z, x);
    const c = Math.cos(th), sn = Math.sin(th);
    let R = 1.0 + 0.07 * fbm(c * 1.5, sn * 1.5, 0, s, 3);
    for (const d of drips) {
      const da = Math.atan2(Math.sin(th - d), Math.cos(th - d));
      R += 0.14 * Math.exp(-((da / 0.09) ** 2));
    }
    const rr = r * R;
    const y = 0.022 * (1 - r * r) - Math.pow(Math.max(0, rr - 1.0), 2) * 3.5 + 0.004;
    p.setXYZ(i, c * rr, y, sn * rr);
  }
  g.computeVertexNormals();
  return mesh(
    g,
    food({ color: SAUCE_COLORS[variant] || SAUCE_COLORS.default, bumpScale: 0, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.06, env: 0.8, side: THREE.DoubleSide })
  );
}

function buildEgg(ctx) {
  const s = ctx.seed;
  const group = new THREE.Group();
  const g = new THREE.RingGeometry(0, 1, Math.round(100 * ctx.q.detail), 8);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    const r = Math.hypot(x, z), th = Math.atan2(z, x);
    const R = 1.18 + 0.14 * fbm(Math.cos(th) * 1.4, Math.sin(th) * 1.4, 0, s, 3);
    const y = 0.05 * (1 - smooth(0.4, 1, r)) + 0.01 * fbm(x * 6, 0, z * 6, s + 1, 2);
    p.setXYZ(i, Math.cos(th) * r * R, y, Math.sin(th) * r * R);
  }
  g.computeVertexNormals();
  paint(g, (v, n, c) => {
    const r = Math.hypot(v.x, v.z);
    c.copy(col('#fbf8ee')).lerp(col('#c88a40'), smooth(1.05, 1.3, r + fbm(v.x * 8, 0, v.z * 8, s + 2, 2) * 0.1));
  });
  group.add(mesh(g, food({ bumpScale: 0.4, roughness: 0.35, clearcoat: 0.6, side: THREE.DoubleSide })));
  const yolk = mesh(new THREE.SphereGeometry(0.3, 28, 16), food({ color: '#ffa70f', bumpScale: 0, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05 }));
  yolk.scale.set(1, 0.55, 1);
  yolk.position.set(0.12, 0.05, -0.08);
  group.add(yolk);
  return group;
}

function buildMushroom(ctx) {
  const group = new THREE.Group();
  const shape = new THREE.Shape();
  shape.moveTo(0.24, 0);
  shape.absellipse(0, 0, 0.24, 0.2, 0, Math.PI, false);
  shape.lineTo(-0.07, 0);
  shape.lineTo(-0.06, -0.16);
  shape.lineTo(0.06, -0.16);
  shape.lineTo(0.07, 0);
  shape.lineTo(0.24, 0);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.025, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 1, curveSegments: 14 });
  geo.rotateX(-Math.PI / 2);
  const mats = [food({ color: '#a37b56', roughness: 0.4, clearcoat: 0.7 }), food({ color: '#4a2c18', roughness: 0.4, clearcoat: 0.6 })];
  for (let i = 0; i < 8; i++) {
    const m = mesh(geo, mats);
    const r = Math.sqrt(ctx.rand()) * 0.7, th = ctx.rand() * Math.PI * 2;
    m.position.set(Math.cos(th) * r, 0.01 + (i % 3) * 0.012, Math.sin(th) * r);
    m.rotation.y = ctx.rand() * Math.PI * 2;
    group.add(m);
  }
  return group;
}

function sticksLayer(ctx, { count, len, w, h, palette, spread, mound, mat }) {
  const geos = [];
  const c = new THREE.Color();
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  count = Math.max(20, Math.round(count * ctx.q.detail));
  for (let k = 0; k < count; k++) {
    const L = lerp(len[0], len[1], ctx.rand());
    const bg = new THREE.BoxGeometry(L, h, w);
    let pick = ctx.rand(), chosen = palette[0][0];
    for (const [hex, wgt] of palette) {
      if (pick < wgt) {
        chosen = hex;
        break;
      }
      pick -= wgt;
    }
    solidColor(bg, c.set(chosen).multiplyScalar(0.9 + ctx.rand() * 0.2));
    const rr = Math.sqrt(ctx.rand()) * spread, th = ctx.rand() * Math.PI * 2;
    e.set((ctx.rand() - 0.5) * 0.4, ctx.rand() * Math.PI * 2, (ctx.rand() - 0.5) * 0.4);
    q.setFromEuler(e);
    const y = h / 2 + ctx.rand() * mound * (1 - (rr / spread) ** 2);
    m4.compose(new THREE.Vector3(Math.cos(th) * rr, y, Math.sin(th) * rr), q, new THREE.Vector3(1, 1, 1));
    bg.applyMatrix4(m4);
    geos.push(bg);
  }
  const merged = mergeGeometries(geos);
  geos.forEach((g) => g.dispose());
  return mesh(merged, mat);
}

function buildColeslaw(ctx) {
  return sticksLayer(ctx, {
    count: 300, len: [0.18, 0.38], w: 0.026, h: 0.012, spread: 1.12, mound: 0.08,
    palette: [['#eef2d6', 0.45], ['#d9e6ad', 0.25], ['#f6f1df', 0.12], ['#7d2458', 0.12], ['#e58a3a', 0.06]],
    mat: food({ bumpScale: 0, roughness: 0.3, clearcoat: 0.8 }),
  });
}

function buildPotatoSticks(ctx) {
  return sticksLayer(ctx, {
    count: 320, len: [0.14, 0.3], w: 0.024, h: 0.024, spread: 1.1, mound: 0.1,
    palette: [['#f0c45c', 0.5], ['#e2a53e', 0.3], ['#f7d985', 0.2]],
    mat: food({ bumpScale: 0, roughness: 0.6 }),
  });
}

function buildCorn(ctx) {
  return sticksLayer(ctx, {
    count: 170, len: [0.045, 0.06], w: 0.05, h: 0.04, spread: 1.05, mound: 0.05,
    palette: [['#f6c23a', 0.6], ['#f2b01e', 0.4]],
    mat: food({ bumpScale: 0, roughness: 0.3, clearcoat: 0.7 }),
  });
}

function buildOlives(ctx) {
  return arcsLayer(ctx, {
    count: 12, rad: [0.07, 0.09], tube: 0.04, arc: [6.28, 6.28], spread: 1.0, edge: 0.6,
    colors: ['#1d1a1c', '#3a2f35'],
    mat: food({ bumpScale: 0, roughness: 0.2, clearcoat: 1 }),
  });
}

/* ------------------------------------------------------------------ */
/* Catálogo de capas                                                   */
/* ------------------------------------------------------------------ */

const KINDS = {
  bunBottom: { order: 0, h: 0.36, build: buildBunBottom },
  lettuce: { order: 10, h: 0.07, build: buildLettuce },
  tomato: { order: 12, h: 0.085, build: buildTomato },
  coleslaw: { order: 14, h: 0.1, build: buildColeslaw },
  patty: { order: 20, h: 0.3, build: buildPatty },
  chicken: { order: 21, h: 0.38, build: buildChicken },
  cheese: { order: 30, h: 0.04, build: buildCheese },
  egg: { order: 34, h: 0.08, build: buildEgg },
  ham: { order: 36, h: 0.05, build: buildHam },
  bacon: { order: 40, h: 0.065, build: buildBacon },
  mushroom: { order: 44, h: 0.05, build: buildMushroom },
  onionRings: { order: 50, h: 0.2, build: buildOnionRings },
  onionGrilled: { order: 52, h: 0.06, build: buildOnionGrilled },
  onionRaw: { order: 53, h: 0.05, build: buildOnionRaw },
  onionCaramelized: { order: 54, h: 0.06, build: buildOnionCaramelized },
  onionCrispy: { order: 55, h: 0.07, build: buildOnionCrispy },
  pickles: { order: 60, h: 0.045, build: buildPickles },
  corn: { order: 62, h: 0.06, build: buildCorn },
  olives: { order: 63, h: 0.07, build: buildOlives },
  potatoSticks: { order: 64, h: 0.12, build: buildPotatoSticks },
  sauce: { order: 70, h: 0.02, build: buildSauce },
  bunTop: { order: 100, h: 0.72, build: buildBunTop },
};

export function normalizeName(s) {
  return String(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/\$\s*[\d.,]+/g, '')
    .replace(/^[\s+]+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function sauceVariant(n) {
  if (/mil islas|thousand|rosada|golf/.test(n)) return 'milIslas';
  if (/ketchup|catsup|tomate/.test(n)) return 'ketchup';
  if (/miel|mostaza|mustard/.test(n)) return 'mostaza';
  if (/bbq|barbacoa|barbecue|teriyaki/.test(n)) return 'bbq';
  if (/buffalo|bufalo|picante|hot|sriracha|chipotle/.test(n)) return 'buffalo';
  if (/guacamole|aguacate|palta/.test(n)) return 'guacamole';
  if (/cesar|caesar/.test(n)) return 'cesar';
  if (/queso|cheddar|cheese/.test(n)) return 'queso';
  if (/mayo|ajo|aioli|alioli|ranch|tartara|blanca/.test(n)) return 'mayo';
  return 'default';
}

/**
 * Convierte el nombre de un ingrediente (en español o inglés) en un tipo de capa 3D.
 * Devuelve null si no lo reconoce (se ignora).
 */
export function classifyIngredient(name) {
  const n = normalizeName(name);
  if (!n) return null;
  if (/\b(pan|brioche|bun|panecillo)\b/.test(n)) return null;
  if (/champi|hongo|portobello|mushroom|setas/.test(n)) return { kind: 'mushroom' };
  if (/salsa|sauce|mayo|ketchup|catsup|mostaza|mustard|bbq|barbacoa|aderezo|aioli|alioli|ranch|guacamole|chipotle|tartara|sriracha/.test(n))
    return { kind: 'sauce', variant: sauceVariant(n) };
  if (/aros? de cebolla|onion ring/.test(n)) return { kind: 'onionRings' };
  if (/doble carne|carne extra|extra carne|carne adicional|doble hamburguesa|double patty|extra patty/.test(n)) return { kind: 'patty', extra: true };
  if (/pollo|chicken|^crispy$/.test(n)) return { kind: 'chicken' };
  if (/carne|\bres\b|beef|patty|smash|angus|lomito|lomo\b/.test(n)) return { kind: 'patty' };
  if (/chorizo|salchicha|sausage/.test(n)) return { kind: 'ham', variant: 'chorizo' };
  if (/chuleta|pernil|cerdo|pork/.test(n)) return { kind: 'ham', variant: 'chuleta' };
  if (/queso|cheese|cheddar|americano|mozzarella|mozarela|provolone|gouda|suizo|parmesano/.test(n))
    return { kind: 'cheese', variant: /mozz|mozar|blanco|suizo|provolone|parmesano|gouda/.test(n) ? 'white' : 'cheddar' };
  if (/tocin|bacon|panceta/.test(n)) return { kind: 'bacon' };
  if (/caramel/.test(n)) return { kind: 'onionCaramelized' };
  if (/cebolla|onion/.test(n)) {
    if (/crisp|frita|crocante/.test(n)) return { kind: 'onionCrispy' };
    if (/grill|asad|sofrit|salte|plancha/.test(n)) return { kind: 'onionGrilled' };
    return { kind: 'onionRaw' };
  }
  if (/lechuga|lettuce|rucula|arugula|espinaca|romana/.test(n)) return { kind: 'lettuce' };
  if (/tomate|tomato/.test(n)) return { kind: 'tomato' };
  if (/pepinill|pickle/.test(n)) return { kind: 'pickles' };
  if (/huevo|egg/.test(n)) return { kind: 'egg' };
  if (/champi|hongo|portobello|mushroom|setas/.test(n)) return { kind: 'mushroom' };
  if (/jamon|\bham\b/.test(n)) return { kind: 'ham' };
  if (/papa|papita|potato|patata|fries/.test(n)) return { kind: 'potatoSticks' };
  if (/coleslaw|cole slaw|repollo|ensaladilla/.test(n)) return { kind: 'coleslaw' };
  if (/ensalada|salad/.test(n)) return { kind: 'lettuce' };
  if (/maiz|corn|jojoto/.test(n)) return { kind: 'corn' };
  if (/aceituna|olive/.test(n)) return { kind: 'olives' };
  return null;
}



/* ------------------------------------------------------------------ */
/* Escena de hamburguesa                                               */
/* ------------------------------------------------------------------ */

export class BurgerScene extends Stage {
  /**
   * @param {HTMLElement} container
   * @param {object} [options]
   */
  constructor(container, options = {}) {
    super(
      container,
      Object.assign(
        { autoPatty: true, intro: true, onLayerClick: null, classify: null, hint: options.onLayerClick ? 'Gira · toca un ingrediente para quitarlo' : 'Arrastra para girar' },
        options
      )
    );
    this._highlight = null;
    this.stack = this.root;
    this.layers = [];
    this.gap = { x: 0, v: 0, target: 0, y: Infinity, closeAt: 0 };
    this.squash = sp(1);
    this._squashAt = -1;
  }

  /**
   * Define los ingredientes visibles. Anima automáticamente lo que entra y lo que sale.
   * @param {string[]} names  Ej: ['Queso Cheddar', 'Cebollas Caramelizadas', '+Tocino ($1.00)']
   * @param {{animate?: boolean}} [o]
   */
  setIngredients(names, o = {}) {
    if (this._disposed) return;
    const animate = o.animate !== false;
    const desired = this._resolve(names);
    const first = this.layers.length === 0;
    const ids = new Set(desired.map((d) => d.id));
    const now = this._time;
    let gapY = Infinity, gapAmt = 0;

    for (const L of this.layers) {
      if (L.leaving || ids.has(L.id)) continue;
      if (animate && L.built) {
        gapY = Math.min(gapY, L.baseY);
        gapAmt = Math.max(gapAmt, L.height + 0.4);
        this._beginLeave(L);
      } else {
        L.leaving = true;
        L.dead = true;
      }
    }

    const map = new Map(this.layers.filter((l) => !l.leaving).map((l) => [l.id, l]));
    const order = [];
    const fresh = [];
    for (const d of desired) {
      let L = map.get(d.id);
      if (!L) {
        L = this._createLayer(d);
        fresh.push(L);
      }
      order.push(L);
    }
    let y = 0;
    for (const L of order) {
      L.baseY = y;
      y += L.height;
    }
    this.totalH = y;

    const intro = first && this.opts.intro && !this.reduced && animate;
    fresh.forEach((L, i) => {
      if (intro) this._introLayer(L, i, fresh.length);
      else if (!first && animate) {
        this._build(L); // una sola capa: casi siempre sale de la caché
        gapY = Math.min(gapY, L.baseY + L.height * 0.5);
        gapAmt = Math.max(gapAmt, 0.45);
        this._enterLayer(L, now);
      } else {
        this._place(L);
      }
    });

    this.layers = [...order, ...this.layers.filter((l) => l.leaving)];
    this._sweepDead();

    if (gapY < Infinity) {
      this.gap.y = Math.min(this.gap.target > 0 ? this.gap.y : Infinity, gapY);
      if (this.gap.target === 0 && Math.abs(this.gap.x) < 0.01 && !this.reduced) this.gap.v = -0.55; // anticipación: la tapa baja un poco antes de abrirse
      this.gap.target = Math.max(this.gap.target, gapAmt);
      this.gap.closeAt = now + 0.5;
      this._squashAt = now + 0.7;
    }
    this._dirty = true;
    this._kick();
  }

  /**
   * Resalta un ingrediente (por nombre, ej. al pasar el mouse por su chip): se eleva un poco y brilla.
   * @param {string | null} label
   */
  setHighlight(label) {
    const n = label ? normalizeName(label) : null;
    if (n === this._highlight) return;
    this._highlight = n;
    this._kick();
  }

  _resolve(names) {
    const counts = {};
    const items = [];
    for (const raw of names || []) {
      const label = String(raw);
      const info = (this.opts.classify && this.opts.classify(label)) || classifyIngredient(label);
      if (!info || !KINDS[info.kind]) continue;
      const key = info.kind + ':' + normalizeName(label);
      counts[key] = (counts[key] || 0) + 1;
      items.push({ ...info, id: key + '#' + counts[key], label, removable: true });
    }
    const hasProtein = items.some((i) => (i.kind === 'patty' || i.kind === 'chicken') && !i.extra);
    if (this.opts.autoPatty && !hasProtein) items.unshift({ id: '__patty', kind: 'patty', label: null, removable: false });
    items.push({ id: '__bunBottom', kind: 'bunBottom', removable: false }, { id: '__bunTop', kind: 'bunTop', removable: false });
    items.forEach((it, i) => (it.idx = i));
    items.sort((a, b) => KINDS[a.kind].order - KINDS[b.kind].order || a.idx - b.idx);
    return items;
  }

  _createLayer(d) {
    const root = new THREE.Group();
    root.visible = false;
    root.userData.layerId = d.id;
    this.stack.add(root);
    return {
      id: d.id, kind: d.kind, variant: d.variant, label: d.label, removable: d.removable, height: KINDS[d.kind].h,
      root, mats: [], built: false, baseY: 0, opacity: -1, norm: d.label ? normalizeName(d.label) : null, glow: sp(0),
      px: sp(0), py: sp(0), pz: sp(0), ry: sp(0), tilt: sp(0), sc: sp(1),
      t0: 0, fade: 0.25, leaving: false, kY: 200, cY: 22, kXZ: 90, cXZ: 16,
      axis: new THREE.Vector3(1, 0, 0),
    };
  }

  /** Construye (o saca de la caché) la geometría de una capa. */
  _build(L) {
    if (L.built) return;
    const q = this.q;
    const obj = fromTemplate('burger|' + L.kind + '|' + (L.variant || '') + '|' + L.id + '|' + q.name, () => {
      const seed = strHash(L.id);
      return KINDS[L.kind].build({ seed: seed % 10000, rand: mulberry32(seed), q }, L.variant);
    });
    obj.traverse((o) => (o.userData.layerId = L.id));
    L.mats = materialsOf(obj);
    L.root.add(obj);
    L.built = true;
    L.opacity = -1;
  }

  _screenRight() {
    const r = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0);
    r.y = 0;
    return r.lengthSq() < 1e-6 ? r.set(1, 0, 0) : r.normalize();
  }

  _place(L) {
    this._build(L);
    L.py.x = L.baseY;
    L.t0 = this._time;
    L.fade = 0.001;
  }

  _introLayer(L, i, n) {
    L.t0 = this._time + 0.15 + i * 0.09;
    L.py.x = L.baseY + 2.4 + i * 0.12;
    L.ry.x = (i % 2 ? 1 : -1) * 0.8;
    L.kY = 150;
    L.cY = 13;
    L.fade = 0.18;
    this._squashAt = this._time + 0.15 + (n - 1) * 0.09 + 0.38;
  }

  /** Entra en arco desde el lado derecho de la pantalla y aterriza en su lugar. */
  _enterLayer(L, now) {
    const right = this._screenRight();
    L.axis.set(-right.z, 0, right.x);
    L.t0 = now + 0.08;
    L.fade = 0.16;
    L.path = {
      t0: L.t0, dur: 0.5, ease: ease.outCubic, landing: true,
      from: { x: right.x * 3.4, y: 0.9, z: right.z * 3.4 },
      ctrl: { x: right.x * 1.0, y: 1.3, z: right.z * 1.0 },
      ry: [1.4, 0], tilt: [-0.35, 0],
    };
    L.px.x = right.x * 3.4;
    L.pz.x = right.z * 3.4;
    L.py.x = L.baseY + 0.9;
  }

  /** Sale en arco hacia la izquierda, girando y desvaneciéndose. */
  _beginLeave(L) {
    const right = this._screenRight();
    L.leaving = true;
    L.t0 = this._time;
    L.axis.set(-right.z, 0, right.x);
    L.path = {
      t0: L.t0, dur: 0.5, ease: ease.inOutCubic, absolute: true,
      from: { x: L.px.x, y: L.py.x, z: L.pz.x },
      ctrl: { x: -right.x * 0.8, y: L.py.x + 0.9, z: -right.z * 0.8 },
      to: { x: -right.x * 3.6, y: L.py.x + 0.5, z: -right.z * 3.6 },
      ry: [L.ry.x, -1.3], tilt: [L.tilt.x, 0.4],
    };
  }

  /** Avanza una trayectoria (Bézier cuadrática con easing). Devuelve true si sigue en curso. */
  _followPath(L, now, ty) {
    const P = L.path;
    const t = clamp01((now - P.t0) / P.dur);
    const e = P.ease(t);
    const a = (1 - e) * (1 - e), b = 2 * (1 - e) * e, c = e * e;
    const to = P.to || { x: 0, y: ty, z: 0 };
    const off = P.absolute ? 0 : ty; // en la entrada, from/ctrl son relativos a la altura final
    L.px.x = a * P.from.x + b * P.ctrl.x + c * to.x;
    L.py.x = a * (P.from.y + off) + b * (P.ctrl.y + off) + c * to.y;
    L.pz.x = a * P.from.z + b * P.ctrl.z + c * to.z;
    L.ry.x = lerp(P.ry[0], P.ry[1], e);
    L.tilt.x = lerp(P.tilt[0], P.tilt[1], e);
    L.px.v = L.py.v = L.pz.v = L.ry.v = L.tilt.v = 0;
    if (t < 1) return true;
    L.path = null;
    if (P.landing) L.sc.v -= 0.9; // pequeño aplastón al aterrizar
    return false;
  }

  _sweepDead() {
    this.layers = this.layers.filter((L) => {
      if (!L.dead) return true;
      this.stack.remove(L.root);
      L.mats.forEach((m) => m.dispose());
      if (this._hovered === L) this._hovered = null;
      return false;
    });
  }

  _setOpacity(L, o) {
    o = clamp01(o);
    if (Math.abs(o - L.opacity) < 1e-3) return false;
    for (const m of L.mats) m.opacity = o;
    L.opacity = o;
    return true;
  }

  _pick(e) {
    for (const h of this._raycast(e)) {
      const L = this.layers.find((l) => l.id === h.object.userData.layerId);
      if (L && !L.leaving) return L;
    }
    return null;
  }

  _hover(e) {
    if (!this.opts.onLayerClick) return;
    const L = e ? this._pick(e) : null;
    const hov = L && L.removable ? L : null;
    if (hov !== this._hovered) {
      this._hovered = hov;
      this._setCursor(!!hov);
      this._kick();
    }
  }

  _tap(e) {
    if (!this.opts.onLayerClick) return;
    const L = this._pick(e);
    if (L && L.removable && L.label) this.opts.onLayerClick(L.label, L.kind);
  }

  _update(dt, now) {
    let active = false;

    // Construcción progresiva: como mucho una capa nueva por cuadro
    let built = false;
    for (const L of this.layers)
      if (!L.built && !L.leaving && now >= L.t0 - 0.15) {
        this._build(L);
        built = true;
        break;
      }

    // Hueco (la tapa "se abre" para dejar entrar / salir el ingrediente)
    const g = this.gap;
    if (g.target > 0 && now >= g.closeAt) g.target = 0;
    active = spring(g, g.target, 170, 17, dt) || active;
    if (g.target === 0 && Math.abs(g.x) < 0.002 && Math.abs(g.v) < 0.01) {
      g.x = 0;
      g.y = Infinity;
    }
    if (this._squashAt > 0) {
      active = true;
      if (now >= this._squashAt) {
        this.squash.v -= 1.5;
        this._squashAt = -1;
      }
    }
    active = spring(this.squash, 1, 260, 14, dt) || active;
    const sq = this.squash.x;
    const bulge = 1 + (1 - sq) * 0.55;
    this.stack.scale.set(bulge, sq, bulge);

    let topY = 0;
    let visible = false;
    for (const L of this.layers) {
      if (L.built && now >= L.t0) visible = true;
      if (!L.leaving) topY = Math.max(topY, L.baseY + L.height);
      if (!L.built || now < L.t0) {
        L.root.visible = false;
        if (L.t0 > now) active = true;
        continue;
      }
      L.root.visible = true;
      let tx = 0, tz = 0, ty = L.baseY + (L.baseY >= g.y ? g.x : 0), tr = 0, tt = 0;
      if (L.leaving) {
        // al terminar su trayectoria de salida se queda donde está hasta desaparecer
        tx = L.px.x;
        tz = L.pz.x;
        ty = L.py.x;
        tr = L.ry.x;
        tt = L.tilt.x;
      }
      let moving;
      if (L.path) moving = this._followPath(L, now, ty);
      else {
        moving = spring(L.py, ty, L.kY, L.cY, dt);
        moving = spring(L.px, tx, L.kXZ, L.cXZ, dt) || moving;
        moving = spring(L.pz, tz, L.kXZ, L.cXZ, dt) || moving;
        moving = spring(L.ry, tr, 70, 13, dt) || moving;
        moving = spring(L.tilt, tt, 110, 14, dt) || moving;
      }
      const lit = !L.leaving && (this._hovered === L || (this._highlight && L.norm === this._highlight));
      moving = spring(L.sc, lit ? 1.05 : 1, 320, 16, dt) || moving;
      if (spring(L.glow, lit ? 1 : 0, 120, 16, dt) || L.glow.x > 0.01) {
        // brillo cálido que respira mientras está resaltado
        const k = L.glow.x * (0.75 + 0.25 * Math.sin(now * 6)) * 0.42;
        for (const m of L.mats) m.emissive.setRGB(0.6 * k, 0.33 * k, 0.08 * k);
        moving = true;
      } else if (L.glow.x !== 0) {
        L.glow.x = 0;
        for (const m of L.mats) m.emissive.setRGB(0, 0, 0);
      }
      L.root.position.set(L.px.x, L.py.x, L.pz.x);
      L.root.quaternion.setFromAxisAngle(L.axis, L.tilt.x);
      L.root.rotateY(L.ry.x);
      const ls = L.sc.x, wide = ls < 1 ? 1 + (1 - ls) * 0.5 : ls; // aplastar en Y y ensanchar en XZ (conserva volumen)
      L.root.scale.set(wide, ls, wide);
      const life = now - L.t0;
      if (L.leaving) {
        moving = this._setOpacity(L, 1 - (life - 0.15) / 0.33) || moving;
        if (life > 0.55) L.dead = true;
      } else {
        moving = this._setOpacity(L, life / L.fade) || moving;
      }
      active = active || moving;
    }
    if (this.layers.some((l) => l.dead)) {
      this._sweepDead();
      active = true;
    }

    this.frameH = Math.max(topY, this.totalH || 1.4) + g.x;
    this.frameW = 1.55;
    return { active, built, visible };
  }
}

export default BurgerScene;
