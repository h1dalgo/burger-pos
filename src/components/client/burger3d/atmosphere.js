/**
 * Ambiente de cocina compartido (hamburguesa, pizza): vapor que sube de la
 * comida recién hecha y unas pocas brasas flotando detrás del plato.
 *
 * Son puntos (un solo dibujo por grupo) movidos en la CPU: unas decenas de
 * números por cuadro, sin luces ni sombras extra. El vapor solo en equipos
 * medios y altos; las brasas solo en altos.
 */
import { THREE, tex } from './core.js';

function points(scene, n, color, size, opacity) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  const mat = new THREE.PointsMaterial({
    size, map: tex('pool'), color, vertexColors: true, transparent: true, opacity,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, toneMapped: false,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.renderOrder = 10;
  scene.add(pts);
  return { pts, geo, n, parts: Array.from({ length: n }, () => ({ life: 0, age: Math.random() * 3, x: 0, y: 0, z: 0, vy: 0, ph: Math.random() * 6.28 })) };
}

export class Atmosphere {
  /**
   * @param {THREE.Scene} scene
   * @param {{ name: string }} q calidad del equipo
   * @param {{ steamCount?: number, emberRing?: [number, number] }} [o]
   */
  constructor(scene, q, o = {}) {
    this.on = 0;
    this.emberRing = o.emberRing ?? [1.2, 1.9];
    this.steam = points(scene, o.steamCount ?? (q.name === 'high' ? 16 : 10), 0xfff3e6, 1.5, 0.55);
    this.embers = q.name === 'high' ? points(scene, 10, 0xff9a3c, 0.12, 1) : null;
  }

  /**
   * Avanza el ambiente. Devuelve true si hay algo que dibujar.
   * @param {number} dt
   * @param {boolean} settled la comida ya está armada (el vapor aparece después)
   * @param {{ top: number, spread?: number }} p altura de donde sale el vapor y radio
   */
  update(dt, settled, { top, spread = 0.45 }) {
    this.on = Math.min(1, Math.max(0, this.on + (settled ? dt / 1.2 : -dt / 0.3)));
    const k = this.on;
    const s = this.steam;
    const pos = s.geo.attributes.position.array, cl = s.geo.attributes.color.array;
    for (let i = 0; i < s.n; i++) {
      const q = s.parts[i];
      q.age += dt;
      if (q.age >= q.life) {
        const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * spread;
        Object.assign(q, { age: 0, life: 3.2 + Math.random() * 1.8, x: Math.cos(a) * r, z: Math.sin(a) * r, y: top - 0.15, vy: 0.14 + Math.random() * 0.12 });
      }
      const t = q.age / q.life;
      q.y += q.vy * dt;
      const sway = Math.sin(q.age * 1.1 + q.ph) * 0.22 * t;
      pos[i * 3] = q.x + sway;
      pos[i * 3 + 1] = q.y;
      pos[i * 3 + 2] = q.z + Math.cos(q.age * 1.1 + q.ph) * 0.08 * t;
      // entra suave y se disipa al subir (con mezcla aditiva, oscurecer = desvanecer)
      const f = Math.sin(Math.PI * Math.min(1, t)) * 0.085 * k;
      cl[i * 3] = cl[i * 3 + 1] = cl[i * 3 + 2] = f;
    }
    s.geo.attributes.position.needsUpdate = true;
    s.geo.attributes.color.needsUpdate = true;

    const e = this.embers;
    if (e) {
      const [r0, r1] = this.emberRing;
      const ep = e.geo.attributes.position.array, ec = e.geo.attributes.color.array;
      for (let i = 0; i < e.n; i++) {
        const q = e.parts[i];
        q.age += dt;
        if (q.age >= q.life) {
          // nace alrededor del plato, detrás y a los lados
          const a = Math.PI * (0.15 + Math.random() * 0.7) + (Math.random() < 0.5 ? 0 : Math.PI);
          const r = r0 + Math.random() * (r1 - r0);
          Object.assign(q, { age: 0, life: 2.2 + Math.random() * 1.8, x: Math.cos(a) * r, z: -Math.abs(Math.sin(a) * r) * 0.8, y: 0.2 + Math.random() * 0.4, vy: 0.35 + Math.random() * 0.35 });
        }
        const t = q.age / q.life;
        q.y += q.vy * dt;
        ep[i * 3] = q.x + Math.sin(q.age * 2.1 + q.ph) * 0.18;
        ep[i * 3 + 1] = q.y;
        ep[i * 3 + 2] = q.z;
        // parpadea como una brasa y se apaga al subir
        const f = (1 - t) * (0.65 + 0.35 * Math.sin(q.age * 13 + q.ph)) * k;
        ec[i * 3] = f;
        ec[i * 3 + 1] = f * 0.55;
        ec[i * 3 + 2] = f * 0.18;
      }
      e.geo.attributes.position.needsUpdate = true;
      e.geo.attributes.color.needsUpdate = true;
    }
    return k > 0.001;
  }

  dispose(scene) {
    for (const p of [this.steam, this.embers]) {
      if (!p) continue;
      scene.remove(p.pts);
      p.geo.dispose();
      p.pts.material.dispose();
    }
  }
}
