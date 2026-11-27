/**
 * Pizza y sushi en 3D (mismo motor y estilo que la hamburguesa).
 *
 *  - Pizza: tabla de madera, borde inflado con manchas de horno, mozzarella con
 *    burbujas doradas, salsa que asoma y 8 marcas de corte. Los ingredientes
 *    (pepperoni, jamón, piña, champiñones, aceitunas, albahaca, maíz, tocineta,
 *    cebolla, pimentón, quesos) salen según el producto y caen o se van al
 *    quitarlos/agregarlos.
 *  - Sushi: pizarra negra con 6 piezas de roll vistas de corte (arroz, alga y
 *    rellenos de colores), cobertura según el roll, jengibre y wasabi.
 *
 * Todo con mallas instanciadas: pocas llamadas de dibujo, igual de fluido.
 */
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { THREE, mulberry32, fbm, clamp01, spline, joinProfiles, flatLine, latheGeo, displace, paint, solidColor, mesh, food, WHITE } from './core.js';

export const normText = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

/* ------------------------------------------------------------------ */
/* utilidades                                                          */
/* ------------------------------------------------------------------ */

/** Disco con malla polar (anillos × segmentos), cara hacia arriba. */
function polarDisc(R, rings, segs, yFn) {
  const pos = [];
  const idx = [];
  for (let i = 0; i <= rings; i++) {
    const r = (i / rings) * R;
    for (let j = 0; j <= segs; j++) {
      const a = (j / segs) * Math.PI * 2;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      pos.push(x, yFn(x, z, r, a), z);
    }
  }
  const row = segs + 1;
  for (let i = 0; i < rings; i++)
    for (let j = 0; j < segs; j++) {
      const a = i * row + j, b = a + 1, c = a + row, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  // cara hacia arriba (si quedó invertida, se da vuelta)
  if (g.attributes.normal.getY(Math.floor(g.attributes.normal.count / 2)) < 0) {
    const ix = g.index.array;
    for (let k = 0; k < ix.length; k += 3) [ix[k + 1], ix[k + 2]] = [ix[k + 2], ix[k + 1]];
    g.computeVertexNormals();
  }
  return g;
}

/** Puntos repartidos sin chocar dentro de un disco (siempre los mismos para una semilla). */
function scatter(n, R, minD, seed, avoid = []) {
  const r = mulberry32(seed);
  const pts = [];
  let tries = 0;
  while (pts.length < n && tries < n * 60) {
    tries++;
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * R;
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (pts.some((p) => (p.x - x) ** 2 + (p.z - z) ** 2 < minD * minD)) continue;
    if (avoid.some((p) => (p.x - x) ** 2 + (p.z - z) ** 2 < (minD * 0.8) ** 2)) continue;
    pts.push({ x, z, rot: r() * Math.PI * 2, s: 0.85 + r() * 0.3, t: r() });
  }
  return pts;
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _c = new THREE.Color();

function instanced(geo, mat, items, place) {
  if (!geo.attributes.color) solidColor(geo, WHITE);
  const im = new THREE.InstancedMesh(geo, mat, items.length);
  const pieceOf = new Int16Array(items.length);
  items.forEach((it, i) => {
    pieceOf[i] = it.pi ?? i;
    const t = place(it, i);
    _e.set(t.rx || 0, t.ry || 0, t.rz || 0);
    _q.setFromEuler(_e);
    _p.set(t.x, t.y, t.z);
    _s.set(t.sx ?? t.s ?? 1, t.sy ?? t.s ?? 1, t.sz ?? t.s ?? 1);
    _m.compose(_p, _q, _s);
    im.setMatrixAt(i, _m);
    if (t.color) im.setColorAt(i, _c.set(t.color));
  });
  im.castShadow = true;
  im.receiveShadow = true;
  im.userData.pieceOf = pieceOf;
  return im;
}

/* ------------------------------------------------------------------ */
/* PIZZA                                                               */
/* ------------------------------------------------------------------ */

export const PIZZA_R = 1.08; // radio del queso
const TOP_Y = 0.135; // altura de la superficie del queso (sobre la tabla)

/** Plato de cerámica oscura esmaltada (mismo estilo que el de la hamburguesa, más amplio). */
export function buildPizzaPlate(q) {
  const FLOOR = 0.07;
  const profile = [
    [0, FLOOR], [1.38, FLOOR], [1.48, FLOOR + 0.02], [1.6, FLOOR + 0.07], [1.7, FLOOR + 0.12],
    [1.77, FLOOR + 0.14], [1.8, FLOOR + 0.125], [1.78, FLOOR + 0.085], [1.68, 0.06], [1.45, 0.02], [1.2, 0.0], [0.02, 0.0],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const geo = new THREE.LatheGeometry(profile, Math.round(q.seg * 0.9));
  geo.computeVertexNormals();
  const glaze = food({ color: '#3a332d', bump: 'fine', bumpScale: 0.12, roughness: 0.2, clearcoat: 0.9, clearcoatRoughness: 0.12, env: 0.9 });
  const plate = mesh(geo, glaze);
  plate.castShadow = false; // su propia sombra sobre sí mismo dejaba manchas
  plate.receiveShadow = true;
  const g = new THREE.Group();
  g.add(plate);
  return g;
}

/** Masa: borde inflado con manchas de horno + queso derretido (una sola vez por tipo de queso). */
export function buildPizzaDough(q, cheese = 'mozzarella') {
  const group = new THREE.Group();
  const seg = Math.round(q.seg * 1.1);

  // borde de la masa: perfil girado, inflado e irregular
  const prof = joinProfiles(
    flatLine(0.02, PIZZA_R - 0.02, 0.08, 4),
    spline([[PIZZA_R - 0.02, 0.08], [PIZZA_R + 0.05, 0.17], [PIZZA_R + 0.13, 0.235], [PIZZA_R + 0.22, 0.2], [PIZZA_R + 0.26, 0.12], [PIZZA_R + 0.22, 0.08]], 16),
    flatLine(PIZZA_R + 0.22, 0.02, 0.075, 4)
  );
  const crust = latheGeo(prof, seg);
  crust.translate(0, 0, 0);
  crust.computeVertexNormals();
  const cs = 31;
  displace(crust, (v) => {
    const r = Math.hypot(v.x, v.z);
    if (r < PIZZA_R - 0.04) return 0;
    return fbm(v.x * 2.2, v.y * 3, v.z * 2.2, cs, 3) * 0.045 + Math.abs(fbm(v.x * 9, 2, v.z * 9, cs, 2)) * 0.01;
  });
  paint(crust, (v, n, c) => {
    const r = Math.hypot(v.x, v.z);
    const up = clamp01(n.y);
    // dorado con manchas de horno (leopardo) arriba, más claro abajo
    const char = clamp01((fbm(v.x * 6, 1, v.z * 6, 7, 3) - 0.18) * 4.5) * up;
    c.setRGB(0.8, 0.5, 0.22);
    c.lerp(_c.setRGB(0.93, 0.74, 0.45), clamp01(1 - up) * 0.6);
    c.lerp(_c.setRGB(0.3, 0.15, 0.06), char * 0.9);
    if (r < PIZZA_R - 0.04) c.setRGB(0.72, 0.45, 0.2);
  });
  group.add(mesh(crust, food({ bump: 'crust', bumpScale: 1.6, roughness: 0.6, clearcoat: 0.12, sheen: 0.35 })));

  // queso derretido con burbujas, salsa que asoma y cortes
  const quattro = cheese === 'quattro';
  const disc = polarDisc(PIZZA_R, Math.round(26 * q.detail + 8), seg, (x, z, r, a) => {
    const edge = clamp01((r - (PIZZA_R - 0.12)) / 0.12);
    const bubbles = Math.max(0, fbm(x * 5.5, 3, z * 5.5, 13, 2) - 0.1) * 0.05;
    const cut = Math.pow(Math.abs(Math.cos(a * 4)), 60) * (r > 0.08 ? 1 : 0); // 8 cortes
    return TOP_Y - edge * 0.035 + bubbles + fbm(x * 2.5, 0, z * 2.5, 5, 2) * 0.012 - cut * 0.012;
  });
  paint(disc, (v, n, c) => {
    const r = Math.hypot(v.x, v.z);
    const a = Math.atan2(v.z, v.x);
    const sauceEdge = clamp01((r - (PIZZA_R - 0.17)) / 0.08) * clamp01(0.55 + fbm(v.x * 7, 0, v.z * 7, 21, 2) * 2);
    const sauceSpots = clamp01((-fbm(v.x * 4.2, 11, v.z * 4.2, 33, 2) - 0.2) * 3) * 0.85;
    const sauce = Math.max(sauceEdge, sauceSpots);
    const brown = clamp01((fbm(v.x * 6.5, 5, v.z * 6.5, 17, 3) - 0.05) * 3.4);
    const cut = Math.pow(Math.abs(Math.cos(a * 4)), 60) * (r > 0.08 ? 1 : 0);
    if (quattro) {
      // parches de quesos: blanco, amarillo y crema
      const pick = fbm(v.x * 3, 9, v.z * 3, 27, 2);
      c.set(pick > 0.12 ? '#f4ead0' : pick < -0.12 ? '#f0b94a' : '#f2d391');
    } else c.set('#f1cf86');
    c.lerp(_c.set('#b06a26'), brown * 0.8);
    c.lerp(_c.set('#a8301a'), sauce);
    c.lerp(_c.set('#8f6a3e'), cut * 0.6);
  });
  group.add(mesh(disc, food({ bump: 'fine', bumpScale: 0.6, roughness: 0.42, clearcoat: 0.45, clearcoatRoughness: 0.3, sheen: 0.4, sheenColor: '#ffe7b0' })));
  return group;
}

const TOPPING_RULES = [
  ['pepperoni', /pepperoni|salami/],
  ['jamon', /jamon/],
  ['pina', /pina|anana/],
  ['champinon', /champi|hongo|portobello/],
  ['aceituna', /aceituna|oliva negra/],
  ['albahaca', /albahaca/],
  ['maiz', /maiz|jojoto/],
  ['tocineta', /tocineta|tocino|bacon|panceta/],
  ['cebolla', /cebolla/],
  ['pimenton', /pimenton|pimiento|aji/],
  ['quesoazul', /queso azul|roquefort|gorgonzola/],
  ['parmesano', /parmesano|grana/],
];

/** Qué ingredientes de pizza aparecen según los textos (ingredientes, extras, nombre). */
export function pizzaToppings(texts) {
  const t = normText(texts.join(' · '));
  const out = TOPPING_RULES.filter(([, re]) => re.test(t)).map(([k]) => k);
  // "extra queso": más queso (se nota en la cantidad de burbujas doradas, no hace falta otra pieza)
  return out;
}

/** Un tipo de ingrediente repartido sobre la pizza (una malla instanciada). */
export function buildTopping(kind, q) {
  const D = q.detail;
  const R = PIZZA_R - 0.16;
  const g = new THREE.Group();
  let geo, mat, items, place;
  const seedOf = { pepperoni: 11, jamon: 23, pina: 37, champinon: 41, aceituna: 53, albahaca: 61, maiz: 71, tocineta: 83, cebolla: 97, pimenton: 101, quesoazul: 113, parmesano: 127 }[kind] || 5;
  switch (kind) {
    case 'pepperoni': {
      geo = new THREE.CylinderGeometry(0.115, 0.11, 0.026, Math.round(22 * D + 8), 2);
      // se curva como taza al hornearse
      displace(geo, (v, n) => (n.y > 0.5 ? Math.hypot(v.x, v.z) ** 2 * 0.9 : 0));
      paint(geo, (v, n, c) => c.set('#9b2615').lerp(_c.set('#5e1309'), clamp01(fbm(v.x * 30, 0, v.z * 30, 3, 2) + 0.3) * 0.6));
      mat = food({ bump: 'fine', bumpScale: 0.8, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.2 });
      items = scatter(13, R, 0.27, seedOf);
      place = (p) => ({ x: p.x, y: TOP_Y + 0.03, z: p.z, ry: p.rot, rx: (p.t - 0.5) * 0.12, s: p.s });
      break;
    }
    case 'jamon': {
      geo = new RoundedBoxGeometry(0.17, 0.018, 0.14, 2, 0.01);
      paint(geo, (v, n, c) => c.set('#e8a0a0').lerp(_c.set('#f4c6c0'), clamp01(fbm(v.x * 20, 1, v.z * 20, 4, 2) + 0.5)));
      mat = food({ bumpScale: 0.5, roughness: 0.4, clearcoat: 0.5 });
      items = scatter(11, R, 0.25, seedOf);
      place = (p) => ({ x: p.x, y: TOP_Y + 0.022, z: p.z, ry: p.rot, rz: (p.t - 0.5) * 0.15, s: p.s });
      break;
    }
    case 'pina': {
      geo = new RoundedBoxGeometry(0.12, 0.05, 0.08, 2, 0.012);
      displace(geo, (v) => (v.x > 0 ? -v.y * 0.3 : 0));
      solidColor(geo, WHITE);
      mat = food({ color: '#f2c94c', bump: 'fine', bumpScale: 1.4, roughness: 0.25, clearcoat: 0.7 });
      items = scatter(13, R, 0.2, seedOf);
      place = (p) => ({ x: p.x, y: TOP_Y + 0.028, z: p.z, ry: p.rot, s: p.s });
      break;
    }
    case 'champinon': {
      const s = new THREE.Shape();
      // corte de champiñón: sombrero redondo + tallo
      s.absarc(0, 0.02, 0.085, 0, Math.PI, false);
      s.lineTo(-0.03, 0.02);
      s.lineTo(-0.028, -0.07);
      s.lineTo(0.028, -0.07);
      s.lineTo(0.03, 0.02);
      s.lineTo(0.085, 0.02);
      geo = new THREE.ExtrudeGeometry(s, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 1, curveSegments: 12 });
      geo.rotateX(-Math.PI / 2);
      paint(geo, (v, n, c) => c.set('#d8c3a4').lerp(_c.set('#8a6a4a'), clamp01((Math.hypot(v.x, v.z - 0.02) - 0.06) * 30)));
      mat = food({ bumpScale: 0.4, roughness: 0.45, clearcoat: 0.3 });
      items = scatter(12, R, 0.22, seedOf);
      place = (p) => ({ x: p.x, y: TOP_Y + 0.012, z: p.z, ry: p.rot, s: p.s });
      break;
    }
    case 'aceituna': {
      geo = new THREE.TorusGeometry(0.045, 0.02, 8, Math.round(16 * D + 6));
      geo.rotateX(Math.PI / 2);
      solidColor(geo, WHITE);
      mat = food({ color: '#1f1b19', bumpScale: 0, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08 });
      items = scatter(14, R, 0.18, seedOf);
      place = (p) => ({ x: p.x, y: TOP_Y + 0.018, z: p.z, ry: p.rot, rx: (p.t - 0.5) * 0.3, s: p.s });
      break;
    }
    case 'albahaca': {
      geo = new THREE.SphereGeometry(0.14, 14, 6);
      geo.scale(1, 0.1, 0.55);
      displace(geo, (v) => -Math.abs(v.z) * 0.08);
      paint(geo, (v, n, c) => c.set('#2f6d1f').lerp(_c.set('#4f9a33'), clamp01(0.5 - Math.abs(v.z) * 6)));
      mat = food({ bumpScale: 0.3, roughness: 0.3, clearcoat: 0.6, sheen: 0.3, sheenColor: '#d6ffb0' });
      items = scatter(7, R * 0.85, 0.3, seedOf);
      place = (p) => ({ x: p.x, y: TOP_Y + 0.03, z: p.z, ry: p.rot, rx: 0.15, s: p.s });
      break;
    }
    case 'maiz': {
      geo = new THREE.SphereGeometry(0.028, 8, 6);
      geo.scale(1, 0.75, 0.85);
      solidColor(geo, WHITE);
      mat = food({ color: '#f4c22f', bumpScale: 0, roughness: 0.25, clearcoat: 0.8 });
      items = scatter(32, R, 0.09, seedOf);
      place = (p) => ({ x: p.x, y: TOP_Y + 0.025, z: p.z, ry: p.rot, s: p.s });
      break;
    }
    case 'tocineta': {
      geo = new RoundedBoxGeometry(0.22, 0.02, 0.065, 2, 0.008);
      displace(geo, (v) => Math.sin(v.x * 28) * 0.012);
      paint(geo, (v, n, c) => c.set('#8b3a22').lerp(_c.set('#e6b38a'), clamp01(Math.sin(v.z * 90) * 0.5 + 0.1)));
      mat = food({ bumpScale: 0.6, roughness: 0.38, clearcoat: 0.6 });
      items = scatter(10, R, 0.26, seedOf);
      place = (p) => ({ x: p.x, y: TOP_Y + 0.025, z: p.z, ry: p.rot, s: p.s });
      break;
    }
    case 'cebolla': {
      geo = new THREE.TorusGeometry(0.07, 0.01, 6, Math.round(18 * D + 6), Math.PI * 1.6);
      geo.rotateX(Math.PI / 2);
      solidColor(geo, WHITE);
      mat = food({ color: '#d9b3d0', bumpScale: 0, roughness: 0.3, clearcoat: 0.7 });
      items = scatter(10, R, 0.22, seedOf);
      place = (p) => ({ x: p.x, y: TOP_Y + 0.02, z: p.z, ry: p.rot, s: p.s });
      break;
    }
    case 'pimenton': {
      geo = new RoundedBoxGeometry(0.17, 0.02, 0.035, 2, 0.008);
      displace(geo, (v) => Math.cos(v.x * 14) * 0.012);
      solidColor(geo, WHITE);
      mat = food({ bumpScale: 0, roughness: 0.22, clearcoat: 0.9 });
      items = scatter(12, R, 0.2, seedOf);
      place = (p) => ({ x: p.x, y: TOP_Y + 0.022, z: p.z, ry: p.rot, s: p.s, color: p.t > 0.5 ? '#c4271b' : '#3f8a26' });
      break;
    }
    case 'quesoazul': {
      geo = new THREE.SphereGeometry(0.05, 10, 6);
      displace(geo, (v) => fbm(v.x * 40, v.y * 40, v.z * 40, 2, 2) * 0.012);
      geo.scale(1, 0.55, 1);
      paint(geo, (v, n, c) => c.set('#e8ecef').lerp(_c.set('#5f7486'), clamp01(fbm(v.x * 60, v.y * 60, v.z * 60, 9, 2) * 2.5)));
      mat = food({ bumpScale: 0.6, roughness: 0.55, clearcoat: 0.2 });
      items = scatter(12, R, 0.2, seedOf);
      place = (p) => ({ x: p.x, y: TOP_Y + 0.02, z: p.z, ry: p.rot, s: p.s });
      break;
    }
    case 'parmesano': {
      geo = new THREE.BoxGeometry(0.07, 0.008, 0.035);
      solidColor(geo, WHITE);
      mat = food({ color: '#f5ecd2', bumpScale: 0.3, roughness: 0.6 });
      items = scatter(26, R, 0.1, seedOf);
      place = (p) => ({ x: p.x, y: TOP_Y + 0.03, z: p.z, ry: p.rot, rz: (p.t - 0.5) * 0.4, s: p.s });
      break;
    }
    default:
      return g;
  }
  g.add(instanced(geo, mat, items, place));
  return g;
}

/* ------------------------------------------------------------------ */
/* SUSHI                                                               */
/* ------------------------------------------------------------------ */

const FILLINGS = [
  ['salmon', /salmon/, '#f08a5d'],
  ['atun', /atun|tuna/, '#b3263a'],
  ['kanikama', /kanikama|cangrejo|surimi/, '#f05a48'],
  ['langostino', /langostino|ebi|camaron|tempura/, '#e8b04a'],
  ['platano', /platano|maduro/, '#e0a23a'],
  ['aguacate', /aguacate|palta/, '#8fbf3f'],
  ['pepino', /pepino/, '#bfe08a'],
  ['quesocrema', /queso crema|philadelphia|crema/, '#f7f3ea'],
  ['tocineta', /tocineta|tocino|bacon/, '#8b3a22'],
];

/** Tipo de roll y lo que lleva, a partir de nombre + ingredientes. */
export function sushiSpec(name, texts) {
  const n = normText(name);
  const t = normText([name, ...texts].join(' · '));
  const fillings = FILLINGS.filter(([, re]) => re.test(t)).slice(0, 4);
  let top = 'sesame';
  if (/philadelphia/.test(n)) top = 'salmon';
  else if (/spicy|picante/.test(n)) top = 'spicy';
  else if (/tempura|ebi/.test(n)) top = 'tempura';
  else if (/criollo|platano/.test(n)) top = 'platano';
  const eel = /anguila|teriyaki|unagi/.test(t) || top === 'tempura' || top === 'platano';
  const cebollin = /cebollin|ciboulette/.test(t);
  return { fillings: fillings.map(([k, , hex]) => ({ k, hex })), top, eel, cebollin, key: [fillings.map((f) => f[0]).join(','), top, eel, cebollin].join('|') };
}

const PIECE_R = 0.25, PIECE_H = 0.26;
const PIECES = [-0.95, -0.57, -0.19, 0.19, 0.57, 0.95].map((x, i) => ({ x, z: (i % 2 ? 0.05 : -0.05), ry: i * 1.7 }));
const SLATE_Y = 0.07;

/** Pizarra negra + jengibre + wasabi (no cambian entre rolls). */
export function buildSushiBoard(q) {
  void q; // misma firma que los demás modelos (calidad); la pizarra no depende de ella
  const group = new THREE.Group();
  const slate = new RoundedBoxGeometry(2.7, 0.07, 1.25, 3, 0.03);
  slate.translate(0, 0.035, 0.1);
  paint(slate, (v, n, c) => c.set('#2b2a2c').lerp(_c.set('#3a393c'), clamp01(fbm(v.x * 4, 0, v.z * 4, 3, 3) + 0.4)));
  group.add(mesh(slate, food({ bump: 'fine', bumpScale: 1.2, roughness: 0.55, clearcoat: 0.25, clearcoatRoughness: 0.5 })));
  // jengibre: pétalos rosados
  const petal = new THREE.SphereGeometry(0.11, 14, 8);
  petal.scale(1, 0.18, 0.7);
  for (let i = 0; i < 4; i++) {
    const m = mesh(petal.clone(), food({ color: '#f3b9b2', bumpScale: 0.2, roughness: 0.3, clearcoat: 0.8 }));
    m.position.set(1.02 + (i % 2) * 0.06, SLATE_Y + 0.03 + i * 0.022, 0.5 - i * 0.04);
    m.rotation.set(0.3 - i * 0.15, i * 0.9, 0.2);
    group.add(m);
  }
  // wasabi
  const w = new THREE.SphereGeometry(0.09, 16, 10);
  w.scale(1, 0.75, 1);
  displace(w, (v) => fbm(v.x * 22, v.y * 22, v.z * 22, 4, 2) * 0.012);
  const wm = mesh(w, food({ color: '#9bbf3b', bump: 'fine', bumpScale: 1.2, roughness: 0.6 }));
  wm.position.set(0.72, SLATE_Y + 0.055, 0.55);
  group.add(wm);
  return group;
}

/** Las 6 piezas de un roll (instanciadas por parte). */
export function buildSushiRolls(q, spec) {
  const group = new THREE.Group();
  const seg = Math.round(q.seg * 0.5 + 10);
  const at = (extraY = 0, sx = 1, sy = 1, sz = 1) => (p) => ({ x: p.x, y: SLATE_Y + extraY, z: p.z + 0.12, ry: p.ry, sx, sy, sz });

  // arroz: cilindro con grano
  const rice = new THREE.CylinderGeometry(PIECE_R, PIECE_R, PIECE_H, seg, 3);
  rice.translate(0, PIECE_H / 2, 0);
  // grano en los lados; la cara del corte queda casi plana (ahí se ven los rellenos)
  displace(rice, (v, n) => (1 - Math.abs(n.y) * 0.85) * (fbm(v.x * 38, v.y * 38, v.z * 38, 7, 2) * 0.014 + Math.abs(fbm(v.x * 70, v.y * 70, v.z * 70, 3, 1)) * 0.007));
  paint(rice, (v, n, c) => c.set('#f5f1e7').lerp(_c.set('#e3d9c4'), clamp01(fbm(v.x * 50, v.y * 50, v.z * 50, 5, 2) + 0.4) * 0.55));
  group.add(instanced(rice, food({ bump: 'crumb', bumpScale: 1.6, roughness: 0.6, clearcoat: 0.15, sheen: 0.4, sheenColor: '#ffffff' }), PIECES, at()));

  // alga (nori) en anillo por dentro del arroz (uramaki)
  const nori = new THREE.CylinderGeometry(0.175, 0.175, PIECE_H + 0.006, seg, 1, true);
  nori.translate(0, PIECE_H / 2, 0);
  solidColor(nori, WHITE);
  const noriMat = food({ color: '#1d2a1a', bumpScale: 0.5, roughness: 0.5, side: THREE.DoubleSide });
  group.add(instanced(nori, noriMat, PIECES, at()));
  // en la cara del corte: anillo de alga y adentro el arroz claro
  const noriTop = new THREE.RingGeometry(0.16, 0.19, seg);
  noriTop.rotateX(-Math.PI / 2);
  solidColor(noriTop, WHITE);
  const noriTopMat = food({ color: '#1a2617', bumpScale: 0.4, roughness: 0.5 });
  noriTopMat.polygonOffset = true;
  noriTopMat.polygonOffsetFactor = -2;
  group.add(instanced(noriTop, noriTopMat, PIECES, at(PIECE_H + 0.006)));

  // rellenos: se ven en el corte (cara de arriba)
  const fills = spec.fillings.length ? spec.fillings : [{ k: 'pepino', hex: '#bfe08a' }];
  const slots = fills.length === 1 ? [[0, 0]] : fills.length === 2 ? [[-0.06, 0], [0.06, 0]] : fills.length === 3 ? [[-0.07, -0.04], [0.07, -0.04], [0, 0.07]] : [[-0.06, -0.06], [0.06, -0.06], [-0.06, 0.06], [0.06, 0.06]];
  const fr = fills.length === 1 ? 0.12 : fills.length === 2 ? 0.075 : 0.068;
  fills.forEach((f, i) => {
    const fg = new THREE.CylinderGeometry(fr, fr, 0.016, 16, 1);
    if (f.k === 'salmon' || f.k === 'atun') paint(fg, (v, n, c) => c.set(f.hex).lerp(_c.set('#ffffff'), Math.pow(Math.abs(Math.sin((v.x + v.z) * 60)), 14) * 0.6));
    else solidColor(fg, new THREE.Color(f.hex));
    const fmat = food({ bumpScale: 0.3, roughness: 0.3, clearcoat: 0.6 });
    fmat.polygonOffset = true;
    fmat.polygonOffsetFactor = -3;
    const [ox, oz] = slots[i];
    group.add(
      instanced(fg, fmat, PIECES, (p) => {
        const c = Math.cos(p.ry), s = Math.sin(p.ry);
        return { x: p.x + ox * c - oz * s, y: SLATE_Y + PIECE_H + 0.005, z: p.z + 0.12 + ox * s + oz * c, ry: p.ry };
      })
    );
  });

  // cobertura según el roll
  if (spec.top === 'sesame') {
    const seed = new THREE.SphereGeometry(0.012, 6, 4);
    seed.scale(1.6, 0.6, 1);
    solidColor(seed, WHITE);
    const r = mulberry32(17);
    const seeds = [];
    PIECES.forEach((p, pi) => {
      for (let k = 0; k < Math.round(q.sesame * 0.5); k++) {
        const a = r() * Math.PI * 2, y = r() * PIECE_H;
        seeds.push({ pi, x: p.x + Math.cos(a) * (PIECE_R + 0.004), y: SLATE_Y + y, z: p.z + 0.12 + Math.sin(a) * (PIECE_R + 0.004), ry: -a, color: r() > 0.25 ? '#f3ead2' : '#2a2420' });
      }
    });
    group.add(instanced(seed, food({ bumpScale: 0, roughness: 0.4, clearcoat: 0.5 }), seeds, (s) => ({ x: s.x, y: s.y, z: s.z, ry: s.ry, rz: Math.PI / 2, color: s.color })));
  } else if (spec.top === 'salmon') {
    // lámina de salmón: ovalada y fina, con las vetas blancas, que cae por los lados de la pieza
    const sl = new THREE.CylinderGeometry(0.27, 0.27, 0.03, 28, 1);
    sl.scale(1, 1, 0.62);
    displace(sl, (v) => -(Math.max(0, Math.abs(v.x) - 0.12) ** 2) * 3.2);
    paint(sl, (v, n, c) => c.set('#f27f52').lerp(_c.set('#ffe4d6'), Math.pow(Math.abs(Math.sin((v.x * 0.6 + v.z) * 34)), 12) * 0.75).lerp(_c.set('#d8623a'), n.y < 0.3 ? 0.35 : 0));
    group.add(instanced(sl, food({ bumpScale: 0.25, roughness: 0.22, clearcoat: 0.9, clearcoatRoughness: 0.15, sheen: 0.3, sheenColor: '#ffd2bd' }), PIECES, (p) => ({ x: p.x, y: SLATE_Y + PIECE_H + 0.02, z: p.z + 0.12, ry: 0.4 + p.ry * 0.15 })));
  } else if (spec.top === 'spicy') {
    const dot = new THREE.SphereGeometry(0.09, 16, 10);
    dot.scale(1, 0.45, 1);
    solidColor(dot, WHITE);
    group.add(instanced(dot, food({ color: '#f07c3a', bumpScale: 0, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.1 }), PIECES, at(PIECE_H + 0.012)));
  } else if (spec.top === 'tempura') {
    const flake = new THREE.IcosahedronGeometry(0.03, 0);
    solidColor(flake, WHITE);
    const r = mulberry32(29);
    const fl = [];
    PIECES.forEach((p, pi) => {
      for (let k = 0; k < 16; k++) {
        const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 0.2;
        fl.push({ pi, x: p.x + Math.cos(a) * d, z: p.z + 0.12 + Math.sin(a) * d, s: 0.6 + r() * 0.8, ry: r() * 6, color: r() > 0.5 ? '#e8b04a' : '#d4902e' });
      }
    });
    group.add(instanced(flake, food({ bump: 'crust', bumpScale: 1.4, roughness: 0.55, clearcoat: 0.3 }), fl, (f) => ({ x: f.x, y: SLATE_Y + PIECE_H + 0.03, z: f.z, ry: f.ry, rx: f.ry, s: f.s, color: f.color })));
  } else if (spec.top === 'platano') {
    const sl = new THREE.CylinderGeometry(0.17, 0.17, 0.035, 18, 1);
    sl.scale(1, 1, 0.62);
    paint(sl, (v, n, c) => c.set('#e6a73c').lerp(_c.set('#7a3e14'), clamp01(Math.hypot(v.x, v.z / 0.62) * 6 - 0.6) * (n.y > 0.5 ? 0.7 : 1)));
    group.add(instanced(sl, food({ bumpScale: 0.4, roughness: 0.3, clearcoat: 0.8 }), PIECES, (p) => ({ x: p.x, y: SLATE_Y + PIECE_H + 0.02, z: p.z + 0.12, ry: 0.4 })));
  }
  if (spec.cebollin) {
    const bit = new THREE.CylinderGeometry(0.012, 0.012, 0.012, 6, 1, true);
    solidColor(bit, WHITE);
    const r = mulberry32(43);
    const bits = [];
    PIECES.forEach((p, pi) => {
      for (let k = 0; k < 7; k++) bits.push({ pi, x: p.x + (r() - 0.5) * 0.18, z: p.z + 0.12 + (r() - 0.5) * 0.18, rx: r() * 3, rz: r() * 3 });
    });
    group.add(instanced(bit, food({ color: '#4d9a2c', bumpScale: 0, roughness: 0.35, clearcoat: 0.6 }), bits, (b) => ({ x: b.x, y: SLATE_Y + PIECE_H + (spec.top === 'spicy' ? 0.05 : 0.02), z: b.z, rx: b.rx, rz: b.rz })));
  }
  // salsa anguila en zigzag sobre las piezas
  if (spec.eel) {
    const pts = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      const x = -1.15 + t * 2.3;
      pts.push(new THREE.Vector3(x, SLATE_Y + PIECE_H + (spec.top === 'sesame' ? 0.012 : 0.06), 0.12 + Math.sin(t * Math.PI * 7) * 0.14));
    }
    const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), Math.round(140 * q.detail + 40), 0.014, 6, false);
    solidColor(tube, WHITE);
    const eel = mesh(tube, food({ color: '#4a2611', bumpScale: 0, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05 }));
    eel.name = 'eel';
    group.add(eel);
  }
  return group;
}

