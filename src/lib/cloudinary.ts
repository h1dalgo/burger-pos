/**
 * Pide a Cloudinary la imagen al tamaño en que se muestra (el doble, para
 * pantallas de alta densidad) y en el formato más eficiente para cada
 * navegador (AVIF/WebP). Con otras URLs no hace nada.
 *
 * Ej.: una foto de 84 KB para una miniatura de 80 px queda en ~3 KB.
 */
export function cldUrl(url: string | null | undefined, opts: { w: number; h?: number; fit?: 'fill' | 'fit'; quality?: 'auto' | 'auto:low' } = { w: 400 }) {
  if (!url) return '';
  const marker = '/image/upload/';
  const i = url.indexOf(marker);
  if (i < 0 || !url.includes('res.cloudinary.com')) return url;
  const parts = [`f_auto`, `q_${opts.quality ?? 'auto'}`, `c_${opts.fit ?? 'fill'}`, `w_${Math.round(opts.w * 2)}`];
  if (opts.h) parts.push(`h_${Math.round(opts.h * 2)}`);
  if ((opts.fit ?? 'fill') === 'fill') parts.push('g_auto');
  const head = url.slice(0, i + marker.length);
  const tail = url.slice(i + marker.length);
  return `${head}${parts.join(',')}/${tail}`;
}
