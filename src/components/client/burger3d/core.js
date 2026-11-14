/**
 * Núcleo 3D compartido por todos los productos del menú (hamburguesa, bebidas,
 * entradas y postres): utilidades, texturas procedurales, material de comida,
 * calidad por dispositivo y la clase Stage (renderer + bucle optimizado).
 *
 * Rendimiento:
 *  - Calidad automática por dispositivo (high / medium / low) + resolución
 *    adaptativa según los FPS reales.
 *  - Geometrías y texturas se generan una vez y se reutilizan.
 *  - Shaders precompilados en paralelo; sombras solo se recalculan si algo se mueve;
 *    no se dibuja nada si la escena está quieta o fuera de pantalla.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { mergeVertices, mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export { THREE, mergeGeometries };

/* ------------------------------------------------------------------ */
/* Utilidades matemáticas                                              */
/* ------------------------------------------------------------------ */

export const V2 = (x, y) => new THREE.Vector2(x, y);
export const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const smooth = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const lerp = (a, b, t) => a + (b - a) * t;

export function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function strHash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function hash3(ix, iy, iz, seed) {
  let h =
    Math.imul(ix | 0, 0x27d4eb2d) ^
    Math.imul(iy | 0, 0x165667b1) ^
    Math.imul(iz | 0, 0x5bd1e995) ^
    Math.imul(seed | 0, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export function vnoise(x, y, z, seed) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fx = x - ix, fy = y - iy, fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy), uz = fz * fz * (3 - 2 * fz);
  const c000 = hash3(ix, iy, iz, seed), c100 = hash3(ix + 1, iy, iz, seed);
  const c010 = hash3(ix, iy + 1, iz, seed), c110 = hash3(ix + 1, iy + 1, iz, seed);
  const c001 = hash3(ix, iy, iz + 1, seed), c101 = hash3(ix + 1, iy, iz + 1, seed);
  const c011 = hash3(ix, iy + 1, iz + 1, seed), c111 = hash3(ix + 1, iy + 1, iz + 1, seed);
  const x00 = lerp(c000, c100, ux), x10 = lerp(c010, c110, ux);
  const x01 = lerp(c001, c101, ux), x11 = lerp(c011, c111, ux);
  return lerp(lerp(x00, x10, uy), lerp(x01, x11, uy), uz);
}

/** Ruido fractal en ~[-1, 1]. */
export function fbm(x, y, z, seed = 0, oct = 4) {
  let sum = 0, amp = 0.5, f = 1, norm = 0;
  for (let i = 0; i < oct; i++) {
    sum += amp * (vnoise(x * f, y * f, z * f, seed + i * 17) * 2 - 1);
    norm += amp;
    amp *= 0.5;
    f *= 2.03;
  }
  return sum / norm;
}

/* ------------------------------------------------------------------ */
/* Utilidades de geometría                                             */
/* ------------------------------------------------------------------ */

export function spline(pts, n) {
  return new THREE.SplineCurve(pts.map((p) => V2(p[0], p[1]))).getPoints(Math.max(8, Math.round(n)));
}

export function flatLine(x0, x1, y, steps) {
  const out = [];
  steps = Math.max(2, Math.round(steps));
  for (let i = 0; i <= steps; i++) out.push(V2(lerp(x0, x1, i / steps), y));
  return out;
}

export function joinProfiles(...parts) {
  const out = [];
  for (const p of parts)
    for (const v of p) {
      const last = out[out.length - 1];
      if (last && last.distanceTo(v) < 1e-5) continue;
      out.push(v);
    }
  return out;
}

/**
 * Normales suaves aunque la malla tenga costuras (vértices duplicados con UV
 * distinta): promedia las normales de los vértices que ocupan la misma posición.
 */
export function weldNormals(g) {
  g.computeVertexNormals();
  const p = g.attributes.position, n = g.attributes.normal;
  const groups = new Map();
  for (let i = 0; i < p.count; i++) {
    const k = Math.round(p.getX(i) * 1e4) + ',' + Math.round(p.getY(i) * 1e4) + ',' + Math.round(p.getZ(i) * 1e4);
    const arr = groups.get(k);
    if (arr) arr.push(i);
    else groups.set(k, [i]);
  }
  const v = new THREE.Vector3();
  for (const idx of groups.values()) {
    if (idx.length < 2) continue;
    v.set(0, 0, 0);
    for (const i of idx) {
      v.x += n.getX(i);
      v.y += n.getY(i);
      v.z += n.getZ(i);
    }
    v.normalize();
    for (const i of idx) n.setXYZ(i, v.x, v.y, v.z);
  }
  n.needsUpdate = true;
}

/** Sólido de revolución que conserva sus UV (para las texturas de detalle). */
export const latheGeo = (points, segments) => new THREE.LatheGeometry(points, Math.round(segments));