/* ------------------------------------------------------------------ */
/* PIZZA CON FOTO REAL                                                 */
/* La foto (vista desde arriba) se pone sobre una malla con la forma   */
/* sacada de la misma foto: borde inflado, mozzarella y albahaca con   */
/* volumen. Ver scripts/bake-pizza.py (arma las texturas y alturas).   */
/* ------------------------------------------------------------------ */

const PHOTO_DIR = '/food/pizza/';
export const PHOTO_R = 1.32; // radio de la pizza en la escena
let _photoAssets = null;

function loadHeights(url) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const x = c.getContext('2d', { willReadFrequently: true });
      x.drawImage(img, 0, 0);
      const d = x.getImageData(0, 0, c.width, c.height).data;
      const h = new Float32Array(c.width * c.height);
      for (let i = 0; i < h.length; i++) h[i] = d[i * 4] / 255;
      res({ w: c.width, h: c.height, data: h });
    };
    img.onerror = rej;
    img.src = url;
  });
}

/** Carga (una sola vez) las fotos y las alturas de la pizza. */
export function loadPizzaPhoto() {
  if (_photoAssets) return _photoAssets;
  const loader = new THREE.TextureLoader();
  const tex = (f, srgb = true) =>
    new Promise((res, rej) =>
      loader.load(
        PHOTO_DIR + f,
        (t) => {
          if (srgb) t.colorSpace = THREE.SRGBColorSpace;
          t.anisotropy = 8;
          res(t);
        },
        undefined,
        rej
      )
    );
  _photoAssets = Promise.all([
    fetch(PHOTO_DIR + 'meta.json').then((r) => r.json()),
    tex('pizza-margarita.webp'),
    tex('pizza-base.webp'),
    tex('pizza-blanca.webp'),
    tex('pizza-aux.webp', false),
    loadHeights(PHOTO_DIR + 'pizza-h-margarita.png'),
    loadHeights(PHOTO_DIR + 'pizza-h-base.png'),
  ]).then(([meta, margarita, base, blanca, aux, hMarg, hBase]) => ({ meta, tex: { margarita, base, blanca }, aux, heights: { margarita: hMarg, base: hBase } }));
  _photoAssets.catch(() => (_photoAssets = null)); // si falla la red, se reintenta la próxima vez
  return _photoAssets;
}

