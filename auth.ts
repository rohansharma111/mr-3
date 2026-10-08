import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const credentialsSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(128)
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  pages: {
    signIn: "/login"
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() }
        });

        if (!user?.isActive || !user.passwordHash) return null;

        const passwordValid = await bcrypt.compare(
          parsed.data.password,
          user.passwordHash
        );

        if (!passwordValid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        };
      }
    })
  ],
  events: {
    async signIn({ user }) {
      if (!user.id) return;
      try {
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: "SIGN_IN",
            entityType: "AUTH",
            metadata: { provider: "credentials" }
          }
        });
      } catch {
        // Authentication should not fail because an audit write failed.
      }
    },
    async signOut(message) {
      const userId = "token" in message ? message.token?.sub : undefined;
      if (!userId) return;
      try {
        await prisma.auditLog.create({
          data: {
            userId,
            action: "SIGN_OUT",
            entityType: "AUTH",
            metadata: { provider: "credentials" }
          }
        });
      } catch {
        // Authentication should not fail because an audit write failed.
      }
    }
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.role = typeof token.role === "string" ? token.role : "FIELD_MANAGER";
      }
      return session;
    }
  }
});
