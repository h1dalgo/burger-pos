/**
 * ItemScene — bebidas, entradas y postres en 3D (mismo motor que la hamburguesa).
 *
 * Uso:
 *   const item = new ItemScene(div);
 *   item.setProduct({ variant: 'drink', name: 'Jarra de Jugo', choices: ['Fresa'] });
 *
 * Modelos:
 *  - Refresco (botella PET con burbujas), jarra (Nestea / jugos) y vaso con pitillo.
 *    Al cambiar de sabor el líquido se vacía y se vuelve a llenar con el nuevo color.
 *  - Entradas: cesta roja con papel a cuadros, alitas, papas con cheddar y tocineta.
 *    Cada salsa elegida aparece en su envase.
 *  - Postres: paleta artesanal con mordisco; gira y cambia de sabor.
 */
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {
  THREE, mergeGeometries, Stage, fromTemplate, materialsOf, spring, sp, clamp01, smooth, lerp, mulberry32, fbm, spline, flatLine,
  joinProfiles, latheGeo, displace, paint, solidColor, col, mesh, food, canvasTex, TEXTURES,
} from './core.js';
import { buildPizzaPlate, buildPizzaDough, buildTopping, pizzaToppings, buildSushiBoard, buildSushiRolls, sushiSpec, normText } from './PizzaSushi.js';
import { Atmosphere } from './atmosphere.js';

/* ------------------------------------------------------------------ */
/* Texturas propias                                                    */
/* ------------------------------------------------------------------ */

