/**
 * Textos de presentación del menú: el subtítulo de cada categoría (estilo
 * "Para compartir", "Nuestras burgers") y el formato del nombre del cliente.
 * Los nombres de categoría se guardan en mayúsculas en la base de datos; aquí
 * solo se decide cómo se muestran.
 */

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

const SUBTITLES: [RegExp, string][] = [
  [/entrada|combo|compartir|alita|snack|picar/, 'Para compartir'],
  [/hamburguesa|burger/, 'Nuestras burgers'],
  [/bebida|refresco|jugo|gaseosa|batido|cafe/, 'Para refrescar'],
  [/postre|dulce|helado|paleta|brownie/, 'El toque dulce'],
  [/perro|hot ?dog/, 'Perros calientes'],
  [/pizza/, 'Recién horneadas'],
  [/ensalada|saludable/, 'Algo ligero'],
  [/papa|acompa/, 'Para acompañar'],
];

/** "ENTRADAS Y COMBOS ESPECIALES" → "Entradas y combos especiales" */
export function sentenceCase(s: string) {
  const t = s.trim().toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Subtítulo con personalidad para una categoría; si no se reconoce, su nombre en formato oración. */
export function categorySubtitle(name: string) {
  const n = norm(name);
  for (const [re, text] of SUBTITLES) if (re.test(n)) return text;
  return sentenceCase(name);
}

/** "jose maría" → "Jose María" (el cliente puede escribirlo en minúsculas). */
export function formatPersonName(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => (w ? w.charAt(0).toLocaleUpperCase('es') + w.slice(1).toLocaleLowerCase('es') : w))
    .join(' ');
}
