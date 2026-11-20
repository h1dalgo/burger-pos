import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { bestDiscount, getSettings, moveInventory, openState, outOfStockProductIds } from '@/lib/business';
import { sendPush } from '@/lib/push';

export const runtime = 'nodejs';

const ORDER_INCLUDE = {
  items: {
    include: {
      variation: true,
      removedIngredients: true,
      addedExtras: true,
      selections: true,
    },
  },
} satisfies Prisma.OrderInclude;

/** Pedidos con más de 12 h sin cerrarse se archivan solos. */
const STALE_MS = 12 * 60 * 60 * 1000;

async function archiveStale() {
  const before = new Date(Date.now() - STALE_MS);
  const stale = await prisma.order.findMany({
    where: { createdAt: { lt: before }, status: { in: ['WAITING_PAYMENT', 'PENDING', 'IN_PREPARATION', 'READY'] } },
    select: { id: true, status: true, items: { select: { productId: true, quantity: true } } },
  });
  if (!stale.length) return;
  const unpaid = stale.filter((o) => o.status === 'WAITING_PAYMENT');
  const served = stale.filter((o) => o.status !== 'WAITING_PAYMENT');
  if (unpaid.length) {
    // nunca se pagaron: se cancelan y se devuelven los insumos
    await prisma.order.updateMany({ where: { id: { in: unpaid.map((o) => o.id) } }, data: { status: 'CANCELLED', cancelReason: 'Vencido sin confirmar el pago' } });
    await moveInventory(unpaid.flatMap((o) => o.items), 1);
  }
  if (served.length) {
    await prisma.order.updateMany({ where: { id: { in: served.map((o) => o.id) } }, data: { status: 'DELIVERED' } });
  }
  for (const o of stale) global.io?.to('kitchen').emit('order:archived', o.id);
}

