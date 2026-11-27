/**
 * Ingredientes de la pizza en 3D, con detalle: cada uno con su forma irregular,
 * su textura (grasa del pepperoni, vetas del jamón, fibras de la piña…) y
 * apoyado sobre el relieve real de la pizza (sigue la inclinación del queso).
 *
 * Cada tipo es UNA malla instanciada: muchas piezas, una sola llamada de dibujo.
 */
import { THREE, mulberry32, fbm, clamp01, smooth, lerp, canvasTex, TEXTURES, food, solidColor } from './core.js';

/* ------------------------------------------------------------------ */
/* texturas (se dibujan una sola vez, al primer uso)                   */
/* ------------------------------------------------------------------ */

const mix3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

function pixels(g, w, h, fn) {
  const img = g.createImageData(w, h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const c = fn(x, y);
      const i = (y * w + x) * 4;
      img.data[i] = c[0];
      img.data[i + 1] = c[1];
      img.data[i + 2] = c[2];
      img.data[i + 3] = 255;
    }
  g.putImageData(img, 0, 0);
}

function specks(g, w, h, r, n, rMin, rMax, style, inside = 0.86) {
  for (let k = 0; k < n; k++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * inside;
    const x = w / 2 + Math.cos(a) * d * (w / 2), y = h / 2 + Math.sin(a) * d * (h / 2);
    const rad = rMin + r() * (rMax - rMin);
    g.fillStyle = typeof style === 'function' ? style(r) : style;
    g.beginPath();
    g.ellipse(x, y, rad, rad * (0.55 + r() * 0.45), r() * Math.PI, 0, Math.PI * 2);
    g.fill();
  }
}

Object.assign(TEXTURES, {
  /** Pepperoni: rojo con grasa blanca, pimienta y borde tostado. */
  pz_pepperoni: () =>
    canvasTex(
      256, 256,
      (g, w, h) => {
        pixels(g, w, h, (x, y) => {
          const dx = (x + 0.5) / w * 2 - 1, dy = (y + 0.5) / h * 2 - 1;
          const r = Math.hypot(dx, dy);
          const n = fbm(x / 16, y / 16, 0, 4, 3), n2 = fbm(x / 4, y / 4, 3, 9, 2);
          let c = mix3([184, 44, 26], [140, 26, 14], clamp01(n * 0.8 + 0.5));
          c = mix3(c, [118, 26, 12], smooth(0.74, 0.95, r) * 0.6); // borde más cocido
          c = mix3(c, [92, 30, 14], smooth(0.95, 1.02, r) * 0.55); // filo tostado
          const k = 1 + n2 * 0.16;
          return [c[0] * k, c[1] * k, c[2] * k];
        });
        const r = mulberry32(77);
        specks(g, w, h, r, 120, 1.4, 4.6, (r) => `rgba(${226 + r() * 20},${150 + r() * 30},${132 + r() * 25},${0.75 + r() * 0.2})`, 0.84);
        specks(g, w, h, r, 70, 0.6, 1.5, 'rgba(38,10,4,0.7)', 0.86);
        specks(g, w, h, r, 30, 0.8, 2, 'rgba(255,214,190,0.35)', 0.8);
      },
      { srgb: true }
    ),
  /** Jamón: rosado con vetas de grasa y moteado. */
  pz_ham: () =>
    canvasTex(
      256, 256,
      (g, w, h) => {
        pixels(g, w, h, (x, y) => {
          const dx = (x + 0.5) / w * 2 - 1, dy = (y + 0.5) / h * 2 - 1;
          const r = Math.hypot(dx, dy);
          const n = fbm(x / 40, y / 40, 0, 12, 2);
          const vein = Math.abs(Math.sin(x * 0.03 + y * 0.012 + n * 4));
          let c = mix3([218, 112, 112], [236, 146, 140], clamp01(n * 0.8 + 0.5));
          c = mix3(c, [246, 196, 184], smooth(0.93, 0.995, vein) * 0.6); // vetas de grasa
          c = mix3(c, [176, 86, 74], smooth(0.78, 0.98, r) * 0.55); // borde dorado del horno
          return c;
        });
      },
      { srgb: true }
    ),
  /** Piña: amarilla con fibras y bordes caramelizados. */
  pz_pineapple: () =>
    canvasTex(
      256, 256,
      (g, w, h) => {
        pixels(g, w, h, (x, y) => {
          const n = fbm(x / 30, y / 7, 0, 21, 3);
          const fib = Math.sin(y * 0.85 + n * 4);
          let c = mix3([246, 172, 34], [255, 210, 86], smooth(-0.3, 0.9, fib));
          c = mix3(c, [214, 140, 40], smooth(0.35, 0.7, fbm(x / 40, y / 40, 9, 5, 3)) * 0.4);
          return c;
        });
      },
      { srgb: true }
    ),
  /** Champiñón en lámina: blanco cremoso con fibras y piel marrón en el borde. */
  pz_mushroom: () =>
    canvasTex(
      256, 256,
      (g, w, h) => {
        pixels(g, w, h, (x, y) => {
          const n = fbm(x / 6, y / 40, 0, 31, 2);
          return mix3([236, 222, 196], [206, 184, 150], clamp01(n * 1.4 + 0.35));
        });
        // silueta (mismas medidas que la forma 3D, ver mushroomShape)
        g.save();
        g.translate(w / 2, h / 2);
        g.scale(w / MUSH_UV, -h / MUSH_UV);
        g.translate(0, -MUSH_CY);
        g.beginPath();
        mushroomPath(g);
        g.lineJoin = 'round';
        g.strokeStyle = 'rgb(126,88,56)';
        g.lineWidth = 0.022;
        g.stroke();
        g.strokeStyle = 'rgba(170,128,88,0.7)';
        g.lineWidth = 0.036;
        g.globalCompositeOperation = 'multiply';
        g.stroke();
        g.restore();
      },
      { srgb: true }
    ),
});