Object.assign(TEXTURES, {
  checker: () =>
    canvasTex(
      256, 256,
      (g, s) => {
        const n = 4, c = s / n;
        for (let y = 0; y < n; y++)
          for (let x = 0; x < n; x++) {
            g.fillStyle = (x + y) % 2 ? '#f7f1e6' : '#c8261e';
            g.fillRect(x * c, y * c, c, c);
          }
        const r = mulberry32(4);
        for (let i = 0; i < 2500; i++) {
          g.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '90,40,20'},${0.04 + r() * 0.08})`;
          g.fillRect(r() * s, r() * s, 1 + r() * 2, 1 + r() * 2);
        }
      },
      { srgb: true, repeat: [3, 2] }
    ),
  label: () =>
    canvasTex(
      1024, 256,
      (g, w, h) => {
        g.fillStyle = '#c91f17';
        g.fillRect(0, 0, w, h);
        g.fillStyle = '#ffffff';
        g.beginPath();
        g.moveTo(0, h * 0.62);
        for (let x = 0; x <= w; x += 8) g.lineTo(x, h * 0.62 + Math.sin((x / w) * Math.PI * 4) * 22);
        g.lineTo(w, h * 0.74);
        for (let x = w; x >= 0; x -= 8) g.lineTo(x, h * 0.74 + Math.sin((x / w) * Math.PI * 4 + 0.6) * 18);
        g.closePath();
        g.fill();
        g.font = 'italic 900 92px Arial, sans-serif';
        g.textBaseline = 'middle';
        for (const x of [40, 552]) {
          g.fillText('REFRESCO', x, h * 0.36);
          g.font = '700 40px Arial, sans-serif';
          g.fillText('1,5 L', x + 330, h * 0.88);
          g.font = 'italic 900 92px Arial, sans-serif';
        }
      },
      { srgb: true }
    ),
  wood: () =>
    canvasTex(
      128, 256,
      (g, w, h) => {
        g.fillStyle = '#dcb682';
        g.fillRect(0, 0, w, h);
        const r = mulberry32(8);
        for (let i = 0; i < 26; i++) {
          g.strokeStyle = `rgba(150,105,55,${0.12 + r() * 0.2})`;
          g.lineWidth = 1 + r() * 2;
          const x = r() * w;
          g.beginPath();
          g.moveTo(x, 0);
          g.bezierCurveTo(x + (r() - 0.5) * 12, h * 0.3, x + (r() - 0.5) * 12, h * 0.7, x + (r() - 0.5) * 8, h);
          g.stroke();
        }
      },
      { srgb: true }
    ),
});

/* ------------------------------------------------------------------ */
/* Sabores y colores                                                   */
/* ------------------------------------------------------------------ */

const norm = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

const FLAVORS = [
  [/nestea|\bte\b|\btea\b/, '#a24c17'],
  [/parchita|maracuya|passion/, '#f2a900'],
  [/papelon/, '#b0701c'],
  [/guanabana/, '#efe8d2'],
  [/pina|pineapple/, '#f2d56a'],
  [/fresa|strawberry/, '#e23d55'],
  [/mora|blackberry|uva/, '#5e1a44'],
  [/durazno|melocoton|peach/, '#f0913f'],
  [/limon|lemon/, '#e3ea94'],
  [/naranja|orange/, '#f7951d'],
  [/mango/, '#f6b221'],
  [/patilla|sandia|watermelon/, '#f0566a'],
  [/cafe|coffee/, '#4a2a17'],
  [/toddy|chocolate|cacao/, '#5b3420'],
  [/ovomaltina|malta|malt/, '#a8784a'],
  [/coco|vainilla|vanilla|leche|merengada/, '#f3e6c8'],
  [/cola|refresco|soda|gaseosa/, '#2b0f06'],
];

function flavorColor(texts, fallback) {
  for (const t of texts) {
    const n = norm(t);
    for (const [re, hex] of FLAVORS) if (re.test(n)) return hex;
  }
  return fallback;
}

const SAUCE_TONES = [
  [/ajo|mayo|ranch|blanca|tartara/, '#f3ead2'],
  [/buffalo|bufalo|picante|hot/, '#d9531b'],
  [/bbq|barbacoa|ahumada/, '#4f1909'],
  [/mostaza|miel|mustard/, '#dca214'],
  [/ketchup|tomate/, '#a8140b'],
  [/mil islas|rosada/, '#d9622e'],
  [/queso|cheddar/, '#f2ae22'],
  [/guacamole|aguacate/, '#7aa23a'],
];
const sauceTone = (name) => {
  const n = norm(name);
  for (const [re, hex] of SAUCE_TONES) if (re.test(n)) return hex;
  return '#e7a05e';
};

/** Elige el modelo según la categoría y el nombre del producto. */
export function itemKindFor(variant, name = '') {
  const n = norm(name);
  if (variant === 'pizza') return 'pizza';
  if (variant === 'sushi') return 'sushi';
  if (variant === 'starter') return 'basket';
  if (variant === 'dessert') return 'popsicle';
  if (/jarra|pitcher/.test(n)) return 'pitcher';
  if (/refresco|soda|gaseosa|cola|botella|\d\s*(l|lt|lts|litros?)\b/.test(n)) return 'bottle';
  return 'glass';
}

/* ------------------------------------------------------------------ */
/* Geometrías                                                          */
/* ------------------------------------------------------------------ */

const glassMat = (opacity = 0.22) => {
  const m = food({ color: '#ffffff', bumpScale: 0, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.03, env: 1.7 });
  m.depthWrite = false;
  m.opacity = opacity;
  m.userData.baseOpacity = opacity;
  m.userData.glass = true;
  return m;
};

function glassShell(R, H, q) {
  const t = 0.045;
  const outer = spline([[R * 0.86, 0], [R * 0.97, 0.03], [R, 0.12], [R * 1.02, H * 0.5], [R * 1.05, H]], 24 * q.detail);
  const inner = spline([[R * 1.05 - t, H], [R * 1.02 - t, H * 0.5], [R - t, 0.16], [R * 0.86 - t, 0.1]], 24 * q.detail);
  const pts = joinProfiles(flatLine(0, R * 0.86, 0, 4), outer, [new THREE.Vector2(R * 1.05 - t * 0.5, H + 0.012)], inner, flatLine(R * 0.86 - t, 0, 0.1, 4));
  const g = latheGeo(pts, q.seg);
  g.computeVertexNormals();
  return g;
}

function liquidSide(R, q) {
  // cilindro unitario (alto 1) que se escala con el nivel de llenado
  const pts = joinProfiles(flatLine(0, R * 0.8, 0, 3), spline([[R * 0.8, 0], [R * 0.97, 0.04], [R, 0.12], [R, 1]], 12));
  const g = latheGeo(pts, Math.round(q.seg * 0.75));
  g.computeVertexNormals();
  return g;
}

function buildPitcher(q, glass) {
  const R = glass ? 0.42 : 0.66, H = glass ? 1.45 : 1.75;
  const group = new THREE.Group();
  const gm = glassMat(glass ? 0.2 : 0.22);
  const shellGeo = glassShell(R, H, q);
  if (!glass) {
    // pico para servir (lado opuesto al asa)
    const p = shellGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const d = Math.abs(Math.atan2(Math.sin(Math.atan2(z, x) - Math.PI), Math.cos(Math.atan2(z, x) - Math.PI)));
      const w = Math.max(0, 1 - d / 0.55);
      const h = smooth(H * 0.72, H, y);
      const push = 0.17 * w * w * h;
      const r = Math.hypot(x, z) || 1;
      p.setXYZ(i, x + (x / r) * push, y + 0.05 * w * h, z + (z / r) * push);
    }
    shellGeo.computeVertexNormals();
  }
  const shell = mesh(shellGeo, gm);
  shell.renderOrder = 3;
  shell.castShadow = false;
  group.add(shell);
  if (!glass) {
    const handle = mesh(new THREE.TorusGeometry(0.36, 0.055, 12, Math.round(36 * q.detail), Math.PI), gm);
    handle.rotation.z = -Math.PI / 2;
    handle.scale.set(0.8, 1.15, 1);
    handle.position.set(R + 0.03, H * 0.56, 0);
    handle.renderOrder = 3;
    group.add(handle);
  } else {
    // pitillo a rayas
    const straw = mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.0, 16, 1, true), food({ color: '#ffffff', map: null, bumpScale: 0, roughness: 0.3, clearcoat: 0.6 }));
    paint(straw.geometry, (v, n, c) => c.set(Math.floor((v.y + 1) * 9) % 2 ? '#d62a1e' : '#ffffff'));
    straw.position.set(0.14, H * 0.62, 0.05);
    straw.rotation.z = -0.22;
    straw.name = 'straw';
    group.add(straw);
  }
  const liqMat = food({ color: '#f0913f', bumpScale: 0, roughness: 0.08, clearcoat: 0.6, clearcoatRoughness: 0.1, env: 0.9, transmission: 0.82, thickness: 1.6, ior: 1.34 });
  liqMat.attenuationColor = liqMat.color; // mismo color: al cambiar de sabor cambia todo
  liqMat.attenuationDistance = 2.4;
  liqMat.opacity = liqMat.userData.baseOpacity = 1;
  const side = mesh(liquidSide(R - 0.06, q), liqMat);
  side.name = 'liquid';
  side.position.y = 0.105;
  side.renderOrder = 1;
  group.add(side);
  const top = mesh(new THREE.CircleGeometry(R - 0.06, Math.round(q.seg * 0.75)), liqMat);
  top.geometry.rotateX(-Math.PI / 2);
  top.name = 'surface';
  top.renderOrder = 1;
  group.add(top);
  const iceMat = food({ color: '#f2f9ff', bumpScale: 1.5, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.05, env: 1.6 });
  iceMat.depthWrite = false;
  iceMat.opacity = iceMat.userData.baseOpacity = 0.6;
  const iceGeo = new RoundedBoxGeometry(0.24, 0.22, 0.24, 2, 0.05);
  const ice = new THREE.Group();
  ice.name = 'ice';
  const r = mulberry32(31);
  const n = glass ? 3 : 4;
  for (let i = 0; i < n; i++) {
    const m = mesh(iceGeo, iceMat);
    const a = (i / n) * Math.PI * 2 + r();
    const rr = (R - 0.22) * (0.35 + r() * 0.5);
    m.position.set(Math.cos(a) * rr, 0, Math.sin(a) * rr);
    m.rotation.set(r() * 0.6, r() * 3, r() * 0.6);
    m.renderOrder = 2;
    m.castShadow = false;
    ice.add(m);
  }
  group.add(ice);
  // chorro que cae al rellenar con un sabor nuevo
  const streamMat = food({ color: '#f0913f', bumpScale: 0, roughness: 0.1, clearcoat: 0.8, env: 1, transmission: 0.45, thickness: 0.3, ior: 1.34 });
  streamMat.opacity = streamMat.userData.baseOpacity = 0.9;
  const sg = new THREE.CylinderGeometry(0.045, 0.06, 1, 14, 8, true);
  sg.translate(0, -0.5, 0);
  const spos = sg.attributes.position;
  for (let i = 0; i < spos.count; i++) {
    const w = 1 + 0.14 * Math.sin(spos.getY(i) * 31);
    spos.setX(i, spos.getX(i) * w);
    spos.setZ(i, spos.getZ(i) * w);
  }
  sg.computeVertexNormals();
  const stream = mesh(sg, streamMat);
  stream.name = 'stream';
  stream.visible = false;
  stream.castShadow = false;
  stream.renderOrder = 1;
  stream.position.y = H + 0.7;
  group.add(stream);
  return group;
}

const BOTTLE = [[0.3, 0], [0.46, 0.04], [0.5, 0.16], [0.5, 1.3], [0.47, 1.55], [0.36, 1.8], [0.22, 1.98], [0.155, 2.1], [0.15, 2.24]];

function buildBottle(q) {
  const group = new THREE.Group();
  const prof = spline(BOTTLE, 40 * q.detail);
  const shellPts = joinProfiles(flatLine(0, 0.3, 0.02, 4), prof, [new THREE.Vector2(0.19, 2.25), new THREE.Vector2(0.19, 2.28), new THREE.Vector2(0.15, 2.29)]);
  const shell = mesh(latheGeo(shellPts, q.seg), glassMat(0.12));
  shell.geometry.computeVertexNormals();
  shell.renderOrder = 3;
  shell.castShadow = false;
  group.add(shell);
  // refresco hasta el hombro
  const fill = 1.72;
  const inner = [];
  for (let i = 0; i < prof.length; i++) {
    const p = prof[i];
    if (p.y > fill) {
      const a = prof[i - 1];
      const t = (fill - a.y) / (p.y - a.y);
      inner.push(new THREE.Vector2(lerp(a.x, p.x, t) * 0.95, fill));
      break;
    }
    inner.push(new THREE.Vector2(p.x * 0.95, Math.max(0.035, p.y)));
  }
  const liqMat = food({ color: '#2a0c04', bumpScale: 0, roughness: 0.1, clearcoat: 0.8, env: 1.1, transmission: 0.35, thickness: 2, ior: 1.34 });
  liqMat.attenuationColor = new THREE.Color('#1a0602');
  liqMat.attenuationDistance = 0.35;
  liqMat.opacity = liqMat.userData.baseOpacity = 1;
  const liquid = mesh(latheGeo(joinProfiles(flatLine(0, 0.28, 0.035, 3), inner, flatLine(inner[inner.length - 1].x, 0, fill, 3)), Math.round(q.seg * 0.75)), liqMat);
  liquid.geometry.computeVertexNormals();
  liquid.renderOrder = 1;
  group.add(liquid);
  // etiqueta
  const label = mesh(new THREE.CylinderGeometry(0.508, 0.508, 0.6, Math.round(q.seg * 0.75), 1, true), food({ map: 'label', bumpScale: 0, roughness: 0.35, clearcoat: 0.6 }));
  label.position.y = 0.82;
  label.renderOrder = 4;
  group.add(label);
  // tapa con estrías
  const capGeo = new THREE.CylinderGeometry(0.175, 0.18, 0.17, 40, 1);
  const p = capGeo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    if (Math.hypot(x, z) > 0.15) {
      const f = 1 + 0.03 * Math.sin(Math.atan2(z, x) * 20);
      p.setX(i, x * f);
      p.setZ(i, z * f);
    }
  }
  capGeo.computeVertexNormals();
  const cap = mesh(capGeo, food({ color: '#c91f17', bumpScale: 0, roughness: 0.35, clearcoat: 0.5 }));
  cap.position.y = 2.37;
  group.add(cap);
  // burbujas (se animan)
  const bubbles = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4), food({ color: '#ffffff', bumpScale: 0, roughness: 0.1, clearcoat: 1 }), 34);
  solidColor(bubbles.geometry, new THREE.Color(1, 1, 1));
  bubbles.material.opacity = bubbles.material.userData.baseOpacity = 0.55;
  bubbles.material.depthWrite = false;
  bubbles.name = 'bubbles';
  bubbles.renderOrder = 2;
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < 34; i++) bubbles.setMatrixAt(i, m4);
  group.add(bubbles);
  return group;
}

function buildBasket(q) {
  const group = new THREE.Group();
  const W = 1.25, D = 0.85, Hh = 0.36, rad = 0.3;
  const rr = (w, d, r) => {
    const s = new THREE.Shape();
    s.moveTo(-w + r, -d);
    s.lineTo(w - r, -d);
    s.quadraticCurveTo(w, -d, w, -d + r);
    s.lineTo(w, d - r);
    s.quadraticCurveTo(w, d, w - r, d);
    s.lineTo(-w + r, d);
    s.quadraticCurveTo(-w, d, -w, d - r);
    s.lineTo(-w, -d + r);
    s.quadraticCurveTo(-w, -d, -w + r, -d);
    return s;
  };
  // cesta de plástico rojo
  const wallShape = rr(W, D, rad);
  wallShape.holes.push(rr(W - 0.06, D - 0.06, rad - 0.05));
  const wall = new THREE.ExtrudeGeometry(wallShape, { depth: Hh, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2, curveSegments: 10 });
  wall.rotateX(-Math.PI / 2);
  const wp = wall.attributes.position;
  for (let i = 0; i < wp.count; i++) {
    const f = 1 + clamp01(wp.getY(i) / Hh) * 0.12; // paredes abiertas hacia arriba
    wp.setX(i, wp.getX(i) * f);
    wp.setZ(i, wp.getZ(i) * f);
  }
  wall.computeVertexNormals();
  const red = food({ color: '#c41f1a', bumpScale: 0.3, roughness: 0.32, clearcoat: 0.7, clearcoatRoughness: 0.2 });
  group.add(mesh(wall, red));
  const bottom = new THREE.ExtrudeGeometry(rr(W, D, rad), { depth: 0.04, bevelEnabled: false, curveSegments: 10 });
  bottom.rotateX(-Math.PI / 2);
  group.add(mesh(bottom, red));

  // papel a cuadros arrugado que sube por las paredes
  const paper = new THREE.PlaneGeometry(2.9, 2.2, Math.round(46 * q.detail), Math.round(36 * q.detail));
  paper.rotateX(-Math.PI / 2);
  const pp = paper.attributes.position;
  const iw = W - 0.12, id = D - 0.12;
  for (let i = 0; i < pp.count; i++) {
    const x = pp.getX(i), z = pp.getZ(i);
    const ex = Math.max(0, Math.abs(x) - iw), ez = Math.max(0, Math.abs(z) - id);
    const e = Math.max(ex, ez);
    const up = Math.min(e, Hh + 0.08) * 1.15;
    const over = Math.max(0, e - Hh - 0.08);
    const y = 0.05 + up - over * 0.6 + fbm(x * 3, 0, z * 3, 12, 3) * 0.025 + Math.abs(fbm(x * 9, 1, z * 9, 3, 2)) * 0.012;
    const k = 1 - Math.min(e, Hh) * 0.7 + over * 0.4;
    pp.setXYZ(i, Math.sign(x) * (Math.min(Math.abs(x), iw) + ex * k), y, Math.sign(z) * (Math.min(Math.abs(z), id) + ez * k));
  }
  paper.computeVertexNormals();
  const paperMesh = mesh(paper, food({ map: 'checker', bumpScale: 0.8, roughness: 0.85, side: THREE.DoubleSide }));
  group.add(paperMesh);
  return group;
}

function friesPile(q, seed) {
  const r = mulberry32(seed);
  const geos = [];
  const c = new THREE.Color();
  const m4 = new THREE.Matrix4(), qa = new THREE.Quaternion(), e = new THREE.Euler();
  const count = Math.round(46 * q.detail);
  for (let k = 0; k < count; k++) {
    const L = 0.55 + r() * 0.35;
    const bg = new THREE.BoxGeometry(L, 0.075, 0.075, 3, 1, 1);
    paint(bg, (v, n, cc) => {
      const end = smooth(L * 0.3, L * 0.5, Math.abs(v.x));
      cc.copy(c.set('#f2c25a')).lerp(col('#c98a2c'), end * 0.8 + r() * 0.1);
    });
    const rx = -0.95 + r() * 0.95, rz = (r() - 0.5) * 1.1;
    const h = 0.12 + (1 - Math.min(1, Math.hypot((rx + 0.45) / 0.6, rz / 0.6))) * 0.38 * r();
    e.set((r() - 0.5) * 0.5, r() * Math.PI, (r() - 0.5) * 0.7);
    qa.setFromEuler(e);
    m4.compose(new THREE.Vector3(rx, h, rz), qa, new THREE.Vector3(1, 1, 1));
    bg.applyMatrix4(m4);
    geos.push(bg);
  }
  const g = mergeGeometries(geos);
  geos.forEach((x) => x.dispose());
  return mesh(g, food({ bumpScale: 0.8, roughness: 0.55, clearcoat: 0.15 }));
}

function cheeseDrizzle(seed) {
  const r = mulberry32(seed);
  const group = new THREE.Group();
  const mat = food({ color: '#f29a12', bumpScale: 0, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.1 });
  for (let k = 0; k < 3; k++) {
    const pts = [];
    for (let i = 0; i < 7; i++) {
      const x = -0.85 + (i / 6) * 0.85 + (r() - 0.5) * 0.15;
      const z = (r() - 0.5) * 0.8;
      const h = 0.3 + (1 - Math.min(1, Math.hypot((x + 0.45) / 0.6, z / 0.6))) * 0.25;
      pts.push(new THREE.Vector3(x, h, z));
    }
    const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.035 + r() * 0.015, 8, false);
    group.add(mesh(tube, mat));
  }
  // trocitos de tocineta
  const geos = [];
  for (let i = 0; i < 40; i++) {
    const b = new THREE.BoxGeometry(0.06, 0.03, 0.05);
    solidColor(b, col(r() < 0.5 ? '#8a2414' : '#c0603a'));
    const x = -0.85 + r() * 0.85, z = (r() - 0.5) * 0.85;
    const h = 0.34 + (1 - Math.min(1, Math.hypot((x + 0.45) / 0.6, z / 0.6))) * 0.22;
    b.rotateY(r() * 3);
    b.translate(x, h, z);
    geos.push(b);
  }
  group.add(mesh(mergeGeometries(geos), food({ bumpScale: 0, roughness: 0.45, clearcoat: 0.5 })));
  return group;
}

function wing(q, seed) {
  const R = mulberry32(seed);
  const prof = spline([[0.001, 0], [0.11, 0.03], [0.17, 0.13], [0.16, 0.28], [0.1, 0.42], [0.065, 0.52], [0.05, 0.6]], 20);
  const g = latheGeo(joinProfiles(prof, [new THREE.Vector2(0.001, 0.61)]), Math.round(28 * q.detail + 8));
  g.computeVertexNormals();
  displace(g, (v) => fbm(v.x * 9, v.y * 9, v.z * 9, seed, 3) * 0.025 * smooth(0.5, 0.3, v.y) + 0.004);
  paint(g, (v, n, c) => {
    c.copy(col('#b5571c')).lerp(col('#e08b32'), smooth(-0.3, 0.4, fbm(v.x * 6, v.y * 6, v.z * 6, seed + 3, 2)));
    c.lerp(col('#6b2a0c'), smooth(0.2, 0.5, fbm(v.x * 12, v.y * 12, v.z * 12, seed + 7, 2)) * 0.5);
  });
  const group = new THREE.Group();
  group.add(mesh(g, food({ map: 'crust', bump: 'crust', bumpScale: 3, roughness: 0.4, clearcoat: 0.8, clearcoatRoughness: 0.3, sheen: 0.35, sheenColor: '#ffb066', sheenRoughness: 0.5 })));
  const bone = mesh(new THREE.SphereGeometry(0.05, 10, 8), food({ color: '#efe4d0', bumpScale: 0, roughness: 0.6 }));
  bone.scale.set(1, 0.6, 1);
  bone.position.y = 0.62;
  group.add(bone);
  group.rotation.z = Math.PI / 2 + (R() - 0.5) * 0.4;
  return group;
}

/** Interior de la cesta donde caben las alitas (lado derecho; las papas van a la izquierda). */
const WING_BOUNDS = { minX: -0.1, maxX: 1.1, minZ: -0.7, maxZ: 0.7, minY: 0.09 };

function buildWings(q) {
  const group = new THREE.Group();
  const box = new THREE.Box3();
  const r = mulberry32(77);
  const n = 7;
  for (let i = 0; i < n; i++) {
    const w = wing(q, 100 + i);
    const holder = new THREE.Group();
    holder.add(w);
    holder.position.set(0.3 + r() * 0.5, 0.2 + (i % 3) * 0.08, (r() - 0.5) * 0.95);
    holder.rotation.y = r() * Math.PI * 2;
    group.add(holder);
    // que ninguna alita atraviese la cesta: se empuja hacia adentro si se sale
    holder.updateMatrixWorld(true);
    box.setFromObject(holder);
    holder.position.x += Math.min(0, WING_BOUNDS.maxX - box.max.x) + Math.max(0, WING_BOUNDS.minX - box.min.x);
    holder.position.z += Math.min(0, WING_BOUNDS.maxZ - box.max.z) + Math.max(0, WING_BOUNDS.minZ - box.min.z);
    holder.position.y += Math.max(0, WING_BOUNDS.minY - box.min.y);
  }
  return group;
}

function buildCup(q, hex) {
  const group = new THREE.Group();
  const prof = spline([[0.17, 0], [0.2, 0.02], [0.24, 0.17], [0.25, 0.19]], 10);
  const inner = spline([[0.235, 0.19], [0.225, 0.17], [0.19, 0.04], [0.15, 0.03]], 10);
  const g = latheGeo(joinProfiles(flatLine(0, 0.17, 0, 2), prof, inner, flatLine(0.15, 0, 0.03, 2)), 36);
  g.computeVertexNormals();
  group.add(mesh(g, food({ color: '#fbfaf6', bumpScale: 0.4, roughness: 0.4, clearcoat: 0.4 })));
  const sauce = mesh(new THREE.CircleGeometry(0.225, 32), food({ color: hex, bumpScale: 0, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.05 }));
  sauce.geometry.rotateX(-Math.PI / 2);
  sauce.position.y = 0.16;
  group.add(sauce);
  return group;
}

function buildPopsicle(q) {
  const group = new THREE.Group();
  const w = 0.45, h = 0.78, r = 0.2;
  const s = new THREE.Shape();
  s.moveTo(-w + r, -h);
  s.lineTo(w - r, -h);
  s.quadraticCurveTo(w, -h, w, -h + r);
  s.lineTo(w, h - 0.34);
  // mordisco en la esquina superior derecha
  s.absarc(w - 0.04, h - 0.2, 0.15, -Math.PI / 2 - 0.2, Math.PI, true);
  s.absarc(w - 0.3, h + 0.02, 0.14, -Math.PI * 0.15, Math.PI, true);
  s.lineTo(-w + r, h);
  s.quadraticCurveTo(-w, h, -w, h - r);
  s.lineTo(-w, -h + r);
  s.quadraticCurveTo(-w, -h, -w + r, -h);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.2, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.07, bevelSegments: Math.round(4 * q.detail + 1), curveSegments: Math.round(14 * q.detail + 4) });
  g.translate(0, 0, -0.1);
  g.computeVertexNormals();
  const ice = mesh(g, food({ color: '#f3e6c8', bump: 'fine', bumpScale: 1.4, roughness: 0.32, clearcoat: 0.5, clearcoatRoughness: 0.25 }));
  ice.name = 'pop';
  ice.position.y = h + 0.55;
  group.add(ice);
  // gotas derretidas
  const drop = new THREE.SphereGeometry(0.05, 12, 8);
  for (const [x, len] of [[-0.18, 0.14], [0.12, 0.09]]) {
    const d = mesh(drop, ice.material);
    d.scale.set(1, len / 0.05, 0.8);
    d.position.set(x, 0.55 - len * 0.6 + 0.06, 0.12);
    d.name = 'pop';
    group.add(d);
  }
  // palito de madera
  const stick = new THREE.Shape();
  const sw = 0.1;
  stick.moveTo(-sw, 0.55);
  stick.lineTo(-sw, -0.05);
  stick.absarc(0, -0.05, sw, Math.PI, 0, false);
  stick.lineTo(sw, 0.55);
  stick.lineTo(-sw, 0.55);
  const sg = new THREE.ExtrudeGeometry(stick, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 1, curveSegments: 10 });
  sg.translate(0, 0, -0.02);
  const uv = sg.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2 + 0.5, uv.getY(i) * 0.9 + 0.2);
  const stickMesh = mesh(sg, food({ map: 'wood', bumpScale: 0.5, roughness: 0.75 }));
  stickMesh.position.y = 0.16;
  group.add(stickMesh);
  return group;
}

/* ------------------------------------------------------------------ */
/* Modelos animados                                                    */
/* ------------------------------------------------------------------ */

class Model {
  constructor(stage, kind) {
    this.stage = stage;
    this.kind = kind;
    this.group = new THREE.Group();
    this.group.visible = false;
    stage.root.add(this.group);
    this.mats = [];
    this.op = -1;
    this.t0 = stage._time + 0.1;
    this.drop = sp(stage.reduced ? 0 : 2.2);
    this.spin = sp(stage.reduced ? 0 : -1.3);
    this.pop = sp(1);
    this.frameH = 2;
    this.frameW = 1.2;
  }

  add(key, build, parent = this.group) {
    const obj = fromTemplate(key + '|' + this.stage.q.name, build);
    parent.add(obj);
    const mats = materialsOf(obj);
    if (this.stage._dark) {
      // sobre fondo oscuro el vidrio se veía lechoso: más transparente y con menos reflejo
      for (const m of mats)
        if (m.userData.glass) {
          m.userData.baseOpacity *= 0.5;
          m.opacity = m.userData.baseOpacity;
          m.envMapIntensity *= 0.75;
        }
    }
    this.mats.push(...mats);
    return obj;
  }

  setOpacity(o) {
    if (Math.abs(o - this.op) < 1e-3) return false;
    this.op = o;
    for (const m of this.mats) m.opacity = (m.userData.baseOpacity ?? 1) * o;
    return true;
  }

  base(dt, now) {
    if (now < this.t0) return true;
    this.group.visible = true;
    let a = spring(this.drop, 0, 140, 12, dt);
    a = spring(this.spin, 0, 50, 10, dt) || a;
    a = spring(this.pop, 1, 260, 14, dt) || a;
    a = this.setOpacity(clamp01((now - this.t0) / 0.25)) || a;
    this.group.position.y = this.drop.x;
    this.group.rotation.y = this.spin.x;
    this.group.scale.set(1 + (this.pop.x - 1) * 0.6, this.pop.x, 1 + (this.pop.x - 1) * 0.6);
    return a;
  }

  dispose() {
    this.stage.root.remove(this.group);
    this.mats.forEach((m) => m.dispose());
  }
}

class DrinkModel extends Model {
  constructor(stage, kind) {
    super(stage, kind);
    if (kind === 'bottle') {
      this.add('bottle', () => buildBottle(stage.q));
      this.frameH = 2.5;
      this.frameW = 0.95;
      this.bubbles = this.group.getObjectByName('bubbles');
      const r = mulberry32(5);
      this.bub = Array.from({ length: 34 }, () => ({ x: (r() - 0.5) * 0.6, z: (r() - 0.5) * 0.6, y: r() * 1.6, v: 0.25 + r() * 0.35, s: 0.01 + r() * 0.015 }));
      this._m4 = new THREE.Matrix4();
    } else {
      const glass = kind === 'glass';
      this.add(kind, () => buildPitcher(stage.q, glass));
      this.R = glass ? 0.42 : 0.66;
      this.H = glass ? 1.45 : 1.75;
      this.maxFill = this.H * 0.82 - 0.1;
      this.frameH = glass ? 2.2 : 1.95;
      this.frameW = glass ? 0.85 : 1.3;
      this.liquid = this.group.getObjectByName('liquid');
      this.surface = this.group.getObjectByName('surface');
      this.ice = this.group.getObjectByName('ice');
      this.stream = this.group.getObjectByName('stream');
      this.streamOp = sp(0);
      this.pouring = false;
      this.fill = sp(0.02);
      this.fillTarget = 1;
      this.tiltX = sp(0);
      this.tiltZ = sp(0);
      this.color = this.liquid.material.color;
      this.targetColor = new THREE.Color();
      this.pending = null;
    }
  }

  set({ name, choices }) {
    if (this.kind === 'bottle') return;
    const hex = flavorColor([...choices, name], this.kind === 'pitcher' ? '#f0913f' : '#e3ea94');
    if (!this.hex) {
      this.hex = hex;
      this.color.set(hex);
      this.targetColor.set(hex);
      return;
    }
    if (hex === this.hex) return;
    this.hex = hex;
    if (this.stage.reduced) {
      this.targetColor.set(hex);
      return;
    }
    // se vacía y se vuelve a llenar con el sabor nuevo
    this.pending = hex;
    this.fillTarget = 0.12;
    this.tiltX.v += 1.2;
    this.tiltZ.v -= 0.8;
  }

  update(dt, now) {
    let a = this.base(dt, now);
    if (!this.group.visible) return a;
    if (this.kind === 'bottle') {
      for (let i = 0; i < this.bub.length; i++) {
        const b = this.bub[i];
        b.y += b.v * dt;
        if (b.y > 1.65) b.y = 0.08;
        const s = b.s * (b.y > 1.6 ? 0.5 : 1);
        this._m4.makeScale(s, s, s).setPosition(b.x * (b.y < 1.4 ? 1 : 0.6), b.y, b.z * (b.y < 1.4 ? 1 : 0.6));
        this.bubbles.setMatrixAt(i, this._m4);
      }
      this.bubbles.instanceMatrix.needsUpdate = true;
      return a;
    }
    if (this.pending && this.fill.x < 0.18) {
      this.targetColor.set(this.pending);
      this.pending = null;
      this.fillTarget = 1;
      this.pouring = true;
    }
    if (this.pouring && this.fill.x > 0.96) this.pouring = false;
    a = spring(this.fill, this.fillTarget, 26, 9, dt) || a;
    a = spring(this.tiltX, 0, 60, 4, dt) || a;
    a = spring(this.tiltZ, 0, 60, 4, dt) || a;
    if (this.color.getHex() !== this.targetColor.getHex()) {
      this.color.lerp(this.targetColor, Math.min(1, dt * 8));
      if (Math.abs(this.color.r - this.targetColor.r) + Math.abs(this.color.g - this.targetColor.g) + Math.abs(this.color.b - this.targetColor.b) < 0.003)
        this.color.copy(this.targetColor);
      a = true;
    }
    const level = Math.max(0.02, this.fill.x) * this.maxFill;
    this.liquid.scale.y = level;
    this.surface.position.y = 0.105 + level;
    this.surface.rotation.set(this.tiltX.x * 0.12, 0, this.tiltZ.x * 0.12);
    this.ice.position.y = 0.105 + level - 0.07 + Math.sin(now * 1.6) * 0.008;
    this.ice.rotation.y = Math.sin(now * 0.4) * 0.15;
    // chorro: aparece mientras se rellena y "se corta" al terminar
    a = spring(this.streamOp, this.pouring ? 1 : 0, 220, 26, dt) || a;
    const so = this.streamOp.x;
    this.stream.visible = so > 0.02;
    if (this.stream.visible) {
      const len = Math.max(0.01, this.H + 0.7 - (0.105 + level));
      this.stream.scale.set(so, len, so);
      this.stream.position.x = Math.sin(now * 11) * 0.012;
      this.stream.material.color.copy(this.color);
      if (this.pouring) this.tiltZ.v += Math.sin(now * 23) * 0.06; // ondas en la superficie
      a = true;
    }
    return a;
  }
}

class BasketModel extends Model {
  constructor(stage) {
    super(stage, 'basket');
    this.add('basket', () => buildBasket(stage.q));
    this.add('fries', () => friesPile(stage.q, 41));
    this.frameH = 1.1;
    this.frameW = 2.05;
    this.frameCenter = 0.3;
    this.cups = new Map();
    this.slots = [-0.62, 0, 0.62];
  }

  set({ name, description, choices }) {
    const text = norm(name + ' ' + description);
    const wantWings = /alita|wing|pollo|tender|nugget/.test(text);
    const wantCheese = /queso|cheddar/.test(text);
    if (wantWings && !this.wings) this.wings = this.add('wings', () => buildWings(this.stage.q));
    if (wantCheese && !this.cheese) this.cheese = this.add('drizzle', () => cheeseDrizzle(9));
    // salsas elegidas: cada una en su envase
    const wanted = choices.filter((c) => SAUCE_TONES.some(([re]) => re.test(norm(c))) || /salsa|sauce/.test(norm(c)));
    for (const [k, cup] of this.cups) if (!wanted.includes(k) && !cup.leaving) cup.leaving = this.stage._time;
    for (const k of wanted) {
      if (this.cups.has(k) && !this.cups.get(k).leaving) continue;
      const used = new Set([...this.cups.values()].filter((c) => !c.leaving).map((c) => c.slot));
      const slot = [0, 1, 2].find((s) => !used.has(s));
      if (slot === undefined) continue;
      const holder = new THREE.Group();
      holder.position.set(this.slots[slot], 0, 1.18);
      this.group.add(holder);
      const obj = fromTemplate('cup|' + k, () => buildCup(this.stage.q, sauceTone(k)));
      holder.add(obj);
      const mats = materialsOf(obj);
      mats.forEach((m) => (m.opacity = 0));
      this.cups.set(k, { holder, mats, slot, y: sp(this.stage.reduced ? 0 : 1.4), s: sp(1), t0: this.stage._time, leaving: 0 });
    }
  }

  update(dt, now) {
    let a = this.base(dt, now);
    if (!this.group.visible) return a;
    for (const [k, c] of this.cups) {
      if (c.leaving) {
        const life = now - c.leaving;
        a = spring(c.s, 0, 200, 16, dt) || a;
        c.holder.position.y = life * 0.8;
        c.mats.forEach((m) => (m.opacity = clamp01(1 - life / 0.3)));
        c.holder.scale.setScalar(Math.max(0.001, c.s.x));
        if (life > 0.45) {
          this.group.remove(c.holder);
          c.mats.forEach((m) => m.dispose());
          this.cups.delete(k);
        }
        a = true;
        continue;
      }
      a = spring(c.y, 0, 160, 11, dt) || a;
      c.holder.position.y = c.y.x;
      c.holder.rotation.y = c.y.x * 2;
      const o = clamp01((now - c.t0) / 0.2);
      if (c.mats[0].opacity !== o) {
        c.mats.forEach((m) => (m.opacity = o));
        a = true;
      }
    }
    return a;
  }
}

class PopsicleModel extends Model {
  constructor(stage) {
    super(stage, 'popsicle');
    this.add('popsicle', () => buildPopsicle(stage.q));
    this.frameH = 2.2;
    this.frameW = 0.9;
    this.pops = [];
    this.group.traverse((o) => o.name === 'pop' && this.pops.push(o));
    this.color = this.pops[0].material.color;
    this.targetColor = new THREE.Color();
    this.extraSpin = sp(0);
  }

  set({ name, choices }) {
    const hex = flavorColor([...choices, name], '#f3e6c8');
    if (this.hex === hex) return;
    const firstTime = !this.hex;
    this.hex = hex;
    this.targetColor.set(hex);
    if (firstTime) this.color.set(hex);
    else if (!this.stage.reduced) {
      this.extraSpin.x -= Math.PI * 2;
      this.pop.v += 2.2;
    }
  }

  update(dt, now) {
    let a = this.base(dt, now);
    if (!this.group.visible) return a;
    a = spring(this.extraSpin, 0, 40, 9, dt) || a;
    this.group.rotation.y += this.extraSpin.x;
    if (this.color.getHex() !== this.targetColor.getHex()) {
      this.color.lerp(this.targetColor, Math.min(1, dt * 7));
      if (Math.abs(this.color.r - this.targetColor.r) + Math.abs(this.color.g - this.targetColor.g) + Math.abs(this.color.b - this.targetColor.b) < 0.003)
        this.color.copy(this.targetColor);
      a = true;
    }
    return a;
  }
}

/**
 * Una parte que cae sobre el plato como en la hamburguesa: acelera (caída libre),
 * aterriza con un pequeño aplastón y se asienta. También sirve para irse.
 */
class Drop {
  constructor(holder, mats, t0, { from = 1.4, dur = 0.4, squash = 1.4 } = {}) {
    Object.assign(this, { holder, mats, t0, from, dur, squash });
    this.s = sp(1);
    this.landed = false;
    this.leaving = 0;
    this.done = false;
    holder.visible = false;
  }

  /** @returns {boolean} si sigue moviéndose */
  update(now, dt, op) {
    if (this.leaving) {
      const life = now - this.leaving;
      this.holder.position.y = life * 0.9;
      const o = clamp01(1 - life / 0.35) * op;
      this.mats.forEach((m) => (m.opacity = o));
      return true;
    }
    if (now < this.t0) {
      this.holder.visible = false;
      return true;
    }
    this.holder.visible = true;
    const t = clamp01((now - this.t0) / this.dur);
    this.holder.position.y = this.from * (1 - t * t);
    if (t >= 1 && !this.landed) {
      this.landed = true;
      this.s.v -= this.squash;
    }
    const moving = spring(this.s, 1, 300, 14, dt);
    const sq = this.s.x;
    this.holder.scale.set(1 + (1 - sq) * 0.5, sq, 1 + (1 - sq) * 0.5);
    const o = clamp01((now - this.t0) / 0.12) * op;
    if (this.mats[0] && Math.abs(this.mats[0].opacity - o) > 1e-3) this.mats.forEach((m) => (m.opacity = o));
    this.done = this.landed && !moving && o >= op - 1e-3;
    return !this.done;
  }
}

/** Saca un objeto del modelo y libera sus materiales. */
function dropObj(model, obj) {
  if (!obj) return;
  obj.parent?.remove(obj);
  const old = materialsOf(obj);
  model.mats = model.mats.filter((m) => !old.includes(m));
  old.forEach((m) => m.dispose());
}

/**
 * Pizza, con el armado de la hamburguesa: plato → cae la masa con el queso y
 * aterriza con un aplastón → los ingredientes caen uno tras otro. Después, al
 * quitar o agregar, cada ingrediente se va o cae. Vapor cuando ya está armada.
 */
class PizzaModel extends Model {
  constructor(stage) {
    super(stage, 'pizza');
    this.frameH = 0.55;
    this.frameW = 1.72;
    this.frameCenter = 0.2;
    this.elev = 0.62; // se ve desde más arriba (es plana)
    this.plate = this.add('pizzaplate', () => buildPizzaPlate(stage.q));
    this.drops = new Map(); // 'dough' y cada ingrediente
    this.cheese = null;
    this.intro = !stage.reduced;
  }

  /** ¿Ya terminó de armarse? (para el vapor) */
  get settled() {
    return this.group.visible && [...this.drops.values()].every((d) => d.done && !d.leaving);
  }

  _part(key, build, t0, opts) {
    const holder = new THREE.Group();
    this.group.add(holder);
    const obj = this.add(key, build, holder);
    const d = new Drop(holder, materialsOf(obj), t0, opts);
    d.mats.forEach((m) => (m.opacity = 0));
    return d;
  }

  set({ name, description, choices }) {
    const now = this.stage._time;
    const q = this.stage.q;
    const n = normText(name);
    const cheese = /cuatro quesos|4 quesos|quattro/.test(n) ? 'quattro' : 'mozzarella';
    const first = this.cheese == null;
    const reduced = this.stage.reduced;
    // la masa: cae primero (también cuando cambia el tipo de queso)
    if (cheese !== this.cheese) {
      const old = this.drops.get('dough');
      if (old) dropObj(this, old.holder);
      this.drops.set('dough', this._part('pizzadough|' + cheese, () => buildPizzaDough(q, cheese), first ? this.t0 + 0.1 : now, reduced ? { from: 0, dur: 0.01, squash: 0 } : { from: 1.5, dur: 0.42, squash: 1.6 }));
      this.cheese = cheese;
    }
    // con lista de ingredientes manda la lista (quitar "Pepperoni" lo quita aunque el nombre lo diga)
    const want = new Set(pizzaToppings(choices.length ? choices : [name, description]));
    if (cheese === 'quattro') want.add('quesoazul').add('parmesano');
    for (const [k, d] of this.drops) if (k !== 'dough' && !want.has(k) && !d.leaving) d.leaving = now;
    // los ingredientes caen después de la masa, uno tras otro
    const doughLands = this.drops.get('dough').t0 + this.drops.get('dough').dur;
    let start = Math.max(now, first ? doughLands + 0.05 : now);
    let i = 0;
    for (const k of want) {
      const cur = this.drops.get(k);
      if (cur && !cur.leaving) continue;
      if (cur) dropObj(this, cur.holder);
      this.drops.set(k, this._part('topping|' + k, () => buildTopping(k, q), start + i++ * 0.13, reduced ? { from: 0, dur: 0.01, squash: 0 } : { from: 1.0, dur: 0.32, squash: 0.9 }));
    }
  }

  update(dt, now) {
    // el plato aparece suave; las partes caen por su cuenta
    let a = false;
    if (now < this.t0) return true;
    this.group.visible = true;
    const plateMats = materialsOf(this.plate);
    const po = clamp01((now - this.t0) / 0.25);
    if (plateMats[0] && plateMats[0].opacity !== po) {
      plateMats.forEach((m) => (m.opacity = po));
      a = true;
    }
    this.op = 1;
    for (const [k, d] of this.drops) {
      a = d.update(now, dt, 1) || a;
      if (d.leaving && now - d.leaving > 0.4) {
        dropObj(this, d.holder);
        this.drops.delete(k);
      }
    }
    return a;
  }
}

/**
 * Sushi, con el armado de la hamburguesa: la pizarra se asienta, las 6 piezas
 * caen una tras otra (con aplastón) y al final se dibuja la salsa. Al cambiar
 * de roll, las piezas nuevas vuelven a caer.
 */
class SushiModel extends Model {
  constructor(stage) {
    super(stage, 'sushi');
    this.board = this.add('sushiboard', () => buildSushiBoard(stage.q));
    this.frameH = 0.55;
    this.frameW = 1.5;
    this.frameCenter = 0.25;
    this.elev = 0.55;
    this.key = null;
  }

  get settled() {
    return !this.anim;
  }

  set({ name, description, choices }) {
    const spec = sushiSpec(name, choices.length ? choices : [description]);
    if (spec.key === this.key) return;
    const first = this.key == null;
    this.key = spec.key;
    dropObj(this, this.rolls);
    this.rolls = this.add('sushi|' + spec.key, () => buildSushiRolls(this.stage.q, spec));
    // posición final de cada instancia (para hacerlas caer pieza por pieza)
    const parts = [];
    this.rolls.traverse((o) => {
      if (!o.isInstancedMesh) return;
      // las piezas empiezan escondidas y suben: sin este ajuste el motor calcula su zona
      // una sola vez (abajo, escondidas) y nunca las dibuja
      o.frustumCulled = false;
      const base = [];
      for (let i = 0; i < o.count; i++) {
        o.getMatrixAt(i, _m4);
        const pos = new THREE.Vector3(), quat = new THREE.Quaternion(), scl = new THREE.Vector3();
        _m4.decompose(pos, quat, scl);
        base.push({ pos, quat, scl, piece: o.userData.pieceOf?.[i] ?? 0 });
      }
      parts.push({ mesh: o, base });
    });
    this.eel = this.rolls.getObjectByName('eel') || null;
    const t0 = (first ? this.t0 + 0.3 : this.stage._time) + 0.02;
    const reduced = this.stage.reduced;
    this.anim = reduced
      ? null
      : {
          parts,
          pieces: Array.from({ length: 6 }, (_, i) => ({ t0: t0 + i * 0.11, s: sp(1), landed: false })),
          eelT0: t0 + 6 * 0.11 + 0.25,
        };
    if (this.eel) this.eel.visible = reduced;
    if (!reduced) this._place(this.stage._time, 0);
  }

  _place(now, dt) {
    const A = this.anim;
    let moving = false;
    const FROM = 1.3, DUR = 0.34;
    const off = A.pieces.map((p) => {
      if (now < p.t0) return { y: 99, sq: 1 };
      const t = clamp01((now - p.t0) / DUR);
      if (t >= 1 && !p.landed) {
        p.landed = true;
        p.s.v -= 1.3;
      }
      if (spring(p.s, 1, 320, 14, dt) || t < 1) moving = true;
      return { y: FROM * (1 - t * t), sq: p.s.x };
    });
    for (const { mesh, base } of A.parts) {
      for (let i = 0; i < base.length; i++) {
        const b = base[i];
        const o = off[b.piece] || off[0];
        // aplastón: se ensancha y baja un poco desde la base de la pieza
        _p3.set(b.pos.x, o.y > 50 ? -50 : b.pos.y * o.sq + o.y, b.pos.z);
        _s3.set(b.scl.x * (1 + (1 - o.sq) * 0.5), b.scl.y * o.sq, b.scl.z * (1 + (1 - o.sq) * 0.5));
        _m4.compose(_p3, b.quat, _s3);
        mesh.setMatrixAt(i, _m4);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
    // la salsa se dibuja de izquierda a derecha cuando todas las piezas aterrizaron
    if (this.eel) {
      const e = clamp01((now - A.eelT0) / 0.6);
      this.eel.visible = e > 0;
      const k = 1 - Math.pow(1 - e, 3);
      this.eel.scale.x = Math.max(0.001, k);
      this.eel.position.x = -1.15 * (1 - k);
      if (e < 1) moving = true;
    }
    if (!moving && now > A.eelT0 + 0.6) this.anim = null;
    return moving;
  }

  update(dt, now) {
    if (now < this.t0) return true;
    this.group.visible = true;
    let a = false;
    // la pizarra baja un poquito y aparece
    const o = clamp01((now - this.t0) / 0.25);
    const bm = materialsOf(this.board);
    if (bm[0] && bm[0].opacity !== o) {
      bm.forEach((m) => (m.opacity = o));
      this.board.position.y = (1 - o) * 0.15;
      a = true;
    }
    if (this.rolls) {
      const rm = materialsOf(this.rolls);
      const ro = clamp01((now - this.t0) / 0.2);
      if (rm[0] && rm[0].opacity !== ro) rm.forEach((m) => (m.opacity = ro));
    }
    if (this.anim) a = this._place(now, dt) || a;
    return a;
  }
}

const _m4 = new THREE.Matrix4();
const _p3 = new THREE.Vector3();
const _s3 = new THREE.Vector3();

/* ------------------------------------------------------------------ */
/* Escena                                                              */
/* ------------------------------------------------------------------ */

export class ItemScene extends Stage {
  constructor(container, options = {}) {
    super(container, Object.assign({ frameCenter: 0.5 }, options));
    this.model = null;
  }

  /**
   * @param {{variant: 'drink'|'starter'|'dessert', name?: string, description?: string, choices?: string[]}} p
   */
  setProduct({ variant, name = '', description = '', choices = [] }) {
    if (this._disposed) return;
    const kind = itemKindFor(variant, name);
    if (!this.model || this.model.kind !== kind) {
      this.model?.dispose();
      this.model =
        kind === 'basket'
          ? new BasketModel(this)
          : kind === 'popsicle'
            ? new PopsicleModel(this)
            : kind === 'pizza'
              ? new PizzaModel(this)
              : kind === 'sushi'
                ? new SushiModel(this)
                : new DrinkModel(this, kind);
      this._setElevation(this.model.elev);
    }
    this.model.set({ name, description, choices });
    this._dirty = true;
    this._kick();
  }

  /** Altura de la cámara según el producto (pizza y sushi son planos: se ven desde más arriba). */
  _setElevation(elev) {
    const c = this.controls;
    if (!c) return;
    if (this._baseElev == null) this._baseElev = Math.PI / 2 - new THREE.Spherical().setFromVector3(this.camera.position.clone().sub(c.target)).phi;
    const want = elev ?? this._baseElev;
    const off = this.camera.position.clone().sub(c.target);
    const s = new THREE.Spherical().setFromVector3(off);
    s.phi = Math.PI / 2 - want;
    off.setFromSpherical(s);
    this.camera.position.copy(c.target).add(off);
    c.update();
  }

  _update(dt, now) {
    if (!this.model) return { visible: false };
    let active = this.model.update(dt, now);
    // pizza recién hecha: vapor (equipos medios y altos) y brasas (altos), igual que la hamburguesa
    const wantsAtmos = this.model.kind === 'pizza' && this._dark && !this.reduced && this.q.name !== 'low';
    if (wantsAtmos && !this._atmos) this._atmos = new Atmosphere(this.scene, this.q, { emberRing: [1.9, 2.5] });
    if (!wantsAtmos && this._atmos) {
      this._atmos.dispose(this.scene);
      this._atmos = null;
    }
    if (this._atmos) active = this._atmos.update(dt, !!this.model.settled, { top: 0.32, spread: 0.95 }) || active;
    this.frameH = this.model.frameH;
    this.frameW = this.model.frameW;
    this.frameCenter = this.model.frameCenter;
    return { active, visible: this.model.group.visible };
  }
}

export default ItemScene;
