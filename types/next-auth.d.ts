import { SessionUser } from '@/types';

declare module 'next-auth' {
  interface Session {
    user: SessionUser;
  }

  interface User extends SessionUser {}
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: {
      id: string;
      name: string;
      permissions: Record<string, string[]>;
    };
  }
}