export function cleanMerge(g) {
  g.deleteAttribute('uv');
  g.deleteAttribute('normal');
  const m = mergeVertices(g, 1e-4);
  m.computeVertexNormals();
  g.dispose();
  return m;
}

export const _v = new THREE.Vector3();
export const _n = new THREE.Vector3();

/** Desplaza cada vértice a lo largo de su normal y recalcula normales suaves. */
export function displace(g, fn) {
  const p = g.attributes.position, n = g.attributes.normal;
  for (let i = 0; i < p.count; i++) {
    _v.fromBufferAttribute(p, i);
    _n.fromBufferAttribute(n, i);
    const d = fn(_v, _n);
    p.setXYZ(i, _v.x + _n.x * d, _v.y + _n.y * d, _v.z + _n.z * d);
  }
  weldNormals(g);
}

/** Asigna colores por vértice. fn(pos, normal, colorOut). */
export function paint(g, fn) {
  const p = g.attributes.position, n = g.attributes.normal;
  const arr = new Float32Array(p.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    _v.fromBufferAttribute(p, i);
    _n.fromBufferAttribute(n, i);
    fn(_v, _n, c);
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
}

export function solidColor(g, color) {
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = color.r;
    arr[i * 3 + 1] = color.g;
    arr[i * 3 + 2] = color.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
}

export const col = (hex) => new THREE.Color(hex);
export const WHITE = new THREE.Color(1, 1, 1);

export function mesh(geo, mat) {
  if (!geo.attributes.color) solidColor(geo, WHITE);
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/* ------------------------------------------------------------------ */
/* Texturas procedurales (se generan una sola vez por página)          */
/* ------------------------------------------------------------------ */

export function canvasTex(w, h, draw, { srgb = false, repeat = null } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = 4;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  return t;
}

/** Dibuja algo que se repite sin costura en una textura de tamaño s. */
export function tiled(s, x, y, r, fn) {
  for (const dx of [-s, 0, s])
    for (const dy of [-s, 0, s]) {
      const X = x + dx, Y = y + dy;
      if (X + r < 0 || X - r > s || Y + r < 0 || Y - r > s) continue;
      fn(X, Y);
    }
}

export function dots(g, s, rand, count, rMin, rMax, style) {
  for (let i = 0; i < count; i++) {
    const x = rand() * s, y = rand() * s, rad = lerp(rMin, rMax, rand()), rot = rand() * Math.PI, sq = 0.45 + rand() * 0.55;
    g.fillStyle = style(rand);
    tiled(s, x, y, rad, (X, Y) => {
      g.beginPath();
      g.ellipse(X, Y, rad, rad * sq, rot, 0, Math.PI * 2);
      g.fill();
    });
  }
}

export function blotches(g, s, rand, count, rMin, rMax, rgbFn) {
  for (let i = 0; i < count; i++) {
    const x = rand() * s, y = rand() * s, rad = lerp(rMin, rMax, rand());
    const [r, gg, b, a] = rgbFn(rand);
    tiled(s, x, y, rad, (X, Y) => {
      const grd = g.createRadialGradient(X, Y, 0, X, Y, rad);
      grd.addColorStop(0, `rgba(${r},${gg},${b},${a})`);
      grd.addColorStop(1, `rgba(${r},${gg},${b},0)`);
      g.fillStyle = grd;
      g.fillRect(X - rad, Y - rad, rad * 2, rad * 2);
    });
  }
}

export const TEXTURES = {
  /** Corteza de pan: moteado suave + poros finos (mapa de detalle y relieve). */
  crust: () =>
    canvasTex(
      512, 512,
      (g, s) => {
        const r = mulberry32(21);
        g.fillStyle = 'rgb(236,236,236)';
        g.fillRect(0, 0, s, s);
        blotches(g, s, r, 80, 25, 90, (r) => (r() < 0.5 ? [255, 255, 255, 0.18] : [165, 150, 135, 0.16]));
        dots(g, s, r, 4200, 0.5, 2.0, (r) => `rgba(95,70,45,${0.14 + r() * 0.3})`);
        dots(g, s, r, 1400, 0.4, 1.1, (r) => `rgba(255,255,255,${0.25 + r() * 0.3})`);
      },
      { repeat: [7, 2] }
    ),
  /** Carne a la parrilla: grietas, grasa y costra. */
  meat: () =>
    canvasTex(
      512, 512,
      (g, s) => {
        const r = mulberry32(5);
        g.fillStyle = 'rgb(170,170,170)';
        g.fillRect(0, 0, s, s);
        blotches(g, s, r, 140, 10, 42, (r) => (r() < 0.6 ? [40, 40, 40, 0.32] : [255, 255, 255, 0.18]));
        dots(g, s, r, 6500, 0.8, 3.6, (r) => (r() < 0.62 ? `rgba(25,25,25,${0.25 + r() * 0.35})` : `rgba(255,255,255,${0.18 + r() * 0.3})`));
      },
      { repeat: [6, 2] }
    ),
  /** Relieve genérico muy suave. */
  fine: () =>
    canvasTex(
      256, 256,
      (g, s) => {
        const r = mulberry32(9);
        g.fillStyle = 'rgb(225,225,225)';
        g.fillRect(0, 0, s, s);
        blotches(g, s, r, 40, 10, 40, (r) => (r() < 0.5 ? [255, 255, 255, 0.2] : [170, 170, 170, 0.2]));
        dots(g, s, r, 900, 0.5, 1.5, (r) => `rgba(150,150,150,${0.15 + r() * 0.2})`);
      },
      { repeat: [2, 2] }
    ),
  /** Venas de la hoja de lechuga (UV plana del disco). */
  leaf: () =>
    canvasTex(512, 512, (g, s) => {
      const r = mulberry32(13);
      const c = s / 2;
      g.fillStyle = 'rgb(212,212,212)';
      g.fillRect(0, 0, s, s);
      blotches(g, s, r, 50, 15, 60, (r) => (r() < 0.5 ? [255, 255, 255, 0.15] : [160, 160, 160, 0.15]));
      g.lineCap = 'round';
      const n = 16;
      for (let i = 0; i < n; i++) {
        const a0 = (i / n) * Math.PI * 2 + r() * 0.2;
        const bend = (r() - 0.5) * 0.5;
        g.strokeStyle = 'rgba(255,255,255,0.95)';
        g.lineWidth = 5;
        g.beginPath();
        g.moveTo(c, c);
        const mx = c + Math.cos(a0 + bend * 0.5) * s * 0.28, my = c + Math.sin(a0 + bend * 0.5) * s * 0.28;
        const ex = c + Math.cos(a0 + bend) * s * 0.55, ey = c + Math.sin(a0 + bend) * s * 0.55;
        g.quadraticCurveTo(mx, my, ex, ey);
        g.stroke();
        g.lineWidth = 1.6;
        g.strokeStyle = 'rgba(255,255,255,0.6)';
        for (let k = 0; k < 9; k++) {
          const t = 0.15 + k * 0.09;
          const px = c + Math.cos(a0 + bend * t) * s * 0.55 * t, py = c + Math.sin(a0 + bend * t) * s * 0.55 * t;
          const side = k % 2 ? 1 : -1;
          const ba = a0 + bend * t + side * (0.6 + r() * 0.3);
          const L = s * (0.04 + r() * 0.05);
          g.beginPath();
          g.moveTo(px, py);
          g.lineTo(px + Math.cos(ba) * L, py + Math.sin(ba) * L);
          g.stroke();
        }
      }
    }),
  /** Tocino: vetas de grasa y carne a lo largo de la tira. */
  bacon: () =>
    canvasTex(
      512, 128,
      (g, w, h) => {
        const img = g.createImageData(w, h);
        const meat = [138, 34, 18], meatDark = [92, 20, 8], fat = [236, 180, 146], fatCrisp = [204, 132, 82];
        for (let y = 0; y < h; y++)
          for (let x = 0; x < w; x++) {
            const v = y / h;
            const n = fbm(x / 60, y / 26, 0, 3, 3);
            const band = Math.sin(v * Math.PI * 3.2 + n * 2.6 + x * 0.004);
            const t = smooth(0.0, 0.55, band);
            const crisp = smooth(-0.25, 0.55, fbm(x / 35, y / 35, 1, 7, 3));
            const i = (y * w + x) * 4;
            for (let k = 0; k < 3; k++) {
              const m = lerp(meat[k], meatDark[k], crisp * 0.8);
              const f = lerp(fat[k], fatCrisp[k], crisp);
              img.data[i + k] = lerp(m, f, t);
            }
            img.data[i + 3] = 255;
          }
        g.putImageData(img, 0, 0);
      },
      { srgb: true }
    ),
  crumb: () =>
    canvasTex(
      512, 512,
      (g, s) => {
        const r = mulberry32(7);
        g.fillStyle = '#efcf96';
        g.fillRect(0, 0, s, s);
        for (let i = 0; i < 9000; i++) {
          const x = r() * s, y = r() * s, rad = 0.6 + r() * 2.6;
          g.fillStyle = r() < 0.6 ? `rgba(150,95,35,${0.1 + r() * 0.22})` : `rgba(255,245,215,${0.2 + r() * 0.3})`;
          g.beginPath();
          g.ellipse(x, y, rad, rad * (0.5 + r() * 0.6), r() * Math.PI, 0, Math.PI * 2);
          g.fill();
        }
        const grd = g.createRadialGradient(s / 2, s / 2, s * 0.22, s / 2, s / 2, s / 2);
        grd.addColorStop(0, 'rgba(160,90,25,0)');
        grd.addColorStop(0.75, 'rgba(170,95,25,0.2)');
        grd.addColorStop(1, 'rgba(140,70,15,0.6)');
        g.fillStyle = grd;
        g.fillRect(0, 0, s, s);
      },
      { srgb: true }
    ),
  tomato: () =>
    canvasTex(
      512, 512,
      (g, s) => {
        const r = mulberry32(3);
        const c = s / 2;
        const grd = g.createRadialGradient(c, c, s * 0.05, c, c, c);
        grd.addColorStop(0, '#f0563a');
        grd.addColorStop(0.8, '#da2f1c');
        grd.addColorStop(0.97, '#b81a0e');
        grd.addColorStop(1, '#8f1108');
        g.fillStyle = grd;
        g.fillRect(0, 0, s, s);
        const n = 5;
        for (let i = 0; i < n; i++) {
          g.save();
          g.translate(c, c);
          g.rotate((i / n) * Math.PI * 2 + 0.4);
          const gel = g.createRadialGradient(s * 0.25, 0, 4, s * 0.25, 0, s * 0.13);
          gel.addColorStop(0, 'rgba(255,150,110,0.95)');
          gel.addColorStop(1, 'rgba(240,80,55,0.95)');
          g.fillStyle = gel;
          g.beginPath();
          g.ellipse(s * 0.25, 0, s * 0.135, s * 0.085, 0, 0, Math.PI * 2);
          g.fill();
          for (let k = 0; k < 11; k++) {
            g.fillStyle = r() < 0.5 ? '#f7dc8c' : '#eac56a';
            g.beginPath();
            g.ellipse(s * (0.17 + r() * 0.15), (r() - 0.5) * s * 0.11, 7, 4, r() * Math.PI, 0, Math.PI * 2);
            g.fill();
          }
          g.restore();
        }
        g.fillStyle = '#f07a5a';
        g.beginPath();
        g.arc(c, c, s * 0.06, 0, Math.PI * 2);
        g.fill();
      },
      { srgb: true }
    ),
  pickle: () =>
    canvasTex(
      256, 256,
      (g, s) => {
        const r = mulberry32(11);
        const c = s / 2;
        g.fillStyle = '#34501a';
        g.fillRect(0, 0, s, s);
        const grd = g.createRadialGradient(c, c, 4, c, c, c * 0.9);
        grd.addColorStop(0, '#d5d98a');
        grd.addColorStop(0.55, '#b4bf5c');
        grd.addColorStop(1, '#8c9c3a');
        g.fillStyle = grd;
        g.beginPath();
        g.arc(c, c, c * 0.88, 0, Math.PI * 2);
        g.fill();
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2 + r() * 0.2;
          g.fillStyle = 'rgba(245,240,200,0.85)';
          g.beginPath();
          g.ellipse(c + Math.cos(a) * c * 0.42, c + Math.sin(a) * c * 0.42, 9, 5, a, 0, Math.PI * 2);
          g.fill();
        }
      },
      { srgb: true }
    ),
  blob: () =>
    canvasTex(256, 256, (g, s) => {
      const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      grd.addColorStop(0, 'rgba(0,0,0,0.85)');
      grd.addColorStop(0.45, 'rgba(0,0,0,0.45)');
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grd;
      g.fillRect(0, 0, s, s);
    }),
};

export const TEX_CACHE = {};
export const tex = (name) => TEX_CACHE[name] || (TEX_CACHE[name] = TEXTURES[name]());

/**
 * Material único para toda la comida. Siempre lleva color por vértice, relieve
 * y barniz (clearcoat): así hay muy pocas variantes de shader que compilar.
 */
export function food(p = {}) {
  return new THREE.MeshPhysicalMaterial({
    vertexColors: true,
    color: p.color ? col(p.color) : new THREE.Color(1, 1, 1),
    map: p.map ? tex(p.map) : null,
    bumpMap: tex(p.bump || 'fine'),
    bumpScale: p.bumpScale ?? 0.5,
    roughness: p.roughness ?? 0.55,
    metalness: 0,
    clearcoat: Math.max(0.03, p.clearcoat ?? 0.03),
    clearcoatRoughness: p.clearcoatRoughness ?? 0.4,
    envMapIntensity: p.env ?? 1,
    side: p.side ?? THREE.FrontSide,
    transparent: true, // fijo: cambiarlo al hacer fade obligaría a recompilar el shader
  });
}

export const TIERS = {
  high: { name: 'high', dpr: 2, minDpr: 1, seg: 112, detail: 1, sesame: 64, shadow: 1024, aa: true },
  medium: { name: 'medium', dpr: 1.5, minDpr: 1, seg: 80, detail: 0.75, sesame: 50, shadow: 1024, aa: false },
  low: { name: 'low', dpr: 1.25, minDpr: 0.8, seg: 56, detail: 0.55, sesame: 36, shadow: 0, aa: false },
};

export function detectTier() {
  if (typeof navigator === 'undefined') return 'medium';
  const nav = navigator;
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(nav.userAgent) || (nav.maxTouchPoints > 1 && /Mac/.test(nav.platform || ''));
  const cores = nav.hardwareConcurrency || 4;
  const mem = nav.deviceMemory || 4;
  let gpu = '';
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
    if (ext) gpu = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '');
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    /* sin info de GPU */
  }
  const weakGpu = /Mali-(4|T[678])|Mali-G(31|51|52|57)|Adreno \(TM\) [3-5]\d\d|Adreno \(TM\) 6[01]\d|PowerVR|SwiftShader|llvmpipe|Intel\(R\) HD Graphics [2-5]\d{2}\b/i.test(gpu);
  if (weakGpu || cores <= 4 || mem <= 3) return 'low';
  if (mobile || cores <= 6 || mem <= 4) return 'medium';
  return 'high';
}

