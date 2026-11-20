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
  /** 'dark' = vitrina oscura con el producto iluminado. */
  theme?: 'light' | 'dark';
  /** Tabla de madera bajo la hamburguesa. */
  board?: boolean;
  /** false = sin girar con el dedo (modo escaparate). */
  interactive?: boolean;
  /** Se llama cuando el primer cuadro ya está dibujado. */
  onReady?: () => void;
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
  /** 'auto' (por defecto) detecta el dispositivo: high / medium / low. */
  quality?: 'auto' | 'high' | 'medium' | 'low';
}

export declare function classifyIngredient(name: string): LayerInfo | null;
export declare function normalizeName(name: string): string;

export declare class BurgerScene {
  constructor(container: HTMLElement, options?: BurgerSceneOptions);
  setIngredients(names: string[], options?: { animate?: boolean }): void;
  /** Resalta un ingrediente por nombre (null para quitar el resaltado). */
  setHighlight(label: string | null): void;
  /** Arma la hamburguesa desde cero, capa por capa. */
  rebuild(names: string[]): void;
  setAutoRotate(on: boolean): void;
  /** Pausa/reanuda el dibujo sin destruir la escena. */
  setPaused(paused: boolean): void;
  /** PNG del cuadro actual (null si aún no está listo). */
  snapshot(): string | null;
  readonly quality: 'high' | 'medium' | 'low';
  dispose(): void;
}

export default BurgerScene;
