import 'dotenv/config';
import { v2 as cloudinary } from 'cloudinary';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function main() {
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    console.log('Cloudinary not configured, skipping image migration.');
    return;
  }

  const products = await prisma.product.findMany({
    where: { imageUrl: { startsWith: 'data:image/' } },
    select: { id: true, name: true },
  });

  console.log(`Found ${products.length} products with base64 images.`);

  let migrated = 0;
  for (const p of products) {
    try {
      const product = await prisma.product.findUnique({
        where: { id: p.id },
        select: { imageUrl: true },
      });
      if (!product?.imageUrl) continue;

      const result = await cloudinary.uploader.upload(product.imageUrl, {
        folder: 'burger-pos',
        public_id: `product-${p.id}`,
        transformation: [{ width: 800, crop: 'limit', quality: 'auto:good', fetch_format: 'auto' }],
      });

      await prisma.product.update({
        where: { id: p.id },
        data: { imageUrl: result.secure_url },
      });
      migrated++;
      console.log(`Migrated: ${p.name} -> ${result.secure_url}`);
    } catch (error) {
      console.error(`Failed to migrate ${p.name}:`, error);
    }
  }

  console.log(`Migration complete. ${migrated}/${products.length} images migrated.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });