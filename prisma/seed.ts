import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.orderItemSelection.deleteMany();
  await prisma.orderItemAddedExtra.deleteMany();
  await prisma.orderItemRemovedIngredient.deleteMany();
  await prisma.orderItemVariation.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.requiredSelectionOption.deleteMany();
  await prisma.requiredSelection.deleteMany();
  await prisma.extraIngredient.deleteMany();
  await prisma.defaultIngredient.deleteMany();
  await prisma.productVariation.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();

  // Categories
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

  // ============ ENTRADAS ============
  const alitas = await prisma.product.create({
    data: {
      categoryId: entradas.id,
      name: 'Alitas Chill',
      description: '12 piezas de alitas acompañadas de papas con queso cheddar y topping de tocineta',
      basePrice: 8.5,
      hasVariation: false,
    },
  });

  await prisma.requiredSelection.create({
    data: {
      productId: alitas.id,
      label: 'Salsas extras de preferencia',
      maxSelections: 3,
      options: {
        create: [
          { name: 'Salsa de ajo' },
          { name: 'Salsa Buffalo' },
          { name: 'BBQ' },
          { name: 'Mostaza miel' },
        ],
      },
    },
  });

  // ============ HAMBURGUESAS ============
  const commonExtras = [
    { name: 'Queso Cheddar', basePrice: 1.0 },
    { name: 'Tocino', basePrice: 1.0 },
    { name: 'Doble Carne', basePrice: 2.0 },
    { name: 'Cebolla Grillada', basePrice: 0.5 },
    { name: 'Aros de Cebolla', basePrice: 1.5 },
  ];

  // Cheese Burger
  const cheeseBurger = await prisma.product.create({
    data: {
      categoryId: hamburguesas.id,
      name: 'Cheese Burger',
      description: 'Pan brioche, 120gr de carne, queso cheddar, cebollas caramelizadas, doble pepinillo, salsa mil islas',
      basePrice: 9.5,
      hasVariation: false,
    },
  });

  await prisma.defaultIngredient.createMany({
    data: [
      { productId: cheeseBurger.id, name: 'Queso Cheddar' },
      { productId: cheeseBurger.id, name: 'Cebollas Caramelizadas' },
      { productId: cheeseBurger.id, name: 'Doble Pepinillo' },
      { productId: cheeseBurger.id, name: 'Salsa Mil Islas' },
    ],
  });

  await prisma.extraIngredient.createMany({
    data: commonExtras.map((e) => ({ ...e, productId: cheeseBurger.id })),
  });

  // Chicken Buffalo
  const chickenBuffalo = await prisma.product.create({
    data: {
      categoryId: hamburguesas.id,
      name: 'Chicken Buffalo',
      description: 'Pan brioche, pollo crispy, queso cheddar, mayo especial, cebolla, lechuga, salsa buffalo, salsa BBQ',
      basePrice: 10,
      hasVariation: false,
    },
  });

  await prisma.defaultIngredient.createMany({
    data: [
      { productId: chickenBuffalo.id, name: 'Pollo Crispy' },
      { productId: chickenBuffalo.id, name: 'Queso Cheddar' },
      { productId: chickenBuffalo.id, name: 'Mayo Especial' },
      { productId: chickenBuffalo.id, name: 'Cebolla' },
      { productId: chickenBuffalo.id, name: 'Lechuga' },
      { productId: chickenBuffalo.id, name: 'Salsa Buffalo' },
      { productId: chickenBuffalo.id, name: 'Salsa BBQ' },
    ],
  });

  await prisma.extraIngredient.createMany({
    data: commonExtras.map((e) => ({ ...e, productId: chickenBuffalo.id })),
  });

  // Clásica
  const clasica = await prisma.product.create({
    data: {
      categoryId: hamburguesas.id,
      name: 'Clásica',
      description: 'Pan brioche, doble tocineta, queso cheddar, lechuga, tomate, cebolla, pepinillos, salsa mil islas',
      basePrice: 11,
      hasVariation: true,
    },
  });

  await prisma.productVariation.createMany({
    data: [
      { productId: clasica.id, name: '150gr de Carne', additionalPrice: 0 },
      { productId: clasica.id, name: 'Pollo Crispy', additionalPrice: 0 },
    ],
  });

  await prisma.defaultIngredient.createMany({
    data: [
      { productId: clasica.id, name: 'Doble Tocineta' },
      { productId: clasica.id, name: 'Queso Cheddar' },
      { productId: clasica.id, name: 'Lechuga' },
      { productId: clasica.id, name: 'Tomate' },
      { productId: clasica.id, name: 'Cebolla' },
      { productId: clasica.id, name: 'Pepinillos' },
      { productId: clasica.id, name: 'Salsa Mil Islas' },
    ],
  });

  await prisma.extraIngredient.createMany({
    data: commonExtras.map((e) => ({ ...e, productId: clasica.id })),
  });

  // Cesar Burger
  const cesar = await prisma.product.create({
    data: {
      categoryId: hamburguesas.id,
      name: 'Cesar Burger',
      description: 'Pan brioche, ensalada cesar, aderezo cesar, triple tocineta crispy, parmesano',
      basePrice: 11,
      hasVariation: true,
    },
  });

  await prisma.productVariation.createMany({
    data: [
      { productId: cesar.id, name: 'Pollo 120gr a la Plancha', additionalPrice: 0 },
      { productId: cesar.id, name: 'Crispy', additionalPrice: 0 },
    ],
  });

  await prisma.defaultIngredient.createMany({
    data: [
      { productId: cesar.id, name: 'Ensalada Cesar' },
      { productId: cesar.id, name: 'Aderezo Cesar' },
      { productId: cesar.id, name: 'Triple Tocineta Crispy' },
      { productId: cesar.id, name: 'Parmesano' },
    ],
  });

  await prisma.extraIngredient.createMany({
    data: [
      ...commonExtras.map((e) => ({ ...e, productId: cesar.id })),
      { name: 'Aceitunas Negras', basePrice: 0.5, productId: cesar.id },
    ],
  });

  // Parrillera
  const parrillera = await prisma.product.create({
    data: {
      categoryId: hamburguesas.id,
      name: 'Parrillera',
      description: 'Pan brioche, 150gr de lomito ahumado y chorizo (Montserratina), ensaladilla cole slaw o lechuga grillada, BBQ, aderezo cowboy, salsa de ajo',
      basePrice: 11,
      hasVariation: true,
    },
  });

  await prisma.productVariation.createMany({
    data: [
      { productId: parrillera.id, name: 'Ensaladilla Cole Slaw', additionalPrice: 0 },
      { productId: parrillera.id, name: 'Lechuga Grillada', additionalPrice: 0 },
    ],
  });

  await prisma.defaultIngredient.createMany({
    data: [
      { productId: parrillera.id, name: 'Lomito Ahumado' },
      { productId: parrillera.id, name: 'Chorizo Montserratina' },
      { productId: parrillera.id, name: 'BBQ' },
      { productId: parrillera.id, name: 'Aderezo Cowboy' },
      { productId: parrillera.id, name: 'Salsa de Ajo' },
    ],
  });

  await prisma.extraIngredient.createMany({
    data: commonExtras.map((e) => ({ ...e, productId: parrillera.id })),
  });

  // Portobello
  const portobello = await prisma.product.create({
    data: {
      categoryId: hamburguesas.id,
      name: 'Portobello',
      description: 'Pan brioche, doble queso mozzarella, champiñones en salsa portobello, trozos de tocineta, cebolla salteada',
      basePrice: 11,
      hasVariation: true,
    },
  });

  await prisma.productVariation.createMany({
    data: [
      { productId: portobello.id, name: '150gr de Carne', additionalPrice: 0 },
      { productId: portobello.id, name: 'Pollo Crispy', additionalPrice: 0 },
    ],
  });

  await prisma.defaultIngredient.createMany({
    data: [
      { productId: portobello.id, name: 'Doble Queso Mozzarella' },
      { productId: portobello.id, name: 'Champiñones en Salsa Portobello' },
      { productId: portobello.id, name: 'Trozos de Tocineta' },
      { productId: portobello.id, name: 'Cebolla Salteada' },
    ],
  });

  await prisma.extraIngredient.createMany({
    data: commonExtras.map((e) => ({ ...e, productId: portobello.id })),
  });

  // Bacon Cheese
  const baconCheese = await prisma.product.create({
    data: {
      categoryId: hamburguesas.id,
      name: 'Bacon Cheese',
      description: 'Pan brioche, doble queso cheddar, doble tocineta, pepinillos, aros de cebolla crispy, salsa BBQ, salsa ahumada',
      basePrice: 11,
      hasVariation: true,
    },
  });

  await prisma.productVariation.createMany({
    data: [
      { productId: baconCheese.id, name: '150gr de Carne', additionalPrice: 0 },
      { productId: baconCheese.id, name: 'Pollo Crispy', additionalPrice: 0 },
    ],
  });

  await prisma.defaultIngredient.createMany({
    data: [
      { productId: baconCheese.id, name: 'Doble Queso Cheddar' },
      { productId: baconCheese.id, name: 'Doble Tocineta' },
      { productId: baconCheese.id, name: 'Pepinillos' },
      { productId: baconCheese.id, name: 'Aros de Cebolla Crispy' },
      { productId: baconCheese.id, name: 'Salsa BBQ' },
      { productId: baconCheese.id, name: 'Salsa Ahumada' },
    ],
  });

  await prisma.extraIngredient.createMany({
    data: commonExtras.map((e) => ({ ...e, productId: baconCheese.id })),
  });

  // Callejera
  const callejera = await prisma.product.create({
    data: {
      categoryId: hamburguesas.id,
      name: 'Callejera',
      description: 'Pan brioche, chuleta, huevo, queso cheddar, papitas, maíz, lechuga, cebolla, salsa de ajo y tradicionales',
      basePrice: 12,
      hasVariation: true,
    },
  });

  await prisma.productVariation.createMany({
    data: [
      { productId: callejera.id, name: '120gr de Carne', additionalPrice: 0 },
      { productId: callejera.id, name: 'Pollo Crispy', additionalPrice: 0 },
    ],
  });

  await prisma.defaultIngredient.createMany({
    data: [
      { productId: callejera.id, name: 'Chuleta' },
      { productId: callejera.id, name: 'Huevo' },
      { productId: callejera.id, name: 'Queso Cheddar' },
      { productId: callejera.id, name: 'Papitas' },
      { productId: callejera.id, name: 'Maíz' },
      { productId: callejera.id, name: 'Lechuga' },
      { productId: callejera.id, name: 'Cebolla' },
      { productId: callejera.id, name: 'Salsa de Ajo' },
      { productId: callejera.id, name: 'Salsa Tradicional' },
    ],
  });

  await prisma.extraIngredient.createMany({
    data: commonExtras.map((e) => ({ ...e, productId: callejera.id })),
  });

  // ============ BEBIDAS ============
  await prisma.product.create({
    data: {
      categoryId: bebidas.id,
      name: 'Refresco 1.5LT',
      description: 'Refresco de 1.5 litros para compartir',
      basePrice: 2.5,
      hasVariation: false,
    },
  });

  await prisma.product.create({
    data: {
      categoryId: bebidas.id,
      name: 'Jarra Nestea de Durazno',
      description: 'Refrescante jarra de Nestea sabor durazno',
      basePrice: 3,
      hasVariation: false,
    },
  });

  const jugo = await prisma.product.create({
    data: {
      categoryId: bebidas.id,
      name: 'Jarra de Jugo',
      description: 'Jarra de jugo natural',
      basePrice: 3.5,
      hasVariation: false,
    },
  });

  await prisma.requiredSelection.create({
    data: {
      productId: jugo.id,
      label: 'Elige el sabor',
      maxSelections: 1,
      options: {
        create: [
          { name: 'Parchita' },
          { name: 'Papelón' },
          { name: 'Guanábana' },
          { name: 'Piña' },
          { name: 'Fresa' },
          { name: 'Mora' },
          { name: 'Durazno' },
        ],
      },
    },
  });

  // ============ POSTRES ============
  const paletas = await prisma.product.create({
    data: {
      categoryId: postres.id,
      name: 'Paletas',
      description: 'Paleta artesanal',
      basePrice: 1.5,
      hasVariation: false,
    },
  });

  await prisma.requiredSelection.create({
    data: {
      productId: paletas.id,
      label: 'Elige el sabor',
      maxSelections: 1,
      options: {
        create: [
          { name: 'Toddy' },
          { name: 'Ovomaltina' },
        ],
      },
    },
  });

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