export function spring(s, target, k, c, dt) {
  s.v += (-k * (s.x - target) - c * s.v) * dt;
  s.x += s.v * dt;
  return Math.abs(s.v) > 1e-3 || Math.abs(s.x - target) > 1e-3;
}
export const sp = (x) => ({ x, v: 0 });

let TIER_CACHE = null;

/** Estudio fotográfico cálido para reflejos: softbox principal, contraluz y relleno. */
export function studioEnvironment(renderer) {
  const scene = new THREE.Scene();
  const roomGeo = new THREE.SphereGeometry(10, 24, 12);
  paint(roomGeo, (v, n, c) => {
    const t = smooth(-6, 8, v.y);
    c.setRGB(lerp(0.05, 0.55, t), lerp(0.035, 0.5, t), lerp(0.025, 0.44, t));
  });
  scene.add(new THREE.Mesh(roomGeo, new THREE.MeshBasicMaterial({ side: THREE.BackSide, vertexColors: true })));
  const panel = (w, h, hex, power, x, y, z) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(power), side: THREE.DoubleSide })
    );
    m.position.set(x, y, z);
    m.lookAt(0, 0.5, 0);
    scene.add(m);
  };
  panel(6, 4, '#fff1dc', 7, -3, 6.5, 4); // softbox principal (arriba, adelante-izquierda)
  panel(9, 1.6, '#ffe2b8', 4, 5, 2.2, -4.5); // tira de contraluz cálida
  panel(4, 4, '#dfe9ff', 1.4, -7, 1, -2); // relleno frío
  panel(5, 2.5, '#ffffff', 2.2, 3, 2.5, 6); // relleno frontal
  const pm = new THREE.PMREMGenerator(renderer);
  const rt = pm.fromScene(scene, 0.035);
  pm.dispose();
  scene.traverse((o) => {
    o.geometry?.dispose();
    o.material?.dispose();
  });
  return rt;
}

