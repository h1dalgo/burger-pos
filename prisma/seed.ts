import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  const existingSettings = await prisma.businessSettings.findFirst();
  if (!existingSettings) {
    await prisma.businessSettings.create({ data: { name: 'Burger POS', logoUrl: null } });
    console.log('Default settings created.');
  }

  const existingCount = await prisma.category.count();
  if (existingCount > 0) {
    console.log(`Database already has ${existingCount} categories, skipping seed.`);
    await prisma.$disconnect();
    return;
  }

  console.log('Seeding menu...');

  const entradas = await prisma.category.create({
    data: { name: 'ENTRADAS Y COMBOS ESPECIALES', displayOrder: 1 },
  });
  const hamburguesas = await prisma.category.create({
    data: { name: 'HAMBURGUESAS', displayOrder: 2 },
  });
  const bebidas = await prisma.category.create({
    data: { name: 'BEBIDAS', displayOrder: 3 },
  });
  const postres = await prisma.category.create({
    data: { name: 'POSTRES', displayOrder: 4 },
  });

  const commonExtras = [
    { name: 'Queso Cheddar', basePrice: 1.0 },
    { name: 'Tocino', basePrice: 1.0 },
    { name: 'Doble Carne', basePrice: 2.0 },
    { name: 'Cebolla Grillada', basePrice: 0.5 },
    { name: 'Aros de Cebolla', basePrice: 1.5 },
  ];

  async function addExtras(productId: string) {
    for (const e of commonExtras) {
      await prisma.extraIngredient.create({ data: { ...e, productId } });
    }
  }

  // === ALITAS CHILL ===
  const alitas = await prisma.product.create({
    data: { categoryId: entradas.id, name: 'Alitas Chill', description: '12 piezas de alitas acompañadas de papas con queso cheddar y topping de tocineta', basePrice: 8.5 },
  });
  await prisma.requiredSelection.create({
    data: { productId: alitas.id, label: 'Salsas extras de preferencia', maxSelections: 3, options: { create: [{ name: 'Salsa de ajo' }, { name: 'Salsa Buffalo' }, { name: 'BBQ' }, { name: 'Mostaza miel' }] } },
  });

  // === CHEESE BURGER ===
  const cb = await prisma.product.create({
    data: { categoryId: hamburguesas.id, name: 'Cheese Burger', description: 'Pan brioche, 120gr de carne, queso cheddar, cebollas caramelizadas, doble pepinillo, salsa mil islas', basePrice: 9.5 },
  });
  for (const n of ['Queso Cheddar', 'Cebollas Caramelizadas', 'Doble Pepinillo', 'Salsa Mil Islas']) {
    await prisma.defaultIngredient.create({ data: { productId: cb.id, name: n } });
  }
  await addExtras(cb.id);

  // === CHICKEN BUFFALO ===
  const chbuf = await prisma.product.create({
    data: { categoryId: hamburguesas.id, name: 'Chicken Buffalo', description: 'Pan brioche, pollo crispy, queso cheddar, mayo especial, cebolla, lechuga, salsa buffalo, salsa BBQ', basePrice: 10 },
  });
  for (const n of ['Pollo Crispy', 'Queso Cheddar', 'Mayo Especial', 'Cebolla', 'Lechuga', 'Salsa Buffalo', 'Salsa BBQ']) {
    await prisma.defaultIngredient.create({ data: { productId: chbuf.id, name: n } });
  }
  await addExtras(chbuf.id);

  // === CLÁSICA ===
  const clasica = await prisma.product.create({
    data: { categoryId: hamburguesas.id, name: 'Clásica', description: 'Pan brioche, doble tocineta, queso cheddar, lechuga, tomate, cebolla, pepinillos, salsa mil islas', basePrice: 11, hasVariation: true },
  });
  await prisma.productVariation.createMany({ data: [{ productId: clasica.id, name: '150gr de Carne', additionalPrice: 0 }, { productId: clasica.id, name: 'Pollo Crispy', additionalPrice: 0 }] });
  for (const n of ['Doble Tocineta', 'Queso Cheddar', 'Lechuga', 'Tomate', 'Cebolla', 'Pepinillos', 'Salsa Mil Islas']) {
    await prisma.defaultIngredient.create({ data: { productId: clasica.id, name: n } });
  }
  await addExtras(clasica.id);

  // === CESAR BURGER ===
  const cesar = await prisma.product.create({
    data: { categoryId: hamburguesas.id, name: 'Cesar Burger', description: 'Pan brioche, ensalada cesar, aderezo cesar, triple tocineta crispy, parmesano', basePrice: 11, hasVariation: true },
  });
  await prisma.productVariation.createMany({ data: [{ productId: cesar.id, name: 'Pollo 120gr a la Plancha', additionalPrice: 0 }, { productId: cesar.id, name: 'Crispy', additionalPrice: 0 }] });
  for (const n of ['Ensalada Cesar', 'Aderezo Cesar', 'Triple Tocineta Crispy', 'Parmesano']) {
    await prisma.defaultIngredient.create({ data: { productId: cesar.id, name: n } });
  }
  await addExtras(cesar.id);
  await prisma.extraIngredient.create({ data: { productId: cesar.id, name: 'Aceitunas Negras', basePrice: 0.5 } });

  // === PARRILLERA ===
  const parri = await prisma.product.create({
    data: { categoryId: hamburguesas.id, name: 'Parrillera', description: 'Pan brioche, 150gr de lomito ahumado y chorizo (Montserratina), ensaladilla cole slaw o lechuga grillada, BBQ, aderezo cowboy, salsa de ajo', basePrice: 11, hasVariation: true },
  });
  await prisma.productVariation.createMany({ data: [{ productId: parri.id, name: 'Ensaladilla Cole Slaw', additionalPrice: 0 }, { productId: parri.id, name: 'Lechuga Grillada', additionalPrice: 0 }] });
  for (const n of ['Lomito Ahumado', 'Chorizo Montserratina', 'BBQ', 'Aderezo Cowboy', 'Salsa de Ajo']) {
    await prisma.defaultIngredient.create({ data: { productId: parri.id, name: n } });
  }
  await addExtras(parri.id);

  // === PORTOBELLO ===
  const porto = await prisma.product.create({
    data: { categoryId: hamburguesas.id, name: 'Portobello', description: 'Pan brioche, doble queso mozzarella, champiñones en salsa portobello, trozos de tocineta, cebolla salteada', basePrice: 11, hasVariation: true },
  });
  await prisma.productVariation.createMany({ data: [{ productId: porto.id, name: '150gr de Carne', additionalPrice: 0 }, { productId: porto.id, name: 'Pollo Crispy', additionalPrice: 0 }] });
  for (const n of ['Doble Queso Mozzarella', 'Champiñones en Salsa Portobello', 'Trozos de Tocineta', 'Cebolla Salteada']) {
    await prisma.defaultIngredient.create({ data: { productId: porto.id, name: n } });
  }
  await addExtras(porto.id);

  // === BACON CHEESE ===
  const bc = await prisma.product.create({
    data: { categoryId: hamburguesas.id, name: 'Bacon Cheese', description: 'Pan brioche, doble queso cheddar, doble tocineta, pepinillos, aros de cebolla crispy, salsa BBQ, salsa ahumada', basePrice: 11, hasVariation: true },
  });
  await prisma.productVariation.createMany({ data: [{ productId: bc.id, name: '150gr de Carne', additionalPrice: 0 }, { productId: bc.id, name: 'Pollo Crispy', additionalPrice: 0 }] });
  for (const n of ['Doble Queso Cheddar', 'Doble Tocineta', 'Pepinillos', 'Aros de Cebolla Crispy', 'Salsa BBQ', 'Salsa Ahumada']) {
    await prisma.defaultIngredient.create({ data: { productId: bc.id, name: n } });
  }
  await addExtras(bc.id);

  // === CALLEJERA ===
  const calle = await prisma.product.create({
    data: { categoryId: hamburguesas.id, name: 'Callejera', description: 'Pan brioche, chuleta, huevo, queso cheddar, papitas, maíz, lechuga, cebolla, salsa de ajo y tradicionales', basePrice: 12, hasVariation: true },
  });
  await prisma.productVariation.createMany({ data: [{ productId: calle.id, name: '120gr de Carne', additionalPrice: 0 }, { productId: calle.id, name: 'Pollo Crispy', additionalPrice: 0 }] });
  for (const n of ['Chuleta', 'Huevo', 'Queso Cheddar', 'Papitas', 'Maíz', 'Lechuga', 'Cebolla', 'Salsa de Ajo', 'Salsa Tradicional']) {
    await prisma.defaultIngredient.create({ data: { productId: calle.id, name: n } });
  }
  await addExtras(calle.id);

  // === BEBIDAS ===
  await prisma.product.create({ data: { categoryId: bebidas.id, name: 'Refresco 1.5LT', description: 'Refresco de 1.5 litros para compartir', basePrice: 2.5 } });
  await prisma.product.create({ data: { categoryId: bebidas.id, name: 'Jarra Nestea de Durazno', description: 'Refrescante jarra de Nestea sabor durazno', basePrice: 3 } });

  const jugo = await prisma.product.create({ data: { categoryId: bebidas.id, name: 'Jarra de Jugo', description: 'Jarra de jugo natural', basePrice: 3.5 } });
  await prisma.requiredSelection.create({
    data: { productId: jugo.id, label: 'Elige el sabor', maxSelections: 1, options: { create: [{ name: 'Parchita' }, { name: 'Papelón' }, { name: 'Guanábana' }, { name: 'Piña' }, { name: 'Fresa' }, { name: 'Mora' }, { name: 'Durazno' }] } },
  });

  const paletas = await prisma.product.create({ data: { categoryId: postres.id, name: 'Paletas', description: 'Paleta artesanal', basePrice: 1.5 } });
  await prisma.requiredSelection.create({
    data: { productId: paletas.id, label: 'Elige el sabor', maxSelections: 1, options: { create: [{ name: 'Toddy' }, { name: 'Ovomaltina' }] } },
  });

  console.log('Seed completed!');
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
