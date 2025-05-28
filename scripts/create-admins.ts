// scripts/create-admin.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    console.log('🔧 Creating admin user...');

    // First, ensure admin role exists
    let adminRole = await prisma.role.findUnique({
      where: { name: 'admin' }
    });

    if (!adminRole) {
      console.log('📝 Creating admin role...');
      adminRole = await prisma.role.create({
        data: {
          name: 'admin',
          description: 'Full system access',
          permissions: {
            users: ['create', 'read', 'update', 'delete'],
            genes: ['create', 'read', 'update', 'delete'],
            variants: ['create', 'read', 'update', 'delete'],
            annotations: ['create', 'read', 'update', 'delete'],
            reports: ['create', 'read', 'export'],
          },
        },
      });
    }

    // Check if admin user already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@genomics.local' }
    });

    if (existingAdmin) {
      console.log('✅ Admin user already exists!');
      console.log('📧 Email: admin@genomics.local');
      console.log('🔑 Password: admin123!');
      return;
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123!', 10);
    
    const admin = await prisma.user.create({
      data: {
        email: 'admin@genomics.local',
        passwordHash: hashedPassword,
        name: 'Admin User',
        roleId: adminRole.id,
        isActive: true,
        emailVerified: new Date(),
      },
    });

    console.log('✅ Admin user created successfully!');
    console.log('📧 Email: admin@genomics.local');
    console.log('🔑 Password: admin123!');
    console.log('🆔 User ID:', admin.id);

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();