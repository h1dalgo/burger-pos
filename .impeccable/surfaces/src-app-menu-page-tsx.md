---
version: 1
slug: "src-app-menu-page-tsx"
primary_target: "src/app/menu/page.tsx"
related_targets: ["src/app","src/app/admin123","src/app/kitchen","src/app/meseros","src/app/cart","src/app/llamado","src/app/success"]
---

# Surface brief — Rótulo de Esquina (mundo global del producto)

## Scope

Rediseño de reemplazo (mundo visual nuevo) para todo el producto: menú del cliente (primario), admin123, cocina, meseros, carrito, éxito y llamado de mesa.

## Mode

operate. El mundo aporta exactamente cuatro cosas: tipografía, paleta, densidad y un movimiento firma. Navegación, topología y controles permanecen los estándar de la plataforma web.

## Audience & job

Comensal en la mesa (móvil) que quiere pedir sin fricción; mesero en piso escaneando estados; cocina con pantalla siempre encendida; dueño controlando el negocio. Éxito: pedido de mesa a cocina en vivo, sin errores.

## Constraints

Funcionalidad intacta (sockets, eventos, estados de orden, localStorage, middleware); UI en español; prefers-reduced-motion respetado; sin regresiones de performance.

## Memorable moment

La sombra dura de pintor: cada letrero es una letra de dos tintas con sombra sólida desplazada, como recién pintada en la fachada.

## Unresolved decisions

Ninguna.

## Direction contract

### THESIS

Un POS que se pinta como la fachada del local: todo el producto es un rótulo esmaltado a mano, y rechaza por igual la app-delivery de tarjetas redondeadas con gradiente y el dashboard gris de SaaS.

### OWN-WORLD

Crema papel #FDF6E3 como suelo; rojo esmalte #D9261C y amarillo rótulo #FFC72C a plena saturación ocupando regiones enteras (cabeceras, placas de precio, botones); azul rótulo #12489B para foco y bordes; tinta #1A1712 para texto. Alfa Slab One para letreros con sombra dura de 3px; Archivo para UI y cifras tabulares. Componentes = placas pintadas: bordes gruesos, esquinas pocas, sombra sólida sin blur.

### STORY

El comensal ve la fachada pintada y reconoce su hamburguesería; mesero y cocina leen placas de color como un tablero de precios; el dueño ve su negocio reflejado en el letrero que puso en la puerta. Todos entienden al instante dónde están y qué pasa ahora.

### FIRST VIEWPORT

Menú móvil (390px): header de fachada pintada — nombre del negocio en Alfa Slab One enorme con sombra amarilla dura sobre placa roja a sangre; debajo, nav de categorías como pestañas de tablero (activa en rojo con sombra sólida); grid de productos en placas crema con borde tinta, foto arriba y precio en placa amarilla con número tabular; FAB de carrito rojo con sombra dura. Shell, área de trabajo y estado a la vista en el primer viewport.

### FORM

Rótulo de Esquina — candidata #1 de la lista fundamentada, tomada por el usuario (kicker IMPECCABLE'S PICK); seed key b3ba7a15.

### FINISH

unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