const HINT_SVG =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex:none"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/></svg>';

/* ------------------------------------------------------------------ */
/* Plantillas en caché (geometría compartida entre aperturas del modal) */
/* ------------------------------------------------------------------ */

const TEMPLATES = new Map();

/**
 * Devuelve una copia de la plantilla `key` (la construye la primera vez).
 * La geometría se comparte; los materiales se clonan para animar la opacidad.
 */
export function fromTemplate(key, build) {
  let tpl = TEMPLATES.get(key);
  if (!tpl) {
    tpl = build();
    tpl.traverse((o) => o.geometry && (o.geometry.userData.cached = true));
    TEMPLATES.set(key, tpl);
  }
  const obj = tpl.clone(true);
  const clones = new Map();
  const cl = (m) => {
    if (!clones.has(m)) clones.set(m, m.clone());
    return clones.get(m);
  };
  obj.traverse((o) => {
    if (o.material) o.material = Array.isArray(o.material) ? o.material.map(cl) : cl(o.material);
  });
  return obj;
}

export function materialsOf(obj) {
  const out = [];
  obj.traverse((o) => {
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => out.includes(m) || out.push(m));
  });
  return out;
}

export function getTier(option = 'auto') {
  if (option !== 'auto' && TIERS[option]) return TIERS[option];
  return TIERS[TIER_CACHE || (TIER_CACHE = detectTier())];
}

