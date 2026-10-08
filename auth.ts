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
        if (!parsed.success) {
          console.error("[AUTH DEBUG] invalid credential format");
          return null;
        }

        const email = parsed.data.email.toLowerCase();

        const user = await prisma.user.findUnique({
          where: { email }
        });

        if (!user) {
          console.error("[AUTH DEBUG] user not found", { email });
          return null;
        }

        if (!user.isActive) {
          console.error("[AUTH DEBUG] user inactive", { email });
          return null;
        }

        if (!user.passwordHash) {
          console.error("[AUTH DEBUG] password hash missing", { email });
          return null;
        }

        const passwordValid = await bcrypt.compare(
          parsed.data.password,
          user.passwordHash
        );

        if (!passwordValid) {
          console.error("[AUTH DEBUG] password mismatch", { email });
          return null;
        }

        console.info("[AUTH DEBUG] password verified", { email });

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
