import { createUser } from '../lib/user-utils';

async function createAdminUser() {
  try {
    const admin = await createUser(
      'admin@genomics.local',
      'admin123!',
      'Admin User',
      'admin'
    );
    
    console.log('✅ Admin user created:', admin.email);
    console.log('📧 Email: admin@genomics.local');
    console.log('🔑 Password: admin123!');
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
  process.exit(0);
}

createAdminUser();