/* ------------------------------------------------------------------ */
/* Stage: todo lo común a cualquier producto 3D                        */
/* ------------------------------------------------------------------ */

/**
 * Escenario 3D reutilizable: renderer, iluminación de estudio, cámara orbital,
 * calidad por dispositivo, resolución adaptativa y bucle que solo dibuja
 * cuando algo cambia. Las subclases implementan `_update(dt, now)` y llenan
 * `this.root`; deben fijar `this.frameH` (alto del objeto) y `this.frameW`
 * (medio ancho) para el encuadre automático.
 */
export class Stage {
  constructor(container, options = {}) {
    this.container = container;
    this.opts = Object.assign({ autoRotate: true, hint: 'Arrastra para girar', quality: 'auto', frameCenter: 0.46, autoRotateSpeed: 1.6 }, options);
    this.reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.q = getTier(this.opts.quality);
    this._time = 0;
    this._clock = new THREE.Clock();
    this._raf = 0;
    this._loop = this._loop.bind(this);
    this._kick = this._kick.bind(this);
    this._disposed = false;
    this._ready = false;
    this._dirty = true;
    this._idleFrames = 0;
    this._perf = { acc: 0, n: 0, renders: 0, good: 0 };
    this.frameH = 1.4;
    this.frameW = 1.55;

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const r = (this.renderer = new THREE.WebGLRenderer({ antialias: this.q.aa && dpr < 1.5, alpha: true, powerPreference: 'high-performance' }));
    this._maxDpr = Math.min(dpr, this.q.dpr);
    this._minDpr = Math.min(this._maxDpr, this.q.minDpr);
    this._dpr = this._maxDpr;
    r.setPixelRatio(this._dpr);
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.1;
    r.shadowMap.enabled = this.q.shadow > 0;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.shadowMap.autoUpdate = false; // solo se recalcula cuando algo se mueve
    r.setClearColor(0x000000, 0);
    const cv = r.domElement;
    Object.assign(cv.style, { display: 'block', width: '100%', height: '100%', outline: 'none', cursor: 'grab' });
    if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
    container.appendChild(cv);

    const scene = (this.scene = new THREE.Scene());
    scene.add(new THREE.HemisphereLight(0xfff1dc, 0x4a2e18, 0.25));
    const key = (this._key = new THREE.DirectionalLight(0xffe6c8, 1.7));
    key.position.set(-2.5, 7, 4);
    key.target.position.set(0, 0.8, 0);
    if (this.q.shadow > 0) {
      key.castShadow = true;
      key.shadow.mapSize.set(this.q.shadow, this.q.shadow);
      Object.assign(key.shadow.camera, { left: -2.6, right: 2.6, top: 2.6, bottom: -2.6, near: 1, far: 16 });
      key.shadow.bias = -0.0004;
      key.shadow.normalBias = 0.02;
      key.shadow.radius = 3;
    }
    scene.add(key, key.target);
    const rim = new THREE.DirectionalLight(0xffd9a8, 0.9);
    rim.position.set(4, 3, -5);
    scene.add(rim);

    if (this.q.shadow > 0) {
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.ShadowMaterial({ opacity: 0.2 }));
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      scene.add(ground);
    }
    const blob = (this._blob = new THREE.Mesh(
      new THREE.PlaneGeometry(3.4, 3.4),
      new THREE.MeshBasicMaterial({ map: tex('blob'), color: 0x2a1406, transparent: true, opacity: 0.6, depthWrite: false })
    ));
    blob.rotation.x = -Math.PI / 2;
    blob.position.y = 0.002;
    scene.add(blob);

