/**
 * Transición de entrada al cambiar de pantalla (bienvenida → menú → seguimiento).
 * Solo CSS: aparece con un fundido corto; se desactiva con "reducir movimiento".
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
