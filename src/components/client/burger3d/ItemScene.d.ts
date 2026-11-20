export type ItemVariant = 'drink' | 'starter' | 'dessert';
export type ItemKind = 'bottle' | 'pitcher' | 'glass' | 'basket' | 'popsicle';

export interface ItemSceneOptions {
  /** false = sin girar con el dedo (modo escaparate). */
  interactive?: boolean;
  /** Se llama cuando el primer cuadro ya está dibujado. */
  onReady?: () => void;
  autoRotate?: boolean;
  /** Texto de ayuda. false para ocultarlo. */
  hint?: string | false;
  /** 'auto' (por defecto) detecta el dispositivo. */
  quality?: 'auto' | 'high' | 'medium' | 'low';
}

export declare function itemKindFor(variant: ItemVariant, name?: string): ItemKind;

export declare class ItemScene {
  constructor(container: HTMLElement, options?: ItemSceneOptions);
  setProduct(p: { variant: ItemVariant; name?: string; description?: string; choices?: string[] }): void;
  setAutoRotate(on: boolean): void;
  /** Pausa/reanuda el dibujo sin destruir la escena. */
  setPaused(paused: boolean): void;
  /** PNG del cuadro actual (null si aún no está listo). */
  snapshot(): string | null;
  readonly quality: 'high' | 'medium' | 'low';
  dispose(): void;
}

export default ItemScene;
