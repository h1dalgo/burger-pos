import pg from 'pg';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log('DATABASE_URL not set, skipping seed check');
    process.exit(0);
  }

  const pool = new pg.Pool({ connectionString: url });

  try {
    const result = await pool.query('SELECT COUNT(*) as count FROM categories');
    const count = parseInt(result.rows[0].count, 10);

    if (count === 0) {
      console.log('Database empty — seeding menu...');
      await pool.end();

      // Dynamically import and run seed via tsx
      const { execSync } = await import('child_process');
      execSync('npx tsx prisma/seed.ts', { stdio: 'inherit', env: process.env });
      console.log('Seed completed.');
    } else {
      console.log(`Database has ${count} categories, skipping seed.`);
      await pool.end();
    }
  } catch (err) {
    console.log('Could not check database (tables may not exist yet)');
    await pool.end();
  }
}

main().then(() => process.exit(0)).catch(() => process.exit(0));