/* ------------------------------------------------------------------ */
/* formas                                                              */
/* ------------------------------------------------------------------ */

/**
 * Lámina redonda/irregular con grosor (pepperoni, jamón): malla polar de arriba
 * + un anillo de costado. UV de arriba hacia abajo (la textura cubre la pieza).
 */
function sheet({ R, rFn = () => 1, yFn = () => 0, rings = 8, segs = 40, thick = 0.016 }) {
  const pos = [], uv = [], idx = [];
  const total = rings + 1;
  for (let i = 0; i <= total; i++) {
    const side = i === total;
    const rho = side ? 0.97 : i / rings;
    for (let j = 0; j <= segs; j++) {
      const a = (j / segs) * Math.PI * 2;
      const rr = rho * R * rFn(a);
      const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
      const y = yFn(x, z, Math.min(rho, 1), a) - (side ? thick : 0);
      pos.push(x, y, z);
      const ur = Math.min(rho, 1) * R * rFn(a) * (side ? 1.02 : 1);
      uv.push(0.5 + (Math.cos(a) * ur) / (2.06 * R), 0.5 - (Math.sin(a) * ur) / (2.06 * R));
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
  return g;
}

/** Recorre los vértices y los mueve con fn(x, y, z) → [x, y, z]. */
function warp(g, fn) {
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const o = fn(p.getX(i), p.getY(i), p.getZ(i));
    p.setXYZ(i, o[0], o[1], o[2]);
  }
  g.computeVertexNormals();
}

/** Apoya la pieza en y = 0 y la centra en x/z. */
function seat(g) {
  g.computeBoundingBox();
  const b = g.boundingBox;
  g.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2);
}

const MUSH_UV = 0.2, MUSH_CY = 0.0175;
function mushroomPath(s) {
  // sombrero redondo + tallo (corte de champiñón)
  s.moveTo(0.03, 0.02);
  s.lineTo(0.086, 0.02);
  s.bezierCurveTo(0.09, 0.075, 0.05, 0.108, 0, 0.108);
  s.bezierCurveTo(-0.05, 0.108, -0.09, 0.075, -0.086, 0.02);
  s.lineTo(-0.03, 0.02);
  s.bezierCurveTo(-0.034, -0.02, -0.03, -0.055, -0.026, -0.072);
  s.lineTo(0.026, -0.072);
  s.bezierCurveTo(0.03, -0.055, 0.034, -0.02, 0.03, 0.02);
}

