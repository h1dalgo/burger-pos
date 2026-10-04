# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Cliente en mesa (móvil):** comensal en el restaurante que pide desde su teléfono (típicamente vía QR); su "job" es decidir y pedir rápido sin app, con la carta, precios y fotos a la vista.
- **Mesero:** atiende mesas, recibe llamados, consulta/modifica pedidos en piso; necesita escaneo rápido y errores mínimos.
- **Cocina:** ve el flujo de pedidos en tablero Kanban en tiempo real; su job es ejecutar pedidos con lectura instantánea de estado y tiempos.
- **Dueño/admin:** monitorea ventas, pedidos, stock y configuración del negocio; necesita claridad y control.

## Product Purpose

POS integral para restaurantes de hamburguesas: el cliente pide desde su mesa en la web, el pedido viaja en tiempo real a cocina y al mesero, y el dueño controla el negocio desde un panel. Éxito = pedido completo de mesa a cocina sin fricción y con operación en vivo.

## Positioning

Sistema de pedidos de mesa a cocina en tiempo real (Socket.io) sin app ni instalación: carta, variaciones, carrito, flujo de pago, Kanban de cocina, llamados de mesa y panel admin en una sola web desplegada en la nube.

## Operating Context

- Restaurantes reales: piso (clientes/meseros), cocina (pantalla siempre encendida), oficina del dueño.
- Cliente accede por móvil en la mesa; admin y cocina en escritorio/tablet.
- Despliegue en Render.com (Blueprint), base de datos PostgreSQL, fotos de producto en Cloudinary.
- Interfaz 100% en español; moneda configurable.

## Capabilities and Constraints

- Carta con fotos, categorías, variaciones e ingredientes; carrito y checkout; estados de orden `WAITING_PAYMENT → PENDING → IN_PREPARATION → READY → DELIVERED`.
- Llamados de mesa (`CALL_WAITER`, `REQUEST_BILL`); stock/availability en vivo; settings del negocio (nombre, logo, moneda, mesas).
- Rutas protegidas `/admin123/*` con PIN; eventos en vivo `order:new|updated|archived`, `stock:updated`, `tableCall:new/resolved`.
- Restricción dura: no romper funcionalidad ni cambiar backend/Prisma/socket en trabajo visual; UI en español.

## Brand Commitments

Ninguno vinculante: el usuario concedió libertad total para reinventar nombre, paleta, tipografía y identidad. El nombre del negocio es configurable en runtime por cada usuario (settings).

## Evidence on Hand

13 fotos reales de productos en Cloudinary (ya restauradas en prod), copia funcional existente en español, app completa funcional. No hay testimonials, logos ni assets de marca producidos.

## Product Principles

1. La operación en vivo es el producto: todo lo visual respalda lectura instantánea de estado en piso y cocina.
2. Cero fricción para el comensal: pedir desde la mesa debe sentirse obvio en un móvil, sin tutoriales.
3. Los flujos operativos (cocina, meseros, admin) priorizan escaneo y precisión sobre expresión.
4. Funcionalidad intacta: el diseño amplifica lo que ya funciona, nunca lo reemplaza ni lo retarda.
5. Escala como producto real: verosímil para restaurantes que pagan por él, no como demo.

## Accessibility & Inclusion

Sin requisito formal declarado; se asume uso con una mano en móvil, brillo de piso/restaurante y lectura rápida en cocina.
