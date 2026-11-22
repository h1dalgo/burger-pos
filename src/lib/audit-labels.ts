/** Acciones que quedan en el registro (se usan en el servidor y en el admin). */
export const AUDIT_ACTIONS = {
  PAGO_CONFIRMADO: 'Pago confirmado',
  PEDIDO_CANCELADO: 'Pedido cancelado',
  ESTADO_REVERTIDO: 'Estado revertido',
  MESA_CAMBIADA: 'Cambio de mesa',
  TASA_CAMBIADA: 'Tasa cambiada',
  NEGOCIO_ABIERTO: 'Negocio abierto',
  NEGOCIO_CERRADO: 'Negocio cerrado',
  PRODUCTO_AGOTADO: 'Marcado agotado',
  PRODUCTO_DISPONIBLE: 'Marcado disponible',
  PRECIO_CAMBIADO: 'Precio cambiado',
  PRODUCTO_ELIMINADO: 'Producto eliminado',
  PROMO_CREADA: 'Promoción creada',
  PROMO_EDITADA: 'Promoción editada',
  PROMO_ACTIVADA: 'Promoción activada',
  PROMO_DESACTIVADA: 'Promoción desactivada',
  PROMO_ELIMINADA: 'Promoción eliminada',
  CAJA_ABIERTA: 'Caja abierta',
  CAJA_CERRADA: 'Caja cerrada',
} as const;

export type AuditAction = keyof typeof AUDIT_ACTIONS;

/** Acciones que conviene revisar (dinero que sale o se deja de cobrar). */
export const SENSITIVE_ACTIONS: AuditAction[] = ['PEDIDO_CANCELADO', 'ESTADO_REVERTIDO', 'TASA_CAMBIADA', 'PRECIO_CAMBIADO', 'CAJA_CERRADA'];
