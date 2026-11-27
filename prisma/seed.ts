import 'dotenv/config';
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

  // Fotos de Cloudinary: se rellenan solo donde imageUrl falte (nunca se pisa
  // una foto subida desde el panel de admin). Los public_id usan los UUID de
  // una BD anterior, así que el vínculo es por nombre de producto.
  const CLOUD = 'https://res.cloudinary.com/d5uayasf/image/upload';
  const BURGER = `${CLOUD}/v1785945923/burger-pos/product-26d05aff-081b-43b1-8bef-791632deb565.jpg`;
  const CLOUD_IMAGES: Record<string, string> = {
    'Alitas Chill': `${CLOUD}/v1785945931/burger-pos/product-be0cfdd7-7c98-4bfd-86b6-bec782fe04c3.jpg`,
    'Cheese Burger': BURGER,
    'Chicken Buffalo': BURGER,
    'Clásica': BURGER,
    'Cesar Burger': BURGER,
    'Parrillera': BURGER,
    'Portobello': BURGER,
    'Bacon Cheese': BURGER,
    'Callejera': BURGER,
    'Refresco 1.5LT': `${CLOUD}/v1785945929/burger-pos/product-b392b51d-e0bf-49eb-b9be-0eb585c2edd6.png`,
    'Jarra Nestea de Durazno': `${CLOUD}/v1785945930/burger-pos/product-84f71a43-9eeb-42f2-8b65-66a37c043bef.jpg`,
    'Jarra de Jugo': `${CLOUD}/v1785945933/burger-pos/product-e241ee9e-2b89-4f44-a9d6-bbb79a3c74da.jpg`,
    'Paletas': `${CLOUD}/v1785945932/burger-pos/product-ee268c85-d5da-4ac2-aa57-3ce02b50fea7.jpg`,
  };
  for (const [name, imageUrl] of Object.entries(CLOUD_IMAGES)) {
    const filled = await prisma.product.updateMany({
      where: { name, imageUrl: null },
      data: { imageUrl },
    });
    if (filled.count > 0) console.log(`Image restored: ${name}`);
  }

  // ── Pizzas y sushi (menú aprobado el 27-11-2026). Se crean UNA vez: si la
  // categoría ya existe no se toca nada (lo que se edite o borre en el admin se respeta).
  const MENU_ADDITIONS: {
    name: string;
    order: number;
    products: { name: string; description: string; price: number; allergens: string[]; ingredients: string[] }[];
    extras: { name: string; basePrice: number }[];
  }[] = [
    {
      name: 'PIZZAS',
      order: 3,
      products: [
        { name: 'Margarita', description: 'Salsa de tomate, mozzarella, albahaca fresca y aceite de oliva. 8 porciones', price: 9, allergens: ['Gluten', 'Lácteos'], ingredients: ['Salsa de Tomate', 'Mozzarella', 'Albahaca', 'Aceite de Oliva'] },
        { name: 'Pepperoni', description: 'Salsa de tomate, mozzarella y pepperoni. 8 porciones', price: 11, allergens: ['Gluten', 'Lácteos'], ingredients: ['Salsa de Tomate', 'Mozzarella', 'Pepperoni'] },
        { name: 'Cuatro Quesos', description: 'Mozzarella, parmesano, queso azul y queso blanco. 8 porciones', price: 12, allergens: ['Gluten', 'Lácteos'], ingredients: ['Mozzarella', 'Parmesano', 'Queso Azul', 'Queso Blanco'] },
        { name: 'Hawaiana', description: 'Salsa de tomate, mozzarella, jamón y piña. 8 porciones', price: 11, allergens: ['Gluten', 'Lácteos'], ingredients: ['Salsa de Tomate', 'Mozzarella', 'Jamón', 'Piña'] },
        { name: 'Criolla', description: 'Salsa de tomate, mozzarella, jamón, tocineta, maíz, cebolla y pimentón. 8 porciones', price: 12, allergens: ['Gluten', 'Lácteos'], ingredients: ['Salsa de Tomate', 'Mozzarella', 'Jamón', 'Tocineta', 'Maíz', 'Cebolla', 'Pimentón'] },
      ],
      extras: [
        { name: 'Extra Queso', basePrice: 1.5 },
        { name: 'Pepperoni', basePrice: 1.5 },
        { name: 'Champiñones', basePrice: 1 },
        { name: 'Tocineta', basePrice: 1.5 },
        { name: 'Aceitunas', basePrice: 1 },
      ],
    },
    {
      name: 'SUSHI',
      order: 4,
      products: [
        { name: 'California Roll', description: 'Kanikama, aguacate, pepino y ajonjolí. 10 piezas', price: 10, allergens: ['Pescado', 'Gluten', 'Huevo', 'Soya', 'Sésamo'], ingredients: ['Kanikama', 'Aguacate', 'Pepino', 'Ajonjolí'] },
        { name: 'Philadelphia Roll', description: 'Salmón, queso crema y aguacate. 10 piezas', price: 12, allergens: ['Pescado', 'Lácteos', 'Soya'], ingredients: ['Salmón', 'Queso Crema', 'Aguacate'] },
        { name: 'Ebi Tempura Roll', description: 'Langostino tempura, queso crema, aguacate y salsa anguila. 10 piezas', price: 13, allergens: ['Mariscos', 'Gluten', 'Lácteos', 'Huevo', 'Soya'], ingredients: ['Langostino Tempura', 'Queso Crema', 'Aguacate', 'Salsa Anguila'] },
        { name: 'Spicy Tuna Roll', description: 'Atún, mayonesa picante, cebollín y ajonjolí. 10 piezas', price: 12, allergens: ['Pescado', 'Huevo', 'Soya', 'Sésamo', 'Picante'], ingredients: ['Atún', 'Mayonesa Picante', 'Cebollín', 'Ajonjolí'] },
        { name: 'Roll Criollo', description: 'Plátano maduro frito, salmón, queso crema y tocineta. 10 piezas', price: 12, allergens: ['Pescado', 'Lácteos', 'Soya'], ingredients: ['Plátano Maduro', 'Salmón', 'Queso Crema', 'Tocineta'] },
      ],
      extras: [
        { name: 'Queso Crema', basePrice: 1 },
        { name: 'Salsa Anguila', basePrice: 0.5 },
        { name: 'Topping Tempura', basePrice: 1 },
      ],
    },
  ];
  if ((await prisma.category.count()) > 0) {
    for (const cat of MENU_ADDITIONS) {
      if (await prisma.category.findFirst({ where: { name: cat.name } })) continue;
      // pizzas y sushi van después de las hamburguesas; bebidas y postres al final
      await prisma.category.updateMany({ where: { name: 'BEBIDAS', displayOrder: { lt: 5 } }, data: { displayOrder: 5 } });
      await prisma.category.updateMany({ where: { name: 'POSTRES', displayOrder: { lt: 6 } }, data: { displayOrder: 6 } });
      const c = await prisma.category.create({ data: { name: cat.name, displayOrder: cat.order } });
      for (const p of cat.products) {
        await prisma.product.create({
          data: {
            categoryId: c.id,
            name: p.name,
            description: p.description,
            basePrice: p.price,
            allergens: p.allergens,
            defaultIngredients: { create: p.ingredients.map((name) => ({ name })) },
            extraIngredients: { create: cat.extras.filter((e) => e.name !== p.name).map((e) => ({ name: e.name, basePrice: e.basePrice })) },
          },
        });
      }
      console.log(`Menu: added ${cat.name} (${cat.products.length} products)`);
    }
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
