// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';

const handler = NextAuth({
  ...authConfig,
  useSecureCookies: process.env.NEXTAUTH_URL?.startsWith('https://') ?? false,
});

export { handler as GET, handler as POST };