/** Valor del mapa polar (filas = radio 0..1, columnas = ángulo) con interpolación. */
function polarSample(hm, rho, a) {
  const fx = ((a / (Math.PI * 2)) * hm.w + hm.w) % hm.w;
  const fy = Math.min(hm.h - 1, Math.max(0, rho * (hm.h - 1)));
  const x0 = Math.floor(fx), y0 = Math.floor(fy);
  const x1 = (x0 + 1) % hm.w, y1 = Math.min(hm.h - 1, y0 + 1);
  const tx = fx - x0, ty = fy - y0;
  const d = hm.data;
  const top = d[y0 * hm.w + x0] * (1 - tx) + d[y0 * hm.w + x1] * tx;
  const bot = d[y1 * hm.w + x0] * (1 - tx) + d[y1 * hm.w + x1] * tx;
  return top * (1 - ty) + bot * ty;
}

/**
 * Pizza con la foto. `look`: 'margarita' (con albahaca), 'base' (sin albahaca) o
 * 'blanca' (sin salsa, para cuatro quesos).
 */
export function buildPhotoPizza(q, assets, look = 'base') {
  const { meta, tex, aux, heights } = assets;
  const hm = look === 'margarita' ? heights.margarita : heights.base;
  const ro = meta.ro;
  const NA = ro.length;
  const rings = Math.round(40 + 56 * q.detail); // 96 / 79 / 68
  const segs = Math.round(120 + 160 * q.detail); // 280 / 232 / 200
  const pos = [], uv = [], idx = [];
  const half = meta.half, hmax = meta.hmax;
  // anillos de arriba + "falda": el costado redondeado del borde, que baja hasta el plato
  const SKIRT = 7;
  const total = rings + SKIRT;
  for (let i = 0; i <= total; i++) {
    let rho, uvRho, u = -1;
    if (i <= rings) {
      // más anillos cerca del borde (ahí está el relieve del borde inflado)
      const t = i / rings;
      rho = uvRho = 1 - (1 - t) * (1 - t) * 0.35 - (1 - t) * 0.65;
    } else {
      u = (i - rings) / SKIRT;
      rho = 1 + 0.035 * Math.sin(u * Math.PI * 0.8);
      uvRho = 1 - 0.035 * u; // el costado repite la textura del borde (como un espejo)
    }
    for (let j = 0; j <= segs; j++) {
      const a = (j / segs) * Math.PI * 2;
      const fa = (a / (Math.PI * 2)) * NA;
      const k0 = Math.floor(fa) % NA, k1 = (k0 + 1) % NA;
      const rEdge = ro[k0] + (ro[k1] - ro[k0]) * (fa - Math.floor(fa));
      const c = Math.cos(a), s = Math.sin(a);
      let y = polarSample(hm, Math.min(rho, 1), a) * hmax;
      if (u >= 0) y *= Math.cos(u * Math.PI * 0.5) ** 0.7;
      pos.push(c * rho * rEdge * PHOTO_R, y * PHOTO_R, s * rho * rEdge * PHOTO_R);
      uv.push(0.5 + (c * uvRho * rEdge) / (2 * half), 1 - (0.5 + (s * uvRho * rEdge) / (2 * half)));
    }
  }
  const row = segs + 1;
  for (let i = 0; i < total; i++)
    for (let j = 0; j < segs; j++) {
      const a = i * row + j, b = a + 1, c = a + row, d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  // las normales del centro (todos los vértices en el mismo punto) quedan raras: hacia arriba
  for (let j = 0; j <= segs; j++) g.attributes.normal.setXYZ(j, 0, 1, 0);
  const low = q.name === 'low';
  const mat = new THREE.MeshPhysicalMaterial({
    map: tex[look] || tex.base,
    bumpMap: aux,
    bumpScale: 1.4,
    roughnessMap: aux,
    roughness: 1,
    metalness: 0,
    clearcoat: low ? 0 : 0.35,
    clearcoatRoughness: 0.35,
    sheen: low ? 0 : 0.25,
    sheenColor: new THREE.Color(1, 0.88, 0.7),
    sheenRoughness: 0.55,
    envMapIntensity: 0.8,
    transparent: true,
  });
  const m = new THREE.Mesh(g, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  m.position.y = 0.072; // apoyada en el plato
  const group = new THREE.Group();
  group.add(m);
  return group;
}
