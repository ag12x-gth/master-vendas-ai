// src/lib/auth.config.ts
import type { NextAuthOptions } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import type { Session, User, Account, Profile } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import FacebookProvider from 'next-auth/providers/facebook';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { db } from '@/lib/db';
import { users, companies } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      image?: string | null;
      role: 'admin' | 'atendente' | 'superadmin';
      companyId: string;
      hasGoogleLinked: boolean;
      hasFacebookLinked: boolean;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    image?: string | null;
    role: 'admin' | 'atendente' | 'superadmin';
    companyId: string;
    googleId?: string | null;
    facebookId?: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    role?: string;
    companyId?: string;
    googleId?: string | null;
    facebookId?: string | null;
    accessToken?: string;
  }
}

export const authConfig: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID || '',
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET || '',
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email e senha são obrigatórios');
        }

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, credentials.email.toLowerCase()))
          .limit(1);

        if (!user || !user.password) {
          throw new Error('Credenciais inválidas');
        }

        const isPasswordValid = await compare(
          credentials.password as string,
          user.password
        );

        if (!isPasswordValid) {
          throw new Error('Credenciais inválidas');
        }

        if (!user.emailVerified) {
          throw new Error('Email não verificado. Por favor, verifique seu email.');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatarUrl,
          role: user.role,
          companyId: user.companyId!,
          googleId: user.googleId,
          facebookId: user.facebookId,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }: { user: User; account: Account | null; profile?: Profile }) {
      if (!account) return false;

      if (account.provider === 'google' || account.provider === 'facebook') {
        const email = user.email?.toLowerCase();
        if (!email) return false;

        const providerId = account.provider === 'google' ? account.providerAccountId : account.providerAccountId;
        const accessToken = account.access_token;

        const [existingUser] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (existingUser) {
          const updates: any = {};
          
          if (account.provider === 'google') {
            updates.googleId = providerId;
            updates.googleAccessToken = accessToken;
          } else if (account.provider === 'facebook') {
            updates.facebookId = providerId;
            updates.facebookAccessToken = accessToken;
          }

          updates.avatarUrl = user.image || existingUser.avatarUrl;
          updates.emailVerified = new Date();

          await db
            .update(users)
            .set(updates)
            .where(eq(users.id, existingUser.id));

          user.id = existingUser.id;
          user.role = existingUser.role;
          user.companyId = existingUser.companyId!;
          user.googleId = account.provider === 'google' ? providerId : existingUser.googleId;
          user.facebookId = account.provider === 'facebook' ? providerId : existingUser.facebookId;
        } else {
          const [newCompany] = await db
            .insert(companies)
            .values({ name: `${user.name}'s Company` })
            .returning();

          if (!newCompany) {
            throw new Error('Falha ao criar empresa');
          }

          const newUserData: any = {
            name: user.name || 'User',
            email,
            avatarUrl: user.image,
            firebaseUid: `oauth_${Date.now()}_${Math.random()}`,
            role: 'admin' as const,
            companyId: newCompany.id,
            emailVerified: new Date(),
          };

          if (account.provider === 'google') {
            newUserData.googleId = providerId;
            newUserData.googleAccessToken = accessToken;
          } else if (account.provider === 'facebook') {
            newUserData.facebookId = providerId;
            newUserData.facebookAccessToken = accessToken;
          }

          const [createdUser] = await db
            .insert(users)
            .values(newUserData)
            .returning();

          if (!createdUser) {
            throw new Error('Falha ao criar usuário');
          }

          user.id = createdUser.id;
          user.role = createdUser.role;
          user.companyId = createdUser.companyId!;
          user.googleId = createdUser.googleId;
          user.facebookId = createdUser.facebookId;
        }
      }

      return true;
    },
    async jwt({ token, user, account }: { token: JWT; user?: User; account?: Account | null }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.companyId = user.companyId;
        token.googleId = user.googleId;
        token.facebookId = user.facebookId;
      }

      if (account?.access_token) {
        token.accessToken = account.access_token;
      }

      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as any;
        session.user.companyId = token.companyId as string;
        session.user.hasGoogleLinked = !!token.googleId;
        session.user.hasFacebookLinked = !!token.facebookId;
      }
      return session;
    },
    async redirect({ url, baseUrl }: { url: string; baseUrl: string }) {
      if (url.startsWith(baseUrl) && url.includes('callbackUrl')) {
        const urlParams = new URLSearchParams(url.split('?')[1]);
        const callbackUrl = urlParams.get('callbackUrl');
        if (callbackUrl) {
          return `${baseUrl}/api/auth/oauth-callback?redirect=${encodeURIComponent(callbackUrl)}`;
        }
      }
      
      if (url.startsWith('/')) {
        return `${baseUrl}/api/auth/oauth-callback?redirect=${encodeURIComponent(url)}`;
      }
      
      if (url.startsWith(baseUrl)) {
        return url;
      }
      
      return `${baseUrl}/api/auth/oauth-callback`;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60,
  },
};
