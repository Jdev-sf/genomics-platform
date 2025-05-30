// scripts/cleanup-guest-users.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupGuestUsers() {
  try {
    console.log('Starting guest user cleanup...');

    // Delete guest users older than 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const result = await prisma.user.deleteMany({
      where: {
        email: {
          startsWith: 'guest_',
          endsWith: '@guest.local'
        },
        createdAt: {
          lt: oneDayAgo
        }
      }
    });

    console.log(`Cleaned up ${result.count} guest users`);

    // Clean up orphaned sessions that have no associated user
    const orphanedSessions = await prisma.session.findMany({
      where: {
        user: {
          email: {
            startsWith: 'guest_',
            endsWith: '@guest.local'
          },
          createdAt: {
            lt: oneDayAgo
          }
        }
      }
    });

    if (orphanedSessions.length > 0) {
      await prisma.session.deleteMany({
        where: {
          id: {
            in: orphanedSessions.map(s => s.id)
          }
        }
      });
      console.log(`Cleaned up ${orphanedSessions.length} orphaned sessions`);
    }

    console.log('Guest user cleanup completed successfully');

  } catch (error) {
    console.error('Error during guest user cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  cleanupGuestUsers()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { cleanupGuestUsers };