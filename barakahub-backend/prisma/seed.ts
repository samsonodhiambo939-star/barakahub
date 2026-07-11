import { PrismaClient, MemberRole, Gender, MaritalStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const adminPassword = await bcrypt.hash('Admin@123', 12);

  const admin = await prisma.user.upsert({
    where: { phone: '254700000000' },
    update: {},
    create: {
      memberNo: 'CHC-0001',
      firstName: 'Super',
      lastName: 'Admin',
      phone: '254700000000',
      email: 'admin@barakahub.org',
      idNumber: '12345678',
      gender: Gender.male,
      maritalStatus: MaritalStatus.single,
      role: MemberRole.admin,
      passwordHash: adminPassword,
    },
  });

  console.log('Admin created:', admin.memberNo);

  // Create giving categories
  const categories = [
    { name: 'Tithe', description: 'Biblical tithe - 10% of income', sortOrder: 1 },
    { name: 'Offering', description: 'General offering', sortOrder: 2 },
    { name: 'Thanksgiving', description: 'Special thanksgiving', sortOrder: 3 },
    { name: 'Building Fund', description: 'Church building/construction fund', sortOrder: 4 },
    { name: 'Missions', description: 'Missionary support', sortOrder: 5 },
    { name: 'Welfare', description: 'Benevolence and member welfare', sortOrder: 6 },
  ];

  for (const cat of categories) {
    await prisma.givingCategory.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
  }

  console.log('Categories seeded');

  // Create sample member
  const memberPassword = await bcrypt.hash('Member@123', 12);

  const member = await prisma.user.upsert({
    where: { phone: '254711111111' },
    update: {},
    create: {
      memberNo: 'CHC-0002',
      firstName: 'Jane',
      lastName: 'Wanjiku',
      phone: '254711111111',
      email: 'jane@example.com',
      idNumber: '87654321',
      gender: Gender.female,
      dob: new Date('1995-06-15'),
      maritalStatus: MaritalStatus.married,
      physicalAddress: '123 River Road',
      estate: 'South B',
      role: MemberRole.member,
      passwordHash: memberPassword,
    },
  });

  console.log('Sample member created:', member.memberNo);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
