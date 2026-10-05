---
name: Burger POS
description: POS para restaurantes con cara de rótulo esmaltado a mano — crema, rojo de fachada y mostaza de letrero.
colors:
  cream: "#fdf6e3"
  card: "#fffdf6"
  carbon: "#1a1712"
  night: "#211c15"
  burger: "#d9261c"
  burger-deep: "#b01e15"
  mustard: "#ffc72c"
  mustard-deep: "#f0b400"
  mint: "#1b7a43"
  mint-deep: "#16653a"
  mint-ink: "#0f5132"
  rose: "#9e1b32"
  azul: "#12489b"
  status-waiting: "#6e3aa7"
  status-pending: "#c1121f"
  status-preparing: "#a15c00"
  status-ready: "#1b7a43"
typography:
  display:
    fontFamily: "Alfa Slab One, Georgia, serif"
    fontWeight: 400
    lineHeight: 1.05
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontWeight: 700
    lineHeight: 1.2
  mono:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  pill: "9999px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.burger}"
    textColor: "{colors.cream}"
    rounded: "{rounded.sm}"
    height: "44px"
    padding: "0 20px"
  button-primary-hover:
    backgroundColor: "{colors.burger-deep}"
    textColor: "{colors.cream}"
    rounded: "{rounded.sm}"
    height: "44px"
    padding: "0 20px"
  button-solid:
    backgroundColor: "{colors.mustard}"
    textColor: "{colors.carbon}"
    rounded: "{rounded.sm}"
    height: "44px"
    padding: "0 20px"
  input-text:
    backgroundColor: "{colors.card}"
    textColor: "{colors.carbon}"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.carbon}"
    rounded: "{rounded.md}"
    padding: "16px"
  chip:
    backgroundColor: "{colors.card}"
    textColor: "{colors.carbon}"
    rounded: "{rounded.pill}"
    padding: "8px 16px"
  chip-selected:
    backgroundColor: "{colors.burger}"
    textColor: "{colors.cream}"
    rounded: "{rounded.pill}"
    padding: "8px 16px"
  nav-item-active:
    backgroundColor: "{colors.mustard}"
    textColor: "{colors.carbon}"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
---

# Design System: Burger POS

## Overview

**Creative North Star: "Rótulo de Esquina"**

Burger POS viste como el rótulo esmaltado a mano de una hamburguesería de esquina latinoamericana: planos de crema, bloques de color a saturación plena, letras de bloque con sombra dura de dos tintas. El sistema no finge herencia fotográfica —la materia es pintura plana sobre chapa— y por eso toda superficie se construye con placas esmaltadas (borde de tinta de 2px, esquinas cortas, sombra sólida desplazada) en vez de tarjetas difusas.

La app es una herramienta de servicio (modo *operate*): el mundo presta tipografía, paleta, densidad y su movimiento firma, no composiciones. La densidad es de piso de trabajo —filas escaneables, cifras tabulares, un solo vistazo por orden— y el color estructural (rojo de barra y riel, mostaza de placas activas) hace el trabajo de orientación antes que cualquier degradado o glass.

El momento memorable es la sombra de dos tintas: `.sign` desplaza cada titular display una fracción de em (0.06em, blur cero) en un segundo tinta —mostaza sobre rojo, mostaza sobre carbon— como si el rótulo estuviera recién pintado. Ese gesto, más los bloques rojo/mostaza a saturación plena, es lo que se recuerda al cerrar la pestaña.

**Key Characteristics:**
- Piso crema con carcasa roja a saturación plena (barra superior, riel de admin, headers).
- Sombra dura de dos tintas en todo display (`.sign`, `.sign-yellow`, `.sign-red`, `.sign-cream`).
- Profundidad sólida desplazada (3/4/5px, blur cero) — screen-print, nunca sombra ambiental.
- Archivo para UI + Alfa Slab One para display, self-hosted; cifras tabulares en dinero y tiempos.
- Placas esmaltadas planas: borde 2px tinta, radio ≤16px, fondo carta sobre fondo crema.
- Movimiento solo de entrada o de estado, transform+opacity, con `prefers-reduced-motion` respetado.