    this.root = new THREE.Group();
    scene.add(this.root);

    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    this._dist = 6.5;
    const elev = 0.32, az = 0.55;
    this.camera.position.set(Math.sin(az) * Math.cos(elev) * this._dist, 0.9 + Math.sin(elev) * this._dist, Math.cos(az) * Math.cos(elev) * this._dist);
    const c = (this.controls = new OrbitControls(this.camera, cv));
    c.target.set(0, 0.9, 0);
    c.enableDamping = true;
    c.dampingFactor = 0.08;
    c.enablePan = false;
    c.enableZoom = false;
    c.rotateSpeed = 0.9;
    c.minPolarAngle = 0.25;
    c.maxPolarAngle = 1.62;
    c.autoRotate = this.opts.autoRotate && !this.reduced;
    c.autoRotateSpeed = this.opts.autoRotateSpeed;
    this._onStart = () => {
      c.autoRotate = false;
      clearTimeout(this._arT);
      this._hideHint();
      cv.style.cursor = 'grabbing';
      this._kick();
    };
    this._onEnd = () => {
      cv.style.cursor = this._hoverCursor ? 'pointer' : 'grab';
      if (this.opts.autoRotate && !this.reduced)
        this._arT = setTimeout(() => {
          c.autoRotate = true;
          this._kick();
        }, 2500);
    };
    this._onChange = () => {
      this._dirty = true;
      if (!this._inLoop) this._kick();
    };
    c.addEventListener('start', this._onStart);
    c.addEventListener('end', this._onEnd);
    c.addEventListener('change', this._onChange);

