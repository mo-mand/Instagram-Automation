import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create default AppConfig
  await prisma.appConfig.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      targetPageId: process.env.INSTAGRAM_ACCOUNT_ID || '',
      maxPostsPerDay: 3,
      timezone: process.env.TIMEZONE || 'America/Toronto',
    },
  });

  console.log('Seed complete: AppConfig created');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