## Colors

Paleta de esmalte: un rojo de fachada, una mostaza de letrero, un verde de cocina y una familia de tintas cálidas sobre crema — saturación plena donde manda el color, alphas del mismo token donde hay que atenuar.

### Primary
- **Rojo de Fachada** (burger): la carcasa del sistema. Barra superior, riel/sidebar de admin, headers de cocina y meseros, CTA primarios, caret de texto, acentos de letrero. Aparece en regiones enteras o en botones —nunca como tinte pastel de fondo.
- **Rojo Profundo** (burger-deep): hover/press del rojo y sombra roja de segundo tinta sobre superficies rojas.

### Secondary
- **Mostaza de Letrero** (mustard): segundo tinta del sistema. Sombras `.sign-yellow`, placas de nav activa, cantidades, selecciones, chips de precio, `::selection`, placas de icono. Es el color que "pinta" sobre rojo y tinta. Su versión profunda (mustard-deep) es solo el hover del botón sólido.

### Tertiary
- **Verdes de Cocina** (mint / mint-deep / mint-ink): éxito, estado READY, toasts de llamado, botones de confirmación. `mint-ink` es la versión con contraste de texto.
- **Rosa Peligro** (rose): destructivos y estados fallidos.
- **Azul de Foco** (azul): exclusivamente anillos/focus de accesibilidad y enlaces de navegación secundaria (`text-azul`). No compite con la marca.
- **Tokens de Estado** (status-waiting/pending/preparing/ready): vocabulario de órdenes en cocina/meseros/admin — violeta esperando, rojo pendiente, ámbar preparando, verde listo.

### Neutral
- **Crema Esmalte** (cream): el piso de todas las pantallas (body background).
- **Carta** (card): fondo de placas —una crema más clara que el piso para que la placa flote por borde, no por sombra gris.
- **Tinta Carburó** (carbon): única tinta de texto sobre claro; también borde de placa y cuerpo de toda sombra sólida.
- **Noche** (night): fondos inmersivos puntuales (placa de toast, barras oscuras puntuales).

### Named Rules
**The Tinta Rule.** Carbon es la única tinta de cuerpo sobre superficies claras: negro puro y grises Tailwind de texto están prohibidos. Todo texto es un token o un alfa de carbon con ≥4.5:1 (placeholders incluidos: alfa 0.72).

**The Saturation Rule.** Rojo y mostaza solo a saturación plena en su rol estructural; cuando amortiguan fondos usan el alpha del mismo token (10–30%), nunca una mezcla pastel nueva.

## Typography

**Display Font:** Alfa Slab One (fallback Georgia, serif) — self-hosted, variable `--font-alfa`.
**Body Font:** Archivo (fallback system-ui) — self-hosted, `--font-archivo`, también como `--font-sans`.
**Mono Font:** JetBrains Mono (fallback ui-monospace) — IDs y datos crudos.

**Character:** El pareo grita "letrero pintado sobre sans de utilidad": el slab display pone el carácter de rótulo, Archivo mantiene el piso de servicio legible a 12–14px con cifras tabulares. Un sistema, dos voces: la fachada y la caja.

### Hierarchy
- **Display / Sign** (400, 24–48px según breakpoint, lh 1.05, tracking -0.01em): títulos de página y totales. Siempre con `.sign*` de segunda tinta. Clase: `.display`.
- **Headline** (Archivo 700, 18–24px, lh 1.25): títulos de sección y columnas de kanban.
- **Title** (Archivo 700, 14–16px, lh 1.3): títulos de placa/fila/producto.
- **Body** (Archivo 400, 14–16px, lh 1.5): copy operativo; `font-variant-numeric: tabular-nums` en precios, totales y tiempos.
- **Label** (Archivo 700, 11–12px, uppercase, tracking ~0.06em): etiquetas de campo, badges, nav, contadores.
- **Mono** (JetBrains Mono 500, 12–13px): `#id` de orden, claves y datos crudos.

