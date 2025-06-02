import type { DefaultSession, DefaultUser } from 'next-auth';
import type { DefaultJWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: {
      id: string;
      role: {
        id: string;
        name: string;
        permissions: Record<string, string[]>;
        description?: string;
      };
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role?: string; // Stored as JSON string in auth flow
    emailVerified?: Date | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id: string;
    role: {
      id: string;
      name: string;
      permissions: Record<string, string[]>;
      description?: string;
    };
  }
}