/** Color por instancia con pequeña variación (un multiplicador cercano a blanco). */
const tint = (r, amt = 0.12, base = [1, 1, 1]) => {
  const k = 1 - r() * amt;
  return new THREE.Color(base[0] * k, base[1] * k, base[2] * (k - r() * amt * 0.3));
};

/* ------------------------------------------------------------------ */
/* reparto sobre la pizza                                              */
/* ------------------------------------------------------------------ */

function scatter(n, R, minD, seed) {
  const r = mulberry32(seed);
  const pts = [];
  let tries = 0;
  while (pts.length < n && tries < n * 80) {
    tries++;
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * R;
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (pts.some((p) => (p.x - x) ** 2 + (p.z - z) ** 2 < minD * minD)) continue;
    pts.push({ x, z, rot: r() * Math.PI * 2, s: 0.85 + r() * 0.3, t: r(), r });
  }
  return pts;
}

/** Altura e inclinación de la superficie bajo una pieza de radio `rad`. */
function sit(surf, x, z, rad) {
  const c = surf(x, z);
  const e = surf(x + rad, z), w = surf(x - rad, z), s = surf(x, z + rad), n = surf(x, z - rad);
  const y = Math.max(c, (c + e + w + s + n) / 5);
  return { y, rz: Math.atan((e - w) / (2 * rad)) * 0.85, rx: -Math.atan((s - n) / (2 * rad)) * 0.85 };
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();

function instanced(geo, mat, items) {
  if (!geo.attributes.color) solidColor(geo, new THREE.Color(1, 1, 1));
  const im = new THREE.InstancedMesh(geo, mat, items.length);
  items.forEach((t, i) => {
    // primero se gira sobre sí misma y después se inclina con la superficie
    _e.set(t.rx || 0, t.ry || 0, t.rz || 0, 'XZY');
    _q.setFromEuler(_e);
    _p.set(t.x, t.y, t.z);
    _s.set(t.sx ?? t.s ?? 1, t.sy ?? t.s ?? 1, t.sz ?? t.s ?? 1);
    im.setMatrixAt(i, _m.compose(_p, _q, _s));
    if (t.color) im.setColorAt(i, t.color);
  });
  im.castShadow = true;
  im.receiveShadow = true;
  return im;
}

/* ------------------------------------------------------------------ */
/* ingredientes                                                        */
/* ------------------------------------------------------------------ */

const SEEDS = { pepperoni: 11, jamon: 23, pina: 37, champinon: 41, aceituna: 53, albahaca: 61, maiz: 71, tocineta: 83, cebolla: 97, pimenton: 101, quesoazul: 113, parmesano: 127 };

/**
 * Un tipo de ingrediente repartido sobre la pizza.
 * @param {string} kind
 * @param {{ detail: number }} q calidad
 * @param {{ surf: (x:number, z:number) => number, R: number }} env superficie de la pizza y radio útil
 */
export function buildDetailedTopping(kind, q, env) {
  const D = q.detail;
  const { surf, R } = env;
  const seed = SEEDS[kind] || 5;
  const g = new THREE.Group();
  let geo, mat, items;

  switch (kind) {
    case 'pepperoni': {
      const RR = 0.15;
      const w = mulberry32(3);
      const wob = Array.from({ length: 6 }, () => w() * Math.PI * 2);
      geo = sheet({
        R: RR,
        rings: Math.round(6 + 6 * D),
        segs: Math.round(28 + 20 * D),
        thick: 0.014,
        rFn: (a) => 1 + Math.sin(a * 3 + wob[0]) * 0.025 + Math.sin(a * 7 + wob[1]) * 0.012,
        // se curva como taza al hornearse, con el filo ondulado y la grasa en el centro
        yFn: (x, z, rho, a) => 0.014 + rho ** 2.2 * 0.032 + Math.sin(a * 4 + wob[2]) * rho ** 4 * 0.006 + fbm(x * 60, 0, z * 60, 4, 2) * 0.0025,
      });
      mat = food({ map: 'pz_pepperoni', bump: 'fine', bumpScale: 0.9, roughness: 0.24, clearcoat: 0.9, clearcoatRoughness: 0.18, sheen: 0.2, sheenColor: '#ff9a7a', side: THREE.DoubleSide });
      items = scatter(13, R, 0.31, seed).map((p) => {
        const st = sit(surf, p.x, p.z, 0.1);
        return { x: p.x, y: st.y - 0.008, z: p.z, ry: p.rot, rx: st.rx, rz: st.rz, s: p.s * 0.95, color: tint(p.r, 0.18) };
      });
      break;
    }
    case 'jamon': {
      const w = mulberry32(8);
      const ph = Array.from({ length: 4 }, () => w() * Math.PI * 2);
      geo = sheet({
        R: 0.13,
        rings: Math.round(5 + 5 * D),
        segs: Math.round(28 + 16 * D),
        thick: 0.01,
        // trozo cuadrado de bordes rotos
        rFn: (a) => {
          const sq = 1 / Math.max(Math.abs(Math.cos(a)), Math.abs(Math.sin(a))) ** 0.75;
          return Math.min(1.25, sq) * (0.86 + Math.sin(a * 5 + ph[0]) * 0.05 + Math.sin(a * 11 + ph[1]) * 0.03);
        },
        // ondulado: el jamón se arquea con el calor
        yFn: (x, z) => 0.01 + Math.sin(x * 26 + ph[2]) * 0.006 + (x * x + z * z) * 0.9 + fbm(x * 50, 1, z * 50, 6, 2) * 0.002,
      });
      mat = food({ map: 'pz_ham', bump: 'fine', bumpScale: 0.2, roughness: 0.32, clearcoat: 0.55, clearcoatRoughness: 0.3, sheen: 0.35, sheenColor: '#ffd6cc', side: THREE.DoubleSide });
      items = scatter(11, R, 0.3, seed).map((p) => {
        const st = sit(surf, p.x, p.z, 0.09);
        return { x: p.x, y: st.y - 0.006, z: p.z, ry: p.rot, rx: st.rx, rz: st.rz, s: p.s, color: tint(p.r, 0.12) };
      });
      break;
    }
    case 'pina': {
      // trozo de rodaja: sector de anillo con volumen
      const s = new THREE.Shape();
      const a0 = -0.4, a1 = 0.4, ri = 0.05, ro = 0.12;
      s.moveTo(Math.cos(a0) * ri, Math.sin(a0) * ri);
      s.lineTo(Math.cos(a0) * ro, Math.sin(a0) * ro);
      s.absarc(0, 0, ro, a0, a1, false);
      s.lineTo(Math.cos(a1) * ri, Math.sin(a1) * ri);
      s.absarc(0, 0, ri, a1, a0, true);
      geo = new THREE.ExtrudeGeometry(s, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.007, bevelSegments: 3, curveSegments: Math.round(6 + 6 * D) });
      geo.rotateX(-Math.PI / 2);
      // UV de arriba: fibras que salen del centro de la rodaja
      const p = geo.attributes.position, uv = geo.attributes.uv;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), z = p.getZ(i);
        uv.setXY(i, Math.atan2(z, x) * 0.6 + 0.5, (Math.hypot(x, z) - ri) / (ro - ri) * 0.5 + p.getY(i) * 3);
      }
      warp(geo, (x, y, z) => [x, y * (1 - Math.max(0, Math.hypot(x, z) - 0.085) * 4), z]); // más bajo hacia afuera
      seat(geo);
      mat = food({ map: 'pz_pineapple', bump: 'fine', bumpScale: 0.7, roughness: 0.22, clearcoat: 0.7, clearcoatRoughness: 0.15, sheen: 0.2, sheenColor: '#fff6d0' });
      mat.emissive.set('#4a2600'); // los costados en sombra quedaban verdosos
      items = scatter(13, R, 0.24, seed).map((p) => {
        const st = sit(surf, p.x, p.z, 0.06);
        return { x: p.x, y: st.y - 0.008, z: p.z, ry: p.rot, rx: st.rx, rz: st.rz, s: p.s, color: tint(p.r, 0.1) };
      });
      break;
    }
    case 'champinon': {
      const s = new THREE.Shape();
      mushroomPath(s);
      geo = new THREE.ExtrudeGeometry(s, { depth: 0.014, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2, curveSegments: Math.round(8 + 8 * D) });
      const p = geo.attributes.position, uv = geo.attributes.uv;
      for (let i = 0; i < p.count; i++) uv.setXY(i, 0.5 + p.getX(i) / MUSH_UV, 0.5 + (p.getY(i) - MUSH_CY) / MUSH_UV);
      geo.rotateX(-Math.PI / 2);
      warp(geo, (x, y, z) => [x, y + (x * x) * 1.4, z]); // la lámina se curva un poco
      seat(geo);
      mat = food({ map: 'pz_mushroom', bump: 'fine', bumpScale: 0.6, roughness: 0.38, clearcoat: 0.35, clearcoatRoughness: 0.4, sheen: 0.3, sheenColor: '#fff4e0' });
      items = scatter(12, R, 0.26, seed).map((p) => {
        const st = sit(surf, p.x, p.z, 0.06);
        return { x: p.x, y: st.y - 0.004, z: p.z, ry: p.rot, rx: st.rx, rz: st.rz, s: p.s * 1.3, color: tint(p.r, 0.12) };
      });
      break;
    }
    case 'aceituna': {
      geo = new THREE.TorusGeometry(0.04, 0.019, Math.round(8 + 6 * D), Math.round(18 + 14 * D));
      geo.rotateX(Math.PI / 2);
      warp(geo, (x, y, z) => [x * (1 + Math.sin(Math.atan2(z, x) * 2) * 0.05), y * 0.78, z]);
      seat(geo);
      const p = geo.attributes.position;
      const cols = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++) {
        // por dentro (el hueco del carozo) más claro y verdoso
        const inner = clamp01((0.045 - Math.hypot(p.getX(i), p.getZ(i))) / 0.02);
        const c = new THREE.Color('#2a1c22').lerp(new THREE.Color('#5a4a36'), inner * 0.8);
        cols.set([c.r, c.g, c.b], i * 3);
      }
      geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
      mat = food({ bumpScale: 0.15, roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.06 });
      items = scatter(15, R, 0.17, seed).map((p) => {
        const st = sit(surf, p.x, p.z, 0.04);
        return { x: p.x, y: st.y - 0.008, z: p.z, ry: p.rot, rx: st.rx + (p.t - 0.5) * 0.3, rz: st.rz, s: p.s, color: tint(p.r, 0.25) };
      });
      break;
    }
    case 'maiz': {
      geo = new THREE.SphereGeometry(0.032, Math.round(8 + 6 * D), Math.round(6 + 4 * D));
      // grano: redondo arriba, en punta hacia la base
      warp(geo, (x, y, z) => {
        const k = z < 0 ? 1 + z * 14 : 1;
        return [x * k * 1.05, y * 0.7, z * 1.1];
      });
      seat(geo);
      const p = geo.attributes.position;
      const cols = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++) {
        const c = new THREE.Color('#f5bd22').lerp(new THREE.Color('#fbe7a2'), clamp01(-p.getZ(i) / 0.03));
        cols.set([c.r, c.g, c.b], i * 3);
      }
      geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
      mat = food({ bumpScale: 0.2, roughness: 0.2, clearcoat: 0.9, clearcoatRoughness: 0.12, sheen: 0.3, sheenColor: '#fff3b0' });
      items = scatter(36, R, 0.1, seed).map((p) => {
        const st = sit(surf, p.x, p.z, 0.02);
        return { x: p.x, y: st.y - 0.006, z: p.z, ry: p.rot, rx: st.rx + (p.t - 0.5) * 0.5, rz: st.rz, s: p.s, color: tint(p.r, 0.12) };
      });
      break;
    }
    case 'tocineta': {
      const L = 0.3, W = 0.075;
      geo = new THREE.BoxGeometry(L, 0.012, W, Math.round(18 + 18 * D), 1, 3);
      const p = geo.attributes.position, uv = geo.attributes.uv;
      for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / L + 0.5, p.getZ(i) / W + 0.5);
      // ondulada y algo retorcida, como tocineta crujiente
      warp(geo, (x, y, z) => [x, y + Math.sin(x * 28) * 0.013 + Math.sin(x * 11 + 1) * 0.007 + z * Math.sin(x * 20) * 0.12, z * (1 + Math.sin(x * 40) * 0.06)]);
      seat(geo);
      mat = food({ map: 'bacon', bump: 'fine', bumpScale: 1, roughness: 0.3, clearcoat: 0.7, clearcoatRoughness: 0.2, sheen: 0.25 });
      items = scatter(10, R, 0.25, seed).map((p) => {
        const st = sit(surf, p.x, p.z, 0.09);
        return { x: p.x, y: st.y - 0.006, z: p.z, ry: p.rot, rx: st.rx, rz: st.rz, s: p.s, color: tint(p.r, 0.15) };
      });
      break;
    }
    case 'cebolla': {
      geo = new THREE.TorusGeometry(0.085, 0.012, Math.round(6 + 4 * D), Math.round(22 + 18 * D), Math.PI * 1.45);
      geo.rotateX(Math.PI / 2);
      warp(geo, (x, y, z) => [x, y * 0.5, z * 0.85]);
      seat(geo);
      const p = geo.attributes.position;
      const cols = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), z = p.getZ(i);
        const out = clamp01((Math.hypot(x, z / 0.85) - 0.083) / 0.014 + 0.5);
        const c = new THREE.Color('#f3e3ee').lerp(new THREE.Color('#8a3570'), smooth(0.3, 0.9, out));
        c.lerp(new THREE.Color('#b07a3c'), clamp01(fbm(x * 40, 0, z * 40, 3, 2) * 1.5) * 0.35); // algo dorada
        cols.set([c.r, c.g, c.b], i * 3);
      }
      geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
      mat = food({ bumpScale: 0.2, roughness: 0.22, clearcoat: 0.8, clearcoatRoughness: 0.2, sheen: 0.4, sheenColor: '#ffe6f6' });
      items = scatter(11, R, 0.2, seed).map((p) => {
        const st = sit(surf, p.x, p.z, 0.06);
        return { x: p.x, y: st.y - 0.004, z: p.z, ry: p.rot, rx: st.rx, rz: st.rz, s: p.s, color: tint(p.r, 0.1) };
      });
      break;
    }
    case 'pimenton': {
      // tira curva: un trozo de la pared del pimentón (con grosor)
      const arc = 1.5;
      const outer = new THREE.CylinderGeometry(0.06, 0.06, 0.21, Math.round(8 + 6 * D), Math.round(6 + 6 * D), true, Math.PI / 2 - arc / 2, arc);
      outer.rotateZ(Math.PI / 2);
      geo = outer;
      warp(geo, (x, y, z) => [x, y + Math.sin(x * 22) * 0.008, z]);
      seat(geo);
      const p = geo.attributes.position;
      const cols = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++) {
        const k = 1 - clamp01(fbm(p.getX(i) * 50, 2, p.getZ(i) * 50, 8, 2) * 2 - 0.3) * 0.35; // manchitas de horno
        cols.set([k, k, k], i * 3);
      }
      geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
      mat = food({ bumpScale: 0.15, roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.08, side: THREE.DoubleSide });
      const palette = ['#c8261a', '#3c8a22', '#c8261a', '#e0a81c'];
      items = scatter(13, R, 0.19, seed).map((p, i) => {
        const st = sit(surf, p.x, p.z, 0.07);
        return { x: p.x, y: st.y - 0.012, z: p.z, ry: p.rot, rx: st.rx, rz: st.rz, s: p.s, color: new THREE.Color(palette[i % palette.length]).multiplyScalar(1 - p.t * 0.15) };
      });
      break;
    }
    case 'quesoazul': {
      geo = new THREE.IcosahedronGeometry(0.045, D > 0.8 ? 3 : 2);
      warp(geo, (x, y, z) => {
        const k = 1 + fbm(x * 40, y * 40, z * 40, 2, 3) * 0.35;
        return [x * k, Math.max(y * k, -0.01) * 0.5, z * k];
      });
      seat(geo);
      const p = geo.attributes.position;
      const cols = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++) {
        const v = fbm(p.getX(i) * 70, p.getY(i) * 70, p.getZ(i) * 70, 9, 3);
        const c = new THREE.Color('#f2eee2').lerp(new THREE.Color('#5b7088'), smooth(0.12, 0.3, v) * 0.85);
        c.lerp(new THREE.Color('#d9a04a'), smooth(0.9, 1, p.getY(i) / 0.025) * 0.35); // tostado arriba
        cols.set([c.r, c.g, c.b], i * 3);
      }
      geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
      mat = food({ bump: 'fine', bumpScale: 0.8, roughness: 0.5, clearcoat: 0.25, sheen: 0.4, sheenColor: '#fff6e0' });
      items = scatter(13, R, 0.19, seed).map((p) => {
        const st = sit(surf, p.x, p.z, 0.04);
        return { x: p.x, y: st.y - 0.01, z: p.z, ry: p.rot, rx: st.rx, rz: st.rz, s: p.s };
      });
      break;
    }
    case 'parmesano': {
      // virutas finas y curvadas
      geo = new THREE.PlaneGeometry(0.085, 0.038, 10, 4);
      geo.rotateX(-Math.PI / 2);
      warp(geo, (x, y, z) => [x, y + (x / 0.0425) ** 2 * 0.014 + Math.sin(z * 60) * 0.002, z]);
      seat(geo);
      const p = geo.attributes.position;
      const cols = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++) {
        const c = new THREE.Color('#f4e7c2').lerp(new THREE.Color('#e7cf8e'), clamp01(fbm(p.getX(i) * 80, 0, p.getZ(i) * 80, 4, 2) + 0.4));
        cols.set([c.r, c.g, c.b], i * 3);
      }
      geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
      mat = food({ bump: 'fine', bumpScale: 0.6, roughness: 0.55, sheen: 0.5, sheenColor: '#fff8e6', side: THREE.DoubleSide });
      items = scatter(26, R, 0.1, seed).map((p) => {
        const st = sit(surf, p.x, p.z, 0.03);
        return { x: p.x, y: st.y + 0.002, z: p.z, ry: p.rot, rx: st.rx, rz: st.rz + (p.t - 0.5) * 0.4, s: p.s };
      });
      break;
    }
    case 'albahaca': {
      // solo cuando no hay foto (la foto ya trae la albahaca)
      geo = new THREE.SphereGeometry(0.14, 16, 6);
      geo.scale(1, 0.08, 0.55);
      warp(geo, (x, y, z) => [x, y - Math.abs(z) * 0.08 + Math.cos(x * 12) * 0.005, z]);
      seat(geo);
      const p = geo.attributes.position;
      const cols = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++) {
        const c = new THREE.Color('#2f6d1f').lerp(new THREE.Color('#5aa83a'), clamp01(0.5 - Math.abs(p.getZ(i)) * 6));
        cols.set([c.r, c.g, c.b], i * 3);
      }
      geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
      mat = food({ bumpScale: 0.3, roughness: 0.3, clearcoat: 0.6, sheen: 0.3, sheenColor: '#d6ffb0' });
      items = scatter(7, R * 0.85, 0.3, seed).map((p) => {
        const st = sit(surf, p.x, p.z, 0.1);
        return { x: p.x, y: st.y, z: p.z, ry: p.rot, rx: st.rx, rz: st.rz, s: p.s };
      });
      break;
    }
    default:
      return g;
  }
  g.add(instanced(geo, mat, items));
  return g;
}
