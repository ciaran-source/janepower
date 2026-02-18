import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/login",
    newUser: "/auth/register",
  },
  providers: [
    // Google OAuth — only enabled if credentials are set
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
    // Email/password
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.partnerUser.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });
        if (!user || !user.passwordHash) return null;

        const valid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          partnerId: user.partnerId,
          emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // For Google sign-in, create or link user
      if (account?.provider === "google") {
        const existing = await prisma.partnerUser.findUnique({
          where: { email: user.email! },
        });
        if (!existing) {
          const newUser = await prisma.partnerUser.create({
            data: {
              name: user.name || "User",
              email: user.email!.toLowerCase(),
              role: "partner_user",
              emailVerifiedAt: new Date(), // Google emails are verified
              image: user.image,
            },
          });
          // Link account
          await prisma.account.create({
            data: {
              userId: newUser.id,
              type: account.type,
              provider: account.provider,
              providerAccountId: account.providerAccountId,
              access_token: account.access_token,
              refresh_token: account.refresh_token,
              expires_at: account.expires_at,
              token_type: account.token_type,
              scope: account.scope,
              id_token: account.id_token,
            },
          });
          (user as any).id = newUser.id;
          (user as any).role = newUser.role;
          (user as any).partnerId = newUser.partnerId;
          (user as any).emailVerifiedAt = newUser.emailVerifiedAt?.toISOString();
        } else {
          // Check if account link exists
          const existingAccount = await prisma.account.findFirst({
            where: {
              userId: existing.id,
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            },
          });
          if (!existingAccount) {
            await prisma.account.create({
              data: {
                userId: existing.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                access_token: account.access_token,
                refresh_token: account.refresh_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
              },
            });
          }
          // Ensure verified
          if (!existing.emailVerifiedAt) {
            await prisma.partnerUser.update({
              where: { id: existing.id },
              data: { emailVerifiedAt: new Date() },
            });
          }
          (user as any).id = existing.id;
          (user as any).role = existing.role;
          (user as any).partnerId = existing.partnerId;
          (user as any).emailVerifiedAt =
            existing.emailVerifiedAt?.toISOString() ?? new Date().toISOString();
        }
      }
      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
        token.partnerId = (user as any).partnerId;
        token.emailVerifiedAt = (user as any).emailVerifiedAt;
      }
      // Refresh partnerId from DB on each token refresh (in case claim was approved)
      if (token.id) {
        const dbUser = await prisma.partnerUser.findUnique({
          where: { id: token.id as string },
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.partnerId = dbUser.partnerId;
          token.emailVerifiedAt = dbUser.emailVerifiedAt?.toISOString() ?? null;
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).partnerId = token.partnerId;
        (session.user as any).emailVerifiedAt = token.emailVerifiedAt;
      }
      return session;
    },
  },
};
