import bcrypt from 'bcryptjs';
import { prisma } from './prisma-optimized';

export async function createUser(
  email: string,
  password: string,
  name: string,
  roleName: string = 'viewer'
) {
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const role = await prisma.role.findUnique({
    where: { name: roleName },
  });

  if (!role) {
    throw new Error(`Role ${roleName} not found`);
  }

  return prisma.user.create({
    data: {
      email,
      passwordHash: hashedPassword,
      name,
      roleId: role.id,
    },
  });
}

export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    include: { role: true },
  });
}