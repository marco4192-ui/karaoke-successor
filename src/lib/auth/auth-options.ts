// NextAuth.js Options
// Complete authentication configuration with all OAuth providers

import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import DiscordProvider from 'next-auth/providers/discord';
import TwitchProvider from 'next-auth/providers/twitch';
import TwitterProvider from 'next-auth/providers/twitter';
import AzureADProvider from 'next-auth/providers/azure-ad';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { db } from '@/lib/db';
import { validatePassword, authConfig } from './index';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db) as NextAuthOptions['adapter'],

  providers: [
    // Email/Password Authentication
    CredentialsProvider({
      id: 'credentials',
      name: 'Email & Password',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'your@email.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
          include: { player: true },
        });

        if (!user || !user.password) {
          throw new Error('Invalid email or password');
        }

        // Check email verification
        if (authConfig.email.requireVerification && !user.emailVerified) {
          throw new Error('Please verify your email address first');
        }

        // Verify password
        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) {
          throw new Error('Invalid email or password');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name || user.player?.name || 'Singer',
          image: user.image || user.player?.avatar,
        };
      },
    }),

    // Google OAuth
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),

    // GitHub OAuth
    ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
      ? [
          GitHubProvider({
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),

    // Discord OAuth
    ...(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET
      ? [
          DiscordProvider({
            clientId: process.env.DISCORD_CLIENT_ID,
            clientSecret: process.env.DISCORD_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),

    // Twitch OAuth
    ...(process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET
      ? [
          TwitchProvider({
            clientId: process.env.TWITCH_CLIENT_ID,
            clientSecret: process.env.TWITCH_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),

    // Twitter/X OAuth
    ...(process.env.TWITTER_CLIENT_ID && process.env.TWITTER_CLIENT_SECRET
      ? [
          TwitterProvider({
            clientId: process.env.TWITTER_CLIENT_ID,
            clientSecret: process.env.TWITTER_CLIENT_SECRET,
            version: '2.0', // Use OAuth 2.0
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),

    // Microsoft/Azure AD OAuth
    ...(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET
      ? [
          AzureADProvider({
            clientId: process.env.MICROSOFT_CLIENT_ID,
            clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
            tenantId: 'common', // Allow personal and work accounts
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
  ],

  session: {
    strategy: 'jwt',
    maxAge: authConfig.session.maxAge,
    updateAge: authConfig.session.updateAge,
  },

  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
    verifyRequest: '/auth/verify',
    newUser: '/auth/welcome',
  },

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
      }

      // Update session
      if (trigger === 'update' && session) {
        token.name = session.name;
        token.picture = session.image;
      }

      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.image = token.picture as string;
      }

      // Fetch player data
      if (session.user?.id) {
        const player = await db.player.findUnique({
          where: { userId: session.user.id },
          select: {
            id: true,
            name: true,
            avatar: true,
            color: true,
            country: true,
            level: true,
            xp: true,
            syncCode: true,
          },
        });

        if (player) {
          (session.user as any).player = player;
        }
      }

      return session;
    },

    async signIn({ user, account, profile }) {
      // Allow all OAuth providers
      if (account?.provider !== 'credentials') {
        return true;
      }

      // For credentials, check email verification
      if (account?.provider === 'credentials') {
        const dbUser = await db.user.findUnique({
          where: { email: user.email?.toLowerCase() },
        });

        if (dbUser && !dbUser.emailVerified) {
          return false;
        }
      }

      return true;
    },
  },

  events: {
    async signIn({ user, isNewUser }) {
      // Create player profile for new users
      if (isNewUser && user.id) {
        const syncCode = generateSyncCode();
        await db.player.create({
          data: {
            userId: user.id,
            name: user.name || 'Singer',
            avatar: user.image,
            syncCode,
          },
        });
      }
    },
  },

  debug: process.env.NODE_ENV === 'development',
};

// Generate unique sync code
function generateSyncCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default authOptions;