### Named Rules
**The Two-Ink Type Rule.** Cada display lleva UNA sombra dura de segunda tinta a 0.06em en X/Y con blur cero (`.sign` = tinta, `.sign-yellow` = mostaza, `.sign-red` = rojo, `.sign-cream` = crema). Nunca blur, nunca gradiente de texto, nunca un tercer color en la sombra.

## Layout

Piso crema continuo; el color estructural vive en carcasa: barra/barra-lateral roja fija a la izquierda en admin (rail con placa activa mostaza), barra roja superior en cocina/meseros, y en cliente la crema gana con flotantes (carrito FAB) sobre el contenido. Ritmo de espaciado en la escala de 4px; padding de placa 16–24px; padding de página 16px en móvil → 24/32px en desktop.

Responsive: bajo ~768px el riel de admin colapsa a cajón (placa de icono mostaza), las columnas de kanban se vuelven scroll horizontal, los menús de mesero usan bottom sheet con tabs en barra roja. Densidad primero: filas de admin de una línea con cifras alineadas a la derecha, grid de cliente de 2–4 columnas con placa + sombra como única separación (sin gutters grises).

## Elevation & Depth

Híbrido disciplinado: todas las superficies son planas (pintura) y la profundidad se dibuja como sombra sólida de tinta desplazada, tipo screen-print. No existe sombra ambiental difusa en el sistema.

### Shadow Vocabulary
- **Reposo de placa** (`box-shadow: 3px 3px 0 #1a1712`): `.card`, botones (`.btn`), placas que esperan interacción.
- **Lift** (`4px 4px 0 #1a1712`): hover de `.lift` junto a `translateY(-2px)`; cards y filas navegables.
- **Pop** (`5px 5px 0 #1a1712`): capas elevadas —drawers, bottom sheets, toasts, modales— siempre acompañados de borde 2px.
- **Brand lift** (`4px 4px 0 #d9261c`): hover acento de `.lift-brand` sobre placas que quieren llamar marca.
- **Foco** (`outline: 3px solid #12489b`, offset 2px): foco accesible global; es outline, no sombra.

### Named Rules
**The Hard-Shadow Rule.** Toda profundidad es un desplazamiento sólido de carbon con blur cero (3/4/5px). Si necesitas que algo se eleve, muévelo y engrosa su sombra sólida; no la difumines.

## Shapes

Lenguaje de placa esmaltada: controles a 8px de radio (`.btn`, `.field`), placas y cards a 12px, paneles/drawers a 16px, chips y badges en píldora completa; los grips diminutos (thumb de scrollbar) usan el paso xs de 4px. Bordes de 2px en tinta sobre placas interactivas; guías de sección neutras a `border-l-2` con alfa de tinta (nunca coloreadas, nunca >1px de color). Sin glass, sin blur de fondo, sin clipping complejo —la geometría es rectangular con esquinas cortadas, como cartón de envase. El botón al activarse se hunde exactamente sobre su sombra (`translate(3px, 3px)`): la silueta no cambia, solo el plano.

## Components

### Buttons
- **Shape:** radio 8px, borde 2px tinta, sombra reposo 3px sólida; alto 44px (sm 36px, lg 52px), padding-inline 20px.
- **Primary:** fondo rojo, texto crema; hover rojo profundo; active se hunde 3px sobre su sombra.
- **Solid:** fondo mostaza, texto tinta; hover mostaza oscurecido — es el CTA de segundo nivel y de cocina/meseros.
- **Success / Danger:** menta y rosa con texto crema, mismas reglas de borde/sombra.
- **Outline / Ghost:** transparentes con borde actual o nulo; hover con wash de mostaza (outline) o alpha de tinta (ghost).
- **Focus:** outline azul global 3px/offset 2px.