export async function GET(request: NextRequest) {
  try {
    const displayIdParam = request.nextUrl.searchParams.get('displayId');
    if (displayIdParam) {
      const displayId = Number(displayIdParam);
      if (!Number.isInteger(displayId)) {
        return NextResponse.json({ error: 'Invalid displayId' }, { status: 400 });
      }
      const order = await prisma.order.findFirst({ where: { displayId }, include: ORDER_INCLUDE });
      return NextResponse.json(order);
    }

    await archiveStale().catch((e) => console.error('archiveStale', e));

    const orders = await prisma.order.findMany({
      where: { status: { notIn: ['DELIVERED', 'CANCELLED'] } },
      orderBy: { createdAt: 'desc' },
      include: ORDER_INCLUDE,
    });

    return NextResponse.json(orders);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerName, tableNumber, paymentMethod, items, status, tip, waiter, paymentReference, couponCode } = body;

    if (typeof customerName !== 'string' || !customerName.trim() || customerName.trim().length > 80) {
      return NextResponse.json({ error: 'Nombre inválido' }, { status: 400 });
    }
    if (typeof tableNumber !== 'string' || !tableNumber.trim() || tableNumber.trim().length > 10) {
      return NextResponse.json({ error: 'Mesa inválida' }, { status: 400 });
    }
    if (!paymentMethod || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const validPaymentMethods = ['CASH', 'MOBILE_PAYMENT', 'CARD'];
    if (!validPaymentMethods.includes(paymentMethod)) {
      return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 });
    }

    const validStatuses = ['WAITING_PAYMENT', 'PENDING', 'IN_PREPARATION', 'READY', 'DELIVERED'];
    if (status !== undefined && !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const tipAmount = Number(tip) || 0;
    if (!Number.isFinite(tipAmount) || tipAmount < 0 || tipAmount > 1000) {
      return NextResponse.json({ error: 'Invalid tip' }, { status: 400 });
    }

    const waiterName =
      typeof waiter === 'string' && waiter.trim() && waiter.trim().length <= 40
        ? waiter.trim()
        : null;

    const settings = await getSettings();

    // Fuera de horario solo el personal puede cargar pedidos
    const open = openState(settings);
    if (!open.open && !waiterName) {
      return NextResponse.json({ error: open.message || 'Estamos cerrados por ahora' }, { status: 403 });
    }

    // Pago Móvil: el cliente debe escribir la referencia
    const reference = typeof paymentReference === 'string' ? paymentReference.replace(/\D/g, '').slice(0, 20) : '';
    if (paymentMethod === 'MOBILE_PAYMENT' && !waiterName && reference.length < 4) {
      return NextResponse.json({ error: 'Escribe los últimos dígitos de la referencia del Pago Móvil' }, { status: 400 });
    }

    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const productIds = [...new Set(items.map((item: { productId?: unknown }) => item?.productId).filter(Boolean))] as string[];
    const validIds = productIds.filter((id) => typeof id === 'string' && UUID_RE.test(id));
    const [dbProducts, outOfStock] = await Promise.all([
      validIds.length
        ? prisma.product.findMany({
            where: { id: { in: validIds } },
            include: { variations: true, extraIngredients: true },
          })
        : [],
      outOfStockProductIds(),
    ]);
    const productById = new Map(dbProducts.map((p) => [p.id, p]));

    let totalAmount = 0;
    const lines: { categoryId: string; subtotal: number; productId: string; quantity: number }[] = [];
    const orderItems: Prisma.OrderItemUncheckedCreateWithoutOrderInput[] = [];
    for (const item of items) {
      const product = item?.productId ? productById.get(item.productId) : undefined;
      if (!product) {
        return NextResponse.json({ error: 'Producto no encontrado' }, { status: 400 });
      }
      if (!product.isAvailable || outOfStock.has(product.id)) {
        return NextResponse.json({ error: `${product.name} ya no está disponible` }, { status: 400 });
      }
      const qty = Number(item.quantity);
      if (!Number.isInteger(qty) || qty < 1 || qty > 99) {
        return NextResponse.json({ error: `Cantidad inválida para ${product.name}` }, { status: 400 });
      }

      let unitPrice = Number(product.basePrice);
      let variationRel: Prisma.OrderItemVariationUncheckedCreateNestedOneWithoutOrderItemInput | undefined;
      if (item.variation) {
        const v = product.variations.find((x) => x.id === item.variation?.id);
        if (!v) {
          return NextResponse.json({ error: `Variación inválida para ${product.name}` }, { status: 400 });
        }
        if (!v.isAvailable) {
          return NextResponse.json({ error: `${product.name} (${v.name}) ya no está disponible` }, { status: 400 });
        }
        unitPrice += Number(v.additionalPrice);
        variationRel = { create: { variationName: v.name, additionalPrice: v.additionalPrice } };
      }

      let extrasRel: Prisma.OrderItemAddedExtraUncheckedCreateNestedManyWithoutOrderItemInput | undefined;
      if (Array.isArray(item.addedExtras) && item.addedExtras.length > 0) {
        const resolved: Prisma.OrderItemAddedExtraCreateWithoutOrderItemInput[] = [];
        for (const extra of item.addedExtras) {
          const e = product.extraIngredients.find((x) => x.id === extra?.id);
          if (!e) {
            return NextResponse.json({ error: `Extra inválido para ${product.name}` }, { status: 400 });
          }
          if (!e.isAvailable) {
            return NextResponse.json({ error: `${e.name} ya no está disponible` }, { status: 400 });
          }
          unitPrice += Number(e.basePrice);
          resolved.push({ extraName: e.name, price: e.basePrice });
        }
        extrasRel = { create: resolved };
      }

      const subtotal = unitPrice * qty;
      totalAmount += subtotal;
      lines.push({ categoryId: product.categoryId, subtotal, productId: product.id, quantity: qty });

      orderItems.push({
        productId: product.id,
        productName: product.name,
        quantity: qty,
        unitPrice,
        subtotal,
        note: typeof item.note === 'string' ? item.note.slice(0, 300) : null,
        variation: variationRel,
        removedIngredients: item.removedIngredients?.length
          ? { create: item.removedIngredients.map((name: string) => ({ ingredientName: name })) }
          : undefined,
        addedExtras: extrasRel,
        selections: item.selections
          ? {
              create: Object.entries(item.selections).flatMap(([selectionId, options]) =>
                (options as string[]).map((optionName: string) => ({
                  selectionLabel: item.selectionLabels?.[selectionId] || 'Selección',
                  selectedOptionName: optionName,
                }))
              ),
            }
          : undefined,
      });
    }

    // Promociones / cupón (el servidor decide el descuento)
    const promo = await bestDiscount(lines, typeof couponCode === 'string' ? couponCode : null, settings.timezone);
    if (promo.couponError) {
      return NextResponse.json({ error: promo.couponError }, { status: 400 });
    }
    const discount = Math.min(promo.discount, totalAmount);
    const rate = Number(settings.exchangeRate);

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          customerName: customerName.trim(),
          tableNumber: tableNumber.trim(),
          paymentMethod,
          totalAmount: Math.round((totalAmount - discount) * 100) / 100,
          discount,
          promoLabel: discount > 0 ? promo.label : null,
          exchangeRate: rate > 0 ? rate : null,
          paymentReference: reference || null,
          tip: tipAmount,
          waiter: waiterName,
          status: status || 'WAITING_PAYMENT',
          items: { create: orderItems },
        },
        include: ORDER_INCLUDE,
      });
      await moveInventory(lines, -1, tx);
      return created;
    });

    if (global.io) {
      global.io.to('kitchen').emit('order:new', order);
      global.io.to('waiter').emit('order:new', order);
      global.io.to('clients').emit('order:created', { displayId: order.displayId });
      // un insumo pudo agotarse: el menú se actualiza
      global.io.emit('stock:refresh');
    }
    if (order.status === 'WAITING_PAYMENT') {
      void sendPush({ role: 'waiter' }, {
        title: `Nuevo pedido #${String(order.displayId).padStart(4, '0')}`,
        body: `Mesa ${order.tableNumber} · por confirmar el pago`,
        url: '/meseros',
        tag: `new-${order.id}`,
      });
    }

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
