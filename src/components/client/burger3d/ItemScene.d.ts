export type ItemVariant = 'drink' | 'starter' | 'dessert';
export type ItemKind = 'bottle' | 'pitcher' | 'glass' | 'basket' | 'popsicle';

export interface ItemSceneOptions {
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
  readonly quality: 'high' | 'medium' | 'low';
  dispose(): void;
}

export default ItemScene;