    if (this.opts.hint) {
      const h = (this._hint = document.createElement('div'));
      h.innerHTML = HINT_SVG + '<span></span>';
      h.lastChild.textContent = this.opts.hint;
      Object.assign(h.style, {
        position: 'absolute', left: '50%', bottom: '8px', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: '6px',
        padding: '4px 10px', borderRadius: '999px', background: 'rgba(28,18,10,0.6)', color: '#fff', fontFamily: 'inherit', fontSize: '11px',
        fontWeight: '600', lineHeight: '1.4', pointerEvents: 'none', transition: 'opacity .5s', opacity: '0', whiteSpace: 'nowrap',
      });
      container.appendChild(h);
      this._hintT = setTimeout(() => this._hint && !this._hintHidden && (this._hint.style.opacity = '1'), 1200);
    }

    this._ray = new THREE.Raycaster();
    this._ndc = new THREE.Vector2();
    this._down = null;
    this._onMove = (e) => !e.buttons && this._hover(e);
    this._onLeave = () => this._hover(null);
    this._onDown = (e) => (this._down = { x: e.clientX, y: e.clientY, t: performance.now() });
    this._onUp = (e) => {
      const d = this._down;
      this._down = null;
      if (!d || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6 || performance.now() - d.t > 450) return;
      this._tap(e);
    };
    cv.addEventListener('pointermove', this._onMove);
    cv.addEventListener('pointerleave', this._onLeave);
    cv.addEventListener('pointerdown', this._onDown);
    cv.addEventListener('pointerup', this._onUp);