### Inputs / Fields
- **Style:** fondo carta, texto tinta, borde 2px tinta al 35%, radio 8px, padding 12/16px.
- **Hover:** borde sube a tinta 60%.
- **Focus:** borde azul + halo `0 0 0 3px` de azul al 25%.
- **Placeholder:** tinta al 0.72 (≥4.5:1) — nunca gris claro.
- **Disabled:** opacidad 0.5 + `not-allowed`.

### Chips
- **Style:** píldora, fondo carta, borde 2px tinta al 30%, texto tinta 600, padding 8/16px.
- **Selected (por tone):** brand = rojo/crema, mint = menta/crema, rose = rosa/crema; borde tinta plena.
- **Pressed:** `scale(0.97)` instantáneo; disabled 0.45.

### Cards / Containers
- **Corner Style:** 12px (paneles grandes 16px).
- **Background:** carta sobre crema — el contraste lo hace el borde, no una sombra gris.
- **Border:** 2px tinta en placas interactivas/cartas de producto; guías neutras `border-l-2` al 15–20% de tinta.
- **Shadow Strategy:** reposo 3px (Elevation), hover 4px con lift, overlays 5px.
- **Internal Padding:** 16px base, 20–24px en paneles.

### Badges
- **Style:** píldora, 12px/700, tintes = alpha del token (rojo 12%, menta 14%, mostaza 30%, violeta 14%, peligro 12%, neutro 8%) con texto en la versión ink del token.
- **Status dots:** puntos sólidos de 6–8px en el hex plano del token de estado (violeta/rojo/ámbar/verde/gris).

### Navigation
- **Admin (riel rojo):** fondo rojo, borde derecho tinta, ítems crema 600; activa = placa mostaza con borde 2px tinta, texto tinta, peso bold; exact-match por ruta (nunca prefijo). Hover = wash crema 10%.
- **Cliente (tabs de categoría):** píldoras sobre crema; activa = placa roja/crema con `layoutId` animado.
- **Cocina/Meseros (header rojo):** título display crema con `.sign`, placas de ícono mostaza, pills de estado crema.
- **Móvil:** cajón con placa de ícono mostaza y fondo de placa crema.

### Signature: Two-Ink Sign
La pieza firma del sistema. Cualquier titular display lleva `.sign*` con la tinta secundaria del contexto: mostaza sobre rojo o carbon, carbon sobre mostaza/crema, crema sobre rojo. Va siempre con `.display`. Es el único "efecto" tipográfico permitido —sin degradados, sin glass, sin glow.

## Do's and Don'ts

### Do:
- **Do** montar toda superficie nueva sobre crema + placas de carta con borde 2px tinta y sombra sólida 3px.
- **Do** poner `.sign-yellow` a los displays sobre rojo/carbon y `.sign` sobre crema; sombra exacta 0.06em, blur cero.
- **Do** usar rojo y mostaza a saturación plena en estructura (barra, riel, header) y alpha del mismo token para tintes de fondo.
- **Do** mantener placeholder ≥0.72 de alfa de tinta, focus azul global y `tabular-nums` en todo número operativo.
- **Do** animar solo entrada/estado con transform+opacity y respetar `prefers-reduced-motion`.
- **Do** elegir exact-match para nav activa (una sola placa mostaza por pantalla).

### Don't:
- **Don't** difuminar sombras: blur de sombra está prohibido; profundidad = desplazamiento sólido de carbon.
- **Don't** usar negros puros, grises Tailwind de texto, placeholders claros (<4.5:1) ni texto de color sin token.
- **Don't** escribir kickers/eyebrows sobre títulos, gradientes de texto, glass/blur de fondo ni emoji/unicode como iconos (solo lucide de trazo único).
- **Don't** pintar bordes laterales coloreados >1px ni tarjetas anidadas dentro de tarjetas.
- **Don't** exceder 16px de radio en placas ni inventar tokens de color fuera de esta paleta.
- **Don't** animar UI frecuente (filtros, filas, toggles) —el movimiento es de entrada, de estado o de presión, y el botón se hunde 3px sobre su sombra en `active`.
