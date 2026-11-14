export type LayerKind =
  | 'bunBottom' | 'bunTop' | 'patty' | 'chicken' | 'cheese' | 'lettuce' | 'tomato' | 'pickles'
  | 'onionCaramelized' | 'onionGrilled' | 'onionRaw' | 'onionCrispy' | 'onionRings' | 'bacon'
  | 'sauce' | 'egg' | 'mushroom' | 'ham' | 'coleslaw' | 'potatoSticks' | 'corn' | 'olives';

export interface LayerInfo {
  kind: LayerKind;
  /** cheese: 'cheddar' | 'white'; sauce: 'milIslas' | 'mayo' | 'ketchup' | 'mostaza' | 'bbq' | 'buffalo' | 'guacamole' | 'cesar' | 'queso' */
  variant?: string;
  /** true = se suma a la proteína base (ej. "Doble Carne") */
  extra?: boolean;
}

export interface BurgerSceneOptions {
  autoRotate?: boolean;
  /** Agrega una carne base si la lista no trae proteína. Default true. */
  autoPatty?: boolean;
  /** Animación de armado al aparecer. Default true. */
  intro?: boolean;
  /** Texto de ayuda. false para ocultarlo. */
  hint?: string | false;
  onLayerClick?: ((label: string, kind: LayerKind) => void) | null;
  /** Mapeo propio de nombre → capa (se consulta antes del mapeo por defecto). */
  classify?: ((name: string) => LayerInfo | null) | null;
  maxPixelRatio?: number;
}

export declare function classifyIngredient(name: string): LayerInfo | null;
export declare function normalizeName(name: string): string;

export declare class BurgerScene {
  constructor(container: HTMLElement, options?: BurgerSceneOptions);
  setIngredients(names: string[], options?: { animate?: boolean }): void;
  setAutoRotate(on: boolean): void;
  dispose(): void;
}

export default BurgerScene;
