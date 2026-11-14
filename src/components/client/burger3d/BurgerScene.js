/**
 * BurgerScene — hamburguesa 3D procedural (Three.js) con ingredientes animados.
 *
 * Uso:
 *   const burger = new BurgerScene(divContenedor, { autoRotate: true });
 *   burger.setIngredients(['Queso Cheddar', 'Tocino', 'Salsa Mil Islas']);
 *   burger.dispose(); // al desmontar
 *
 * No necesita modelos externos: todo (pan, carne, queso, vegetales...) se genera con geometría.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { mergeVertices, mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/* ------------------------------------------------------------------ */
/* Utilidades matemáticas                                              */
/* ------------------------------------------------------------------ */

const V2 = (x, y) => new THREE.Vector2(x, y);
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const lerp = (a, b, t) => a + (b - a) * t;

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function strHash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function hash3(ix, iy, iz, seed) {
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

function vnoise(x, y, z, seed) {
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
function fbm(x, y, z, seed = 0, oct = 4) {
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

function spline(pts, n) {
  return new THREE.SplineCurve(pts.map((p) => V2(p[0], p[1]))).getPoints(n);
}

function flatLine(x0, x1, y, steps) {
  const out = [];
  for (let i = 0; i <= steps; i++) out.push(V2(lerp(x0, x1, i / steps), y));
  return out;
}

function joinProfiles(...parts) {
  const out = [];
  for (const p of parts)
    for (const v of p) {
      const last = out[out.length - 1];
      if (last && last.distanceTo(v) < 1e-5) continue;
      out.push(v);
    }
  return out;
}

/** Torno sin costura (vértices fusionados) para poder deformarlo suavemente. */
function latheGeo(points, segments = 128) {
  let g = new THREE.LatheGeometry(points, segments);
  g.deleteAttribute('uv');
  g.deleteAttribute('normal');
  g = mergeVertices(g, 1e-4);
  g.computeVertexNormals();
  return g;
}

function cleanMerge(g) {
  g.deleteAttribute('uv');
  g.deleteAttribute('normal');
  const m = mergeVertices(g, 1e-4);
  m.computeVertexNormals();
  g.dispose();
  return m;
}

const _v = new THREE.Vector3();
const _n = new THREE.Vector3();

/** Desplaza cada vértice a lo largo de su normal. */
function displace(g, fn) {
  const p = g.attributes.position, n = g.attributes.normal;
  for (let i = 0; i < p.count; i++) {
    _v.fromBufferAttribute(p, i);
    _n.fromBufferAttribute(n, i);
    const d = fn(_v, _n);
    p.setXYZ(i, _v.x + _n.x * d, _v.y + _n.y * d, _v.z + _n.z * d);
  }
  g.computeVertexNormals();
}

/** Asigna colores por vértice. fn(pos, normal, colorOut). */
function paint(g, fn) {
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

function solidColor(g, color) {
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = color.r;
    arr[i * 3 + 1] = color.g;
    arr[i * 3 + 2] = color.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
}

const phys = (p) => new THREE.MeshPhysicalMaterial(p);
const col = (hex) => new THREE.Color(hex);

function mesh(geo, mat) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/* ------------------------------------------------------------------ */
/* Texturas procedurales (canvas)                                      */
/* ------------------------------------------------------------------ */

function canvasTex(size, draw, srgb = true) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  draw(g, size);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

const TEXTURES = {
  crumb: () =>
    canvasTex(512, (g, s) => {
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
      grd.addColorStop(0.75, 'rgba(170,95,25,0.18)');
      grd.addColorStop(1, 'rgba(140,70,15,0.55)');
      g.fillStyle = grd;
      g.fillRect(0, 0, s, s);
    }),
  tomato: () =>
    canvasTex(512, (g, s) => {
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
    }),
  pickle: () =>
    canvasTex(256, (g, s) => {
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
    }),
  blob: () =>
    canvasTex(
      256,
      (g, s) => {
        const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
        grd.addColorStop(0, 'rgba(0,0,0,0.85)');
        grd.addColorStop(0.45, 'rgba(0,0,0,0.45)');
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = grd;
        g.fillRect(0, 0, s, s);
      },
      false
    ),
};

/* ------------------------------------------------------------------ */
/* Constructores de cada capa (cada uno con base en y = 0)             */
/* ------------------------------------------------------------------ */

function buildBunTop(ctx) {
  const s = ctx.seed;
  const side = spline(
    [[0.98, 0], [1.07, 0.035], [1.12, 0.13], [1.125, 0.24], [1.07, 0.38], [0.95, 0.5], [0.77, 0.6], [0.53, 0.67], [0.27, 0.71], [0, 0.72]],
    80
  );
  const g = latheGeo(joinProfiles(flatLine(0, 0.98, 0, 14), side), 160);
  const disp = (v) =>
    smooth(0.02, 0.15, v.y) * (fbm(v.x * 1.8, v.y * 1.8, v.z * 1.8, s, 3) * 0.05 + fbm(v.x * 9, v.y * 9, v.z * 9, s + 5, 2) * 0.005);
  displace(g, disp);
  const crumb = col('#efd29c'), pale = col('#e2b06a'), gold = col('#c97a28'), dark = col('#7f3409');
  paint(g, (v, n, c) => {
    if (v.y < 0.015 && n.y < -0.6) {
      c.copy(crumb);
      return;
    }
    c.copy(pale).lerp(gold, smooth(0.0, 0.2, v.y)).lerp(dark, smooth(0.2, 0.68, v.y) * 0.85);
    c.multiplyScalar(0.88 + fbm(v.x * 3, v.y * 3, v.z * 3, s + 3, 3) * 0.3);
  });
  const group = new THREE.Group();
  group.add(
    mesh(
      g,
      phys({
        vertexColors: true,
        roughness: 0.5,
        clearcoat: 0.35,
        clearcoatRoughness: 0.45,
        envMapIntensity: 0.6,
        sheen: 0.35,
        sheenRoughness: 0.6,
        sheenColor: col('#ffd79a'),
      })
    )
  );

  // Ajonjolí
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
  const N = 70;
  const seedGeo = new THREE.SphereGeometry(1, 12, 8);
  const seedMat = phys({ roughness: 0.45, clearcoat: 0.3 });
  const seeds = new THREE.InstancedMesh(seedGeo, seedMat, N);
  seeds.castShadow = true;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), q2 = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0), nrm = new THREE.Vector3(), pos = new THREE.Vector3(), sc = new THREE.Vector3();
  const cA = col('#f8eecd'), cB = col('#e2bf78'), cc = new THREE.Color();
  for (let i = 0; i < N; i++) {
    const r = 0.86 * Math.sqrt(ctx.rand()), th = ctx.rand() * Math.PI * 2;
    const h = heightAt(r);
    nrm.set(-h.slope * Math.cos(th), 1, -h.slope * Math.sin(th)).normalize();
    pos.set(r * Math.cos(th), h.y, r * Math.sin(th));
    pos.addScaledVector(nrm, disp(pos) + 0.004);
    q.setFromUnitVectors(up, nrm);
    q2.setFromAxisAngle(nrm, ctx.rand() * Math.PI * 2);
    q.premultiply(q2);
    sc.set(0.036, 0.012, 0.019);
    m4.compose(pos, q, sc);
    seeds.setMatrixAt(i, m4);
    seeds.setColorAt(i, cc.copy(cA).lerp(cB, ctx.rand()));
  }
  group.add(seeds);
  return group;
}

function buildBunBottom(ctx) {
  const s = ctx.seed;
  const side = spline([[0.93, 0], [1.03, 0.025], [1.09, 0.1], [1.105, 0.2], [1.08, 0.3], [1.0, 0.36]], 50);
  const g = latheGeo(joinProfiles(flatLine(0, 0.93, 0, 14), side, flatLine(1.0, 0, 0.36, 14)), 160);
  displace(g, (v) => smooth(0.85, 1.0, Math.hypot(v.x, v.z)) * fbm(v.x * 2, v.y * 2, v.z * 2, s, 3) * 0.03);
  const toast = col('#a5561a'), pale = col('#e0ae68'), gold = col('#c97c2e'), crumb = col('#e8c487');
  paint(g, (v, n, c) => {
    if (n.y > 0.6 && v.y > 0.3) c.copy(crumb);
    else if (n.y < -0.6) c.copy(toast);
    else c.copy(gold).lerp(pale, smooth(0.04, 0.24, v.y));
    c.multiplyScalar(0.9 + fbm(v.x * 3, v.y * 3, v.z * 3, s + 2, 3) * 0.25);
  });
  const group = new THREE.Group();
  group.add(mesh(g, phys({ vertexColors: true, roughness: 0.55, clearcoat: 0.25, clearcoatRoughness: 0.5, envMapIntensity: 0.6, sheen: 0.3, sheenColor: col('#ffd79a') })));
  const disk = new THREE.CircleGeometry(0.995, 96);
  disk.rotateX(-Math.PI / 2);
  const crumbMesh = mesh(disk, new THREE.MeshStandardMaterial({ map: ctx.tex('crumb'), roughness: 0.92 }));
  crumbMesh.position.y = 0.3615;
  group.add(crumbMesh);
  return group;
}

function pattyLike(ctx, { radius = 1.15, height = 0.3, amp = 1, colors, rough = 0.55, coat = 0.35, chicken = false }) {
  const s = ctx.seed;
  const R = radius, H = height;
  const side = spline(
    [[R * 0.83, 0], [R * 0.93, H * 0.08], [R * 0.985, H * 0.3], [R, H * 0.5], [R * 0.98, H * 0.73], [R * 0.93, H * 0.92], [R * 0.85, H]],
    50
  );
  const g = latheGeo(joinProfiles(flatLine(0, R * 0.83, 0, 24), side, flatLine(R * 0.85, 0, H, 24)), 170);
  const dfn = chicken
    ? (v) => fbm(v.x * 3, v.y * 3, v.z * 3, s, 3) * 0.05 * amp + fbm(v.x * 11, v.y * 11, v.z * 11, s + 4, 3) * 0.035 * amp + fbm(v.x * 26, v.y * 26, v.z * 26, s + 8, 2) * 0.01
    : (v) => fbm(v.x * 2.2, v.y * 2.2, v.z * 2.2, s, 3) * 0.035 * amp + fbm(v.x * 9, v.y * 9, v.z * 9, s + 4, 3) * 0.02 * amp + fbm(v.x * 24, v.y * 24, v.z * 24, s + 8, 2) * 0.007;
  displace(g, (v, n) => dfn(v) * (Math.abs(n.y) > 0.8 ? (chicken ? 0.3 : 0.55) : 1));
  const [a, b, charC] = colors.map(col);
  paint(g, (v, n, c) => {
    const k = smooth(-0.35, 0.4, fbm(v.x * 4, v.y * 4, v.z * 4, s + 2, 3));
    c.copy(a).lerp(b, k);
    const ch = smooth(0.1, 0.45, fbm(v.x * 10, v.y * 10, v.z * 10, s + 6, 2));
    c.lerp(charC, ch * (chicken ? 0.5 : 0.75));
    if (Math.abs(n.y) > 0.7) c.multiplyScalar(chicken ? 0.95 : 0.82);
  });
  return mesh(g, phys({ vertexColors: true, roughness: rough, clearcoat: coat, clearcoatRoughness: 0.45 }));
}

function buildPatty(ctx) {
  return pattyLike(ctx, { colors: ['#6a3a20', '#3d1f10', '#170a04'] });
}

function buildChicken(ctx) {
  const m = pattyLike(ctx, {
    radius: 1.13,
    height: 0.34,
    amp: 1.2,
    colors: ['#e2a24a', '#b86f26', '#7a3d12'],
    rough: 0.78,
    coat: 0.05,
    chicken: true,
  });
  m.scale.set(1.1, 1, 0.92);
  m.rotation.y = ctx.rand() * Math.PI;
  return m;
}

function buildCheese(ctx, variant) {
  const s = ctx.seed;
  const g = new THREE.BoxGeometry(2.05, 0.03, 2.05, 70, 1, 70);
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
  const m = mesh(
    g,
    phys({
      color: col(white ? '#f0d48a' : '#f08c00'),
      roughness: white ? 0.5 : 0.38,
      clearcoat: 0.3,
      clearcoatRoughness: 0.4,
      envMapIntensity: 0.55,
      sheen: white ? 0 : 0.25,
      sheenColor: col(white ? '#ffffff' : '#ffd36a'),
    })
  );
  m.rotation.y = Math.PI / 4 + (ctx.rand() - 0.5) * 0.6;
  return m;
}

function leafGeo(ctx, radius, seedOff, colors, ruffleAmp = 0.065, freq = 13) {
  const s = ctx.seed + seedOff;
  const g = new THREE.RingGeometry(0.0, 1, 200, 16);
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
  const mat = phys({ vertexColors: true, roughness: 0.5, clearcoat: 0.25, sheen: 0.6, sheenColor: col('#e4ffc0'), side: THREE.DoubleSide });
  const a = mesh(leafGeo(ctx, 1.24, 0, ['#4f8f2a', '#9fd35c']), mat);
  a.position.y = 0.012;
  const b = mesh(leafGeo(ctx, 1.16, 50, ['#5a9a30', '#b2e06e']), mat);
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
  const mat = phys({ vertexColors: true, roughness: 0.4, clearcoat: 0.4, side: THREE.DoubleSide });
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
  const capMat = phys({ map: ctx.tex('tomato'), roughness: 0.22, clearcoat: 0.8, clearcoatRoughness: 0.15 });
  const sideMat = phys({ color: col('#b81d10'), roughness: 0.3, clearcoat: 0.7 });
  const spots = [[-0.42, 0.0, 0.12], [0.43, 0.012, -0.14]];
  spots.forEach(([x, y, z], i) => {
    const g = new THREE.CylinderGeometry(0.64, 0.64, 0.075, 64, 1);
    const m = mesh(g, [sideMat, capMat, capMat]);
    m.position.set(x, 0.04 + y, z);
    m.rotation.set((ctx.rand() - 0.5) * 0.06, ctx.rand() * Math.PI * 2, (i ? -1 : 1) * 0.04);
    group.add(m);
  });
  return group;
}

function buildPickles(ctx) {
  const group = new THREE.Group();
  const capMat = phys({ map: ctx.tex('pickle'), roughness: 0.25, clearcoat: 0.9, clearcoatRoughness: 0.2 });
  const sideMat = phys({ color: col('#2f4a14'), roughness: 0.35, clearcoat: 0.8 });
  const placed = [];
  let tries = 0;
  while (placed.length < 7 && tries++ < 300) {
    const r = placed.length < 5 ? lerp(0.82, 0.98, ctx.rand()) : Math.sqrt(ctx.rand()) * 0.5, th = ctx.rand() * Math.PI * 2;
    const x = Math.cos(th) * r, z = Math.sin(th) * r;
    if (placed.some(([px, pz]) => Math.hypot(px - x, pz - z) < 0.42)) continue;
    placed.push([x, z]);
  }
  placed.forEach(([x, z], i) => {
    const g = new THREE.CylinderGeometry(0.25, 0.25, 0.032, 64, 1);
    const p = g.attributes.position;
    for (let k = 0; k < p.count; k++) {
      const px = p.getX(k), pz = p.getZ(k);
      const rr = Math.hypot(px, pz);
      if (rr > 0.2) {
        const f = 1 + 0.045 * Math.sin(Math.atan2(pz, px) * 16);
        p.setX(k, px * f);
        p.setZ(k, pz * f);
      }
    }
    g.computeVertexNormals();
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
  for (let k = 0; k < count; k++) {
    const a = lerp(arc[0], arc[1], ctx.rand());
    const R = lerp(rad[0], rad[1], ctx.rand());
    const t = tube * (0.75 + ctx.rand() * 0.5);
    const tg = new THREE.TorusGeometry(R, t, 6, Math.max(8, Math.round(a * 10)), a);
    tg.deleteAttribute('uv');
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
    mat: phys({ vertexColors: true, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.15 }),
  });
}

function buildOnionGrilled(ctx) {
  return arcsLayer(ctx, {
    count: 28, rad: [0.18, 0.34], tube: 0.03, arc: [1.6, 3.6], spread: 1.0, edge: 0.6,
    colors: ['#e6c58c', '#a8702e'],
    mat: phys({ vertexColors: true, roughness: 0.35, clearcoat: 0.8 }),
  });
}

function buildOnionRaw(ctx) {
  return arcsLayer(ctx, {
    count: 14, rad: [0.25, 0.42], tube: 0.022, arc: [4.5, 6.28], spread: 0.85, edge: 0.5,
    colors: ['#f6f0f2', '#d9c2dc'],
    mat: phys({ vertexColors: true, roughness: 0.25, clearcoat: 0.6, transmission: 0.15, thickness: 0.05 }),
  });
}

function buildOnionCrispy(ctx) {
  return arcsLayer(ctx, {
    count: 70, rad: [0.06, 0.16], tube: 0.018, arc: [1.2, 3], spread: 1.1, edge: 0.6,
    colors: ['#c7802c', '#e9b357'],
    mat: phys({ vertexColors: true, roughness: 0.7 }),
  });
}

function buildOnionRings(ctx) {
  const s = ctx.seed;
  const group = new THREE.Group();
  const mat = phys({ vertexColors: true, roughness: 0.75, clearcoat: 0.15 });
  const base = ctx.rand() * Math.PI * 2;
  for (let i = 0; i < 3; i++) {
    const g = cleanMerge(new THREE.TorusGeometry(0.34, 0.095, 20, 64));
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
  const mat = phys({ vertexColors: true, roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.3 });
  const fat = col('#e3a887'), fatCrisp = col('#c07a48'), meat = col('#8a2414'), meatDark = col('#561307');
  const _c1 = new THREE.Color(), _c2 = new THREE.Color();
  const yaw = ctx.rand() * Math.PI;
  for (let k = 0; k < 3; k++) {
    const g = new THREE.BoxGeometry(2.3, 0.024, 0.34, 120, 1, 28);
    const ph = ctx.rand() * 6.28, ph2 = ctx.rand() * 6.28;
    paint(g, (v, n, c) => {
      const t = v.z / 0.34 + 0.5;
      const band = Math.sin(t * Math.PI * 3.2 + ph + fbm(v.x * 2, 0, k, s, 2) * 2.5);
      const crisp = smooth(-0.2, 0.6, fbm(v.x * 3, k, v.z * 3, s + 5, 3));
      const meatC = _c1.copy(meat).lerp(meatDark, crisp * 0.8);
      const fatC = _c2.copy(fat).lerp(fatCrisp, crisp);
      c.copy(meatC).lerp(fatC, smooth(0.25, 0.75, band));
    });
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const ax = Math.abs(x);
      const droop = ax > 1.0 ? Math.pow(ax - 1.0, 2) * 0.6 : 0;
      p.setXYZ(i, x, y + Math.sin(x * 4.5 + ph) * 0.04 + Math.sin(x * 11 + ph2) * 0.01 + Math.sin(z * 9 + x) * 0.006 - droop, z + Math.sin(x * 3 + ph) * 0.035);
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
  const g = new THREE.RingGeometry(0, 1, 180, 12);
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
    phys({ color: col(SAUCE_COLORS[variant] || SAUCE_COLORS.default), roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 0.5, side: THREE.DoubleSide })
  );
}

function buildEgg(ctx) {
  const s = ctx.seed;
  const group = new THREE.Group();
  const g = new THREE.RingGeometry(0, 1, 160, 14);
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
  group.add(mesh(g, phys({ vertexColors: true, roughness: 0.35, clearcoat: 0.6, side: THREE.DoubleSide })));
  const yolk = mesh(new THREE.SphereGeometry(0.3, 40, 24), phys({ color: col('#ffa70f'), roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05 }));
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
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.025, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2, curveSegments: 24 });
  geo.rotateX(-Math.PI / 2);
  const mats = [phys({ color: col('#a37b56'), roughness: 0.4, clearcoat: 0.7 }), phys({ color: col('#4a2c18'), roughness: 0.4, clearcoat: 0.6 })];
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
  for (let k = 0; k < count; k++) {
    const L = lerp(len[0], len[1], ctx.rand());
    const bg = new THREE.BoxGeometry(L, h, w);
    bg.deleteAttribute('uv');
    let pick = ctx.rand(), chosen = palette[0][0];
    for (const [hex, wgt] of palette) {
      if (pick < wgt) { chosen = hex; break; }
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
  merged.computeVertexNormals();
  return mesh(merged, mat);
}

function buildColeslaw(ctx) {
  return sticksLayer(ctx, {
    count: 300, len: [0.18, 0.38], w: 0.026, h: 0.012, spread: 1.12, mound: 0.08,
    palette: [['#eef2d6', 0.45], ['#d9e6ad', 0.25], ['#f6f1df', 0.12], ['#7d2458', 0.12], ['#e58a3a', 0.06]],
    mat: phys({ vertexColors: true, roughness: 0.3, clearcoat: 0.8 }),
  });
}

function buildPotatoSticks(ctx) {
  return sticksLayer(ctx, {
    count: 320, len: [0.14, 0.3], w: 0.024, h: 0.024, spread: 1.1, mound: 0.1,
    palette: [['#f0c45c', 0.5], ['#e2a53e', 0.3], ['#f7d985', 0.2]],
    mat: phys({ vertexColors: true, roughness: 0.6 }),
  });
}

function buildCorn(ctx) {
  return sticksLayer(ctx, {
    count: 170, len: [0.045, 0.06], w: 0.05, h: 0.04, spread: 1.05, mound: 0.05,
    palette: [['#f6c23a', 0.6], ['#f2b01e', 0.4]],
    mat: phys({ vertexColors: true, roughness: 0.3, clearcoat: 0.7 }),
  });
}

function buildOlives(ctx) {
  return arcsLayer(ctx, {
    count: 12, rad: [0.07, 0.09], tube: 0.04, arc: [6.28, 6.28], spread: 1.0, edge: 0.6,
    colors: ['#1d1a1c', '#3a2f35'],
    mat: phys({ vertexColors: true, roughness: 0.2, clearcoat: 1 }),
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
  corn: { order: 62, h: 0.06, build: buildCorn },
  olives: { order: 63, h: 0.07, build: buildOlives },
  bacon: { order: 40, h: 0.065, build: buildBacon },
  mushroom: { order: 44, h: 0.05, build: buildMushroom },
  onionRings: { order: 50, h: 0.2, build: buildOnionRings },
  onionGrilled: { order: 52, h: 0.06, build: buildOnionGrilled },
  onionRaw: { order: 53, h: 0.05, build: buildOnionRaw },
  onionCaramelized: { order: 54, h: 0.06, build: buildOnionCaramelized },
  onionCrispy: { order: 55, h: 0.07, build: buildOnionCrispy },
  pickles: { order: 60, h: 0.045, build: buildPickles },
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
/* Escena                                                              */
/* ------------------------------------------------------------------ */

function spring(s, target, k, c, dt) {
  s.v += (-k * (s.x - target) - c * s.v) * dt;
  s.x += s.v * dt;
}
const sp = (x) => ({ x, v: 0 });

const HINT_SVG =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex:none"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/></svg>';

export class BurgerScene {
  /**
   * @param {HTMLElement} container
   * @param {object} [options]
   */
  constructor(container, options = {}) {
    this.container = container;
    this.opts = Object.assign(
      { autoRotate: true, autoPatty: true, intro: true, hint: 'Arrastra para girar', onLayerClick: null, classify: null, maxPixelRatio: 2 },
      options
    );
    this.reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    this._time = 0;
    this._clock = new THREE.Clock();
    this._raf = 0;
    this._loop = this._loop.bind(this);
    this._texCache = {};
    this.layers = [];
    this.gap = { x: 0, v: 0, target: 0, y: Infinity, closeAt: 0 };
    this.squash = sp(1);
    this._squashAt = -1;
    this._disposed = false;

    // Renderer
    const r = (this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' }));
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.opts.maxPixelRatio));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.0;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.setClearColor(0x000000, 0);
    const cv = r.domElement;
    Object.assign(cv.style, { display: 'block', width: '100%', height: '100%', outline: 'none', cursor: 'grab' });
    if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
    container.appendChild(cv);

    // Escena + iluminación
    const scene = (this.scene = new THREE.Scene());
    const pmrem = new THREE.PMREMGenerator(r);
    this._envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    pmrem.dispose();
    scene.environment = this._envRT.texture;

    scene.add(new THREE.HemisphereLight(0xfff1dc, 0x5a3a20, 0.5));
    const key = new THREE.DirectionalLight(0xffe4c2, 2.2);
    key.position.set(3, 7, 4);
    key.target.position.set(0, 0.8, 0);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -2.6, right: 2.6, top: 2.6, bottom: -2.6, near: 1, far: 20 });
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
    scene.add(key, key.target);
    const rim = new THREE.DirectionalLight(0xcfe0ff, 1.3);
    rim.position.set(-4, 3, -5);
    scene.add(rim);

    // Suelo: solo sombras (fondo transparente)
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.ShadowMaterial({ opacity: 0.22 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    const blob = new THREE.Mesh(
      new THREE.PlaneGeometry(3.4, 3.4),
      new THREE.MeshBasicMaterial({ map: this._tex('blob'), color: 0x2a1406, transparent: true, opacity: 0.55, depthWrite: false })
    );
    blob.rotation.x = -Math.PI / 2;
    blob.position.y = 0.002;
    scene.add(blob);
    this._blob = blob;

    this.stack = new THREE.Group();
    scene.add(this.stack);

    // Cámara + controles
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
    c.autoRotateSpeed = 1.6;
    this._onStart = () => {
      c.autoRotate = false;
      clearTimeout(this._arT);
      this._hideHint();
      cv.style.cursor = 'grabbing';
    };
    this._onEnd = () => {
      cv.style.cursor = this._hovered ? 'pointer' : 'grab';
      if (this.opts.autoRotate && !this.reduced) this._arT = setTimeout(() => (c.autoRotate = true), 2500);
    };
    c.addEventListener('start', this._onStart);
    c.addEventListener('end', this._onEnd);

    // Hint
    if (this.opts.hint) {
      const h = (this._hint = document.createElement('div'));
      h.innerHTML = HINT_SVG + '<span>' + this.opts.hint + '</span>';
      Object.assign(h.style, {
        position: 'absolute', left: '50%', bottom: '8px', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: '6px',
        padding: '4px 10px', borderRadius: '999px', background: 'rgba(28,18,10,0.6)', color: '#fff', fontFamily: 'inherit', fontSize: '11px', fontWeight: '600', lineHeight: '1.4',
        pointerEvents: 'none', transition: 'opacity .5s', opacity: '0', whiteSpace: 'nowrap', backdropFilter: 'blur(4px)',
      });
      container.appendChild(h);
      setTimeout(() => this._hint && !this._hintHidden && (this._hint.style.opacity = '1'), 900);
    }

    // Raycast (hover + click)
    this._ray = new THREE.Raycaster();
    this._ndc = new THREE.Vector2();
    this._down = null;
    this._onMove = (e) => {
      if (!this.opts.onLayerClick || e.buttons) return;
      const L = this._pick(e);
      const hov = L && L.removable ? L : null;
      if (hov !== this._hovered) {
        this._hovered = hov;
        cv.style.cursor = hov ? 'pointer' : 'grab';
      }
    };
    this._onLeave = () => {
      this._hovered = null;
    };
    this._onDown = (e) => (this._down = { x: e.clientX, y: e.clientY, t: performance.now() });
    this._onUp = (e) => {
      const d = this._down;
      this._down = null;
      if (!d || !this.opts.onLayerClick) return;
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6 || performance.now() - d.t > 450) return;
      const L = this._pick(e);
      if (L && L.removable && L.label) this.opts.onLayerClick(L.label, L.kind);
    };
    cv.addEventListener('pointermove', this._onMove);
    cv.addEventListener('pointerleave', this._onLeave);
    cv.addEventListener('pointerdown', this._onDown);
    cv.addEventListener('pointerup', this._onUp);

    // Tamaño + visibilidad
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
    this._resize();

    this._kick();
  }

  /* ---------------- API pública ---------------- */

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
      if (animate) {
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
        gapY = Math.min(gapY, L.baseY + L.height * 0.5);
        gapAmt = Math.max(gapAmt, 0.45);
        this._enterLayer(L, now);
      } else this._place(L);
    });

    this.layers = [...order, ...this.layers.filter((l) => l.leaving)];
    this._sweepDead();

    if (gapY < Infinity) {
      this.gap.y = Math.min(this.gap.target > 0 ? this.gap.y : Infinity, gapY);
      this.gap.target = Math.max(this.gap.target, gapAmt);
      this.gap.closeAt = now + 0.42;
      this._squashAt = now + 0.62;
    }
    this._kick();
  }

  /** Activa/desactiva la rotación automática. */
  setAutoRotate(on) {
    this.opts.autoRotate = on;
    this.controls.autoRotate = on && !this.reduced;
  }

  dispose() {
    if (this._disposed) return;
    this._disposed = true;
    cancelAnimationFrame(this._raf);
    clearTimeout(this._arT);
    clearTimeout(this._idleT);
    this._ro?.disconnect();
    this._io?.disconnect();
    const cv = this.renderer.domElement;
    cv.removeEventListener('pointermove', this._onMove);
    cv.removeEventListener('pointerleave', this._onLeave);
    cv.removeEventListener('pointerdown', this._onDown);
    cv.removeEventListener('pointerup', this._onUp);
    this.controls.removeEventListener('start', this._onStart);
    this.controls.removeEventListener('end', this._onEnd);
    this.controls.dispose();
    this.scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
    });
    Object.values(this._texCache).forEach((t) => t.dispose());
    this._envRT.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    cv.remove();
    this._hint?.remove();
  }

  /* ---------------- Internos ---------------- */

  _tex(name) {
    return this._texCache[name] || (this._texCache[name] = TEXTURES[name]());
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
    const seed = strHash(d.id);
    const ctx = { seed: seed % 10000, rand: mulberry32(seed), tex: (n) => this._tex(n) };
    const obj = KINDS[d.kind].build(ctx, d.variant);
    const root = new THREE.Group();
    root.add(obj);
    const mats = [];
    root.traverse((o) => {
      o.userData.layerId = d.id;
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => mats.includes(m) || mats.push(m));
    });
    root.userData.layerId = d.id;
    this.stack.add(root);
    return {
      id: d.id, kind: d.kind, label: d.label, removable: d.removable, height: KINDS[d.kind].h,
      root, mats, baseY: 0, opacity: -1,
      px: sp(0), py: sp(0), pz: sp(0), ry: sp(0), tilt: sp(0), sc: sp(1),
      t0: 0, fade: 0.25, leaving: false, kY: 200, cY: 22, kXZ: 90, cXZ: 16,
      axis: new THREE.Vector3(1, 0, 0),
    };
  }

  _screenRight() {
    const r = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0);
    r.y = 0;
    return r.lengthSq() < 1e-6 ? r.set(1, 0, 0) : r.normalize();
  }

  _place(L) {
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

  _enterLayer(L, now) {
    const right = this._screenRight();
    const dist = 3.6;
    L.px.x = right.x * dist;
    L.pz.x = right.z * dist;
    L.py.x = L.baseY + 0.35;
    L.ry.x = 1.6;
    L.tilt.x = -0.45;
    L.axis.set(-right.z, 0, right.x);
    L.t0 = now + 0.1;
    L.fade = 0.22;
  }

  _beginLeave(L) {
    const right = this._screenRight();
    L.leaving = true;
    L.t0 = this._time;
    L.out = { x: -right.x * 3.8, z: -right.z * 3.8 };
    L.axis.set(-right.z, 0, right.x);
    L.kY = 120;
  }

  _sweepDead() {
    this.layers = this.layers.filter((L) => {
      if (!L.dead) return true;
      this.stack.remove(L.root);
      L.root.traverse((o) => o.geometry && o.geometry.dispose());
      L.mats.forEach((m) => m.dispose());
      if (this._hovered === L) this._hovered = null;
      return false;
    });
  }

  _setOpacity(L, o) {
    o = clamp01(o);
    if (Math.abs(o - L.opacity) < 1e-3) return;
    const transparent = o < 0.999;
    for (const m of L.mats) {
      if (m.transparent !== transparent) {
        m.transparent = transparent;
        m.needsUpdate = true;
      }
      m.opacity = o;
    }
    L.opacity = o;
  }

  _pick(e) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this._ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this._ray.setFromCamera(this._ndc, this.camera);
    const hits = this._ray.intersectObjects(this.stack.children, true);
    for (const h of hits) {
      const L = this.layers.find((l) => l.id === h.object.userData.layerId);
      if (L && !L.leaving) return L;
    }
    return null;
  }

  _resize() {
    const w = this.container.clientWidth || 1, h = this.container.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this._kick();
  }

  _kick() {
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

  _loop() {
    this._raf = 0;
    if (this._disposed) return;
    if (!this._visible || (typeof document !== 'undefined' && document.hidden)) {
      // Se reanuda con _kick() al volver a ser visible; revisa periódicamente la pestaña oculta.
      this._idleT = setTimeout(() => this._kick(), 500);
      return;
    }
    this._raf = requestAnimationFrame(this._loop);
    const dt = Math.min(this._clock.getDelta(), 1 / 30);
    const now = (this._time += dt);

    // Hueco (la tapa "se abre" para dejar entrar / salir el ingrediente)
    const g = this.gap;
    if (g.target > 0 && now >= g.closeAt) g.target = 0;
    spring(g, g.target, 170, 17, dt);
    if (g.target === 0 && Math.abs(g.x) < 0.002 && Math.abs(g.v) < 0.01) {
      g.x = 0;
      g.y = Infinity;
    }
    if (this._squashAt > 0 && now >= this._squashAt) {
      this.squash.v -= 1.5;
      this._squashAt = -1;
    }
    spring(this.squash, 1, 260, 14, dt);
    const sq = this.squash.x;
    const bulge = 1 + (1 - sq) * 0.55;
    this.stack.scale.set(bulge, sq, bulge);

    let topY = 0;
    for (const L of this.layers) {
      if (now < L.t0) {
        L.root.visible = false;
        continue;
      }
      L.root.visible = true;
      let tx = 0, tz = 0, ty = L.baseY + (L.baseY >= g.y ? g.x : 0), tr = 0, tt = 0;
      if (L.leaving) {
        tx = L.out.x;
        tz = L.out.z;
        ty = L.baseY + 0.2;
        tr = -1.4;
        tt = 0.45;
      }
      spring(L.py, ty, L.kY, L.cY, dt);
      spring(L.px, tx, L.kXZ, L.cXZ, dt);
      spring(L.pz, tz, L.kXZ, L.cXZ, dt);
      spring(L.ry, tr, 70, 13, dt);
      spring(L.tilt, tt, 110, 14, dt);
      spring(L.sc, this._hovered === L ? 1.045 : 1, 300, 20, dt);
      L.root.position.set(L.px.x, L.py.x, L.pz.x);
      L.root.quaternion.setFromAxisAngle(L.axis, L.tilt.x);
      L.root.rotateY(L.ry.x);
      L.root.scale.setScalar(L.sc.x);
      const life = now - L.t0;
      if (L.leaving) {
        this._setOpacity(L, 1 - (life - 0.08) / 0.32);
        if (life > 0.75) L.dead = true;
      } else {
        this._setOpacity(L, life / L.fade);
        topY = Math.max(topY, L.baseY + L.height);
      }
    }
    if (this.layers.some((l) => l.dead)) this._sweepDead();

    // Encuadre automático según la altura de la hamburguesa
    const H = Math.max(topY, this.totalH || 1.4) + g.x;
    const tanH = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const dV = (H / 2 + 0.38) / tanH;
    const dH = 1.55 / (tanH * this.camera.aspect);
    const want = Math.max(dV, dH, 3.6);
    const k = Math.min(1, dt * 3);
    this._dist += (want - this._dist) * k;
    const c = this.controls;
    const ty = H * 0.46;
    const dy = (ty - c.target.y) * k;
    c.target.y += dy;
    this.camera.position.y += dy;
    const off = this.camera.position.clone().sub(c.target).setLength(this._dist);
    this.camera.position.copy(c.target).add(off);
    c.update(dt);

    this.renderer.render(this.scene, this.camera);
  }
}

export default BurgerScene;