    this._ro = new ResizeObserver(() => this._resize());
    this._ro.observe(container);
    this._visible = true;
    if ('IntersectionObserver' in window) {
      this._io = new IntersectionObserver(([en]) => {
        this._visible = en.isIntersecting;
        if (this._visible) this._kick();
      });
      this._io.observe(container);
    }
    this._onVis = () => !document.hidden && this._kick();
    document.addEventListener('visibilitychange', this._onVis);
    this._resize();
    this._warmup();
  }

  /* ---- hooks para subclases ---- */
  /** @returns {{active?: boolean, built?: boolean}} */
  _update() {
    return {};
  }
  _hover() {}
  _tap() {}

  /** Nivel de calidad elegido ('high' | 'medium' | 'low'). */
  get quality() {
    return this.q.name;
  }

  setAutoRotate(on) {
    this.opts.autoRotate = on;
    this.controls.autoRotate = on && !this.reduced;
    this._kick();
  }

  /** Raycast contra `this.root`: devuelve el primer objeto tocado. */
  _raycast(e) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this._ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this._ray.setFromCamera(this._ndc, this.camera);
    return this._ray.intersectObjects(this.root.children, true);
  }

  _setCursor(pointer) {
    this._hoverCursor = pointer;
    this.renderer.domElement.style.cursor = pointer ? 'pointer' : 'grab';
  }

  dispose() {
    if (this._disposed) return;
    this._disposed = true;
    cancelAnimationFrame(this._raf);
    clearTimeout(this._arT);
    clearTimeout(this._hintT);
    this._ro?.disconnect();
    this._io?.disconnect();
    document.removeEventListener('visibilitychange', this._onVis);
    const cv = this.renderer.domElement;
    cv.removeEventListener('pointermove', this._onMove);
    cv.removeEventListener('pointerleave', this._onLeave);
    cv.removeEventListener('pointerdown', this._onDown);
    cv.removeEventListener('pointerup', this._onUp);
    this.controls.removeEventListener('start', this._onStart);
    this.controls.removeEventListener('end', this._onEnd);
    this.controls.removeEventListener('change', this._onChange);
    this.controls.dispose();
    // Geometrías y texturas en caché se conservan para la próxima apertura;
    // al perder el contexto WebGL la GPU libera todo lo demás.
    this.scene.traverse((o) => {
      if (o.geometry && !o.geometry.userData.cached) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
    });
    cv.remove();
    const finish = () => {
      this._warmMats?.forEach((m) => m.dispose());
      this._envRT?.dispose();
      this.renderer.dispose();
      this.renderer.forceContextLoss();
    };
    // Si aún se están compilando shaders, se libera al terminar (three falla si se libera antes).
    if (this._compiling) this._compiling.then(finish, finish);
    else finish();
    this._hint?.remove();
  }

  /** Iluminación + compilación de shaders en paralelo, después de que el modal termine de abrirse. */
  async _warmup() {
    await new Promise((res) =>
      typeof requestIdleCallback === 'function' ? requestIdleCallback(() => res(), { timeout: 450 }) : setTimeout(res, 250)
    );
    if (this._disposed) return;
    this._envRT = studioEnvironment(this.renderer);
    this.scene.environment = this._envRT.texture;
    const g = new THREE.Group();
    const geo = new THREE.PlaneGeometry(0.01, 0.01);
    solidColor(geo, WHITE);
    const mats = (this._warmMats = []);
    for (const side of [THREE.FrontSide, THREE.DoubleSide, THREE.BackSide])
      for (const map of [null, 'crust']) mats.push(food({ side, map }));
    for (const m of mats) {
      const me = new THREE.Mesh(geo, m);
      me.castShadow = me.receiveShadow = true;
      g.add(me);
    }
    const inst = new THREE.InstancedMesh(geo, food({}), 1);
    inst.setColorAt(0, WHITE);
    inst.castShadow = true;
    mats.push(inst.material);
    g.add(inst);
    try {
      this._compiling = this.renderer.compileAsync(g, this.camera, this.scene);
      await Promise.race([this._compiling, new Promise((res) => setTimeout(res, 1500))]);
    } catch {
      /* sin compilación en paralelo: se compila al dibujar */
    }
    const done = () => {
      this._compiling = null;
      geo.dispose();
    };
    if (this._compiling) this._compiling.then(done, done);
    else geo.dispose();
    if (this._disposed) return;
    this._ready = true;
    this._shadowDirty = true;
    this._clock.getDelta();
    this._kick();
  }

  _resize() {
    const w = this.container.clientWidth || 1, h = this.container.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this._dirty = true;
    this._kick();
  }

  _kick() {
    this._idleFrames = 0;
    if (!this._disposed && !this._raf) {
      this._clock.getDelta();
      this._raf = requestAnimationFrame(this._loop);
    }
  }

  _hideHint() {
    if (this._hint && !this._hintHidden) {
      this._hintHidden = true;
      this._hint.style.opacity = '0';
    }
  }

  /** Resolución adaptativa: baja si el dispositivo no llega a ~45 FPS y sube si sobra. */
  _adapt(raw, rendered) {
    const P = this._perf;
    if (raw > 0.1) return;
    P.acc += raw;
    P.n++;
    if (rendered) P.renders++;
    if (P.acc < 1) return;
    const avg = P.acc / P.n;
    const continuous = P.renders >= P.n * 0.9;
    P.acc = P.n = P.renders = 0;
    if (!continuous) return;
    let next = this._dpr;
    if (avg > 1 / 45 && this._dpr > this._minDpr) {
      next = Math.max(this._minDpr, this._dpr - 0.25);
      P.good = 0;
    } else if (avg < 1 / 57 && this._dpr < this._maxDpr) {
      if (++P.good >= 4) {
        next = Math.min(this._maxDpr, this._dpr + 0.25);
        P.good = 0;
      }
    } else P.good = 0;
    if (next !== this._dpr) {
      this._dpr = next;
      this.renderer.setPixelRatio(next);
      this._resize();
    }
  }

  _loop() {
    this._raf = 0;
    if (this._disposed) return;
    if (!this._visible || (typeof document !== 'undefined' && document.hidden)) return; // se reanuda con _kick()
    const raw = this._clock.getDelta();
    if (!this._ready) {
      this._raf = requestAnimationFrame(this._loop);
      return;
    }
    const dt = Math.min(raw, 1 / 30);
    const now = (this._time += dt);
    const res = this._update(dt, now) || {};
    const active = !!res.active;
    const built = !!res.built;

    // Encuadre automático
    const H = this.frameH;
    const tanH = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const want = Math.max((H / 2 + 0.38) / tanH, this.frameW / (tanH * this.camera.aspect), 3.6);
    const k = Math.min(1, dt * 3);
    const c = this.controls;
    const ty = H * (this.frameCenter ?? this.opts.frameCenter);
    const fitting = Math.abs(want - this._dist) > 1e-3 || Math.abs(ty - c.target.y) > 1e-3;
    if (fitting) {
      this._dist += (want - this._dist) * k;
      const dy = (ty - c.target.y) * k;
      c.target.y += dy;
      this.camera.position.y += dy;
      const off = this.camera.position.clone().sub(c.target).setLength(this._dist);
      this.camera.position.copy(c.target).add(off);
    }
    this._inLoop = true;
    const changed = c.update(dt);
    this._inLoop = false;

    const render = active || built || fitting || changed || c.autoRotate || this._dirty;
    if (render) {
      if (active || built || this._shadowDirty) this.renderer.shadowMap.needsUpdate = true;
      this._shadowDirty = false;
      this.renderer.render(this.scene, this.camera);
      this._dirty = false;
      this._idleFrames = 0;
    } else {
      this._idleFrames++;
    }
    this._adapt(raw, render);

    // Si todo está quieto se dejan de pedir cuadros (cero consumo) hasta el próximo cambio.
    if (!this._raf && this._idleFrames < 30) this._raf = requestAnimationFrame(this._loop);
  }
}
