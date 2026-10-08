import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { createHash } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const credentialsSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(128)
});

const LOGIN_WINDOW_MS = 15 * 60_000;
const LOGIN_MAX_ATTEMPTS = 10;

function loginRateLimitKey(email: string) {
  const digest = createHash("sha256").update(email).digest("hex");
  return `login:${digest}`;
}

async function consumeLoginAttempt(email: string) {
  const now = Date.now();
  const windowStart = new Date(Math.floor(now / LOGIN_WINDOW_MS) * LOGIN_WINDOW_MS);
  const expiresAt = new Date(windowStart.getTime() + LOGIN_WINDOW_MS);
  const key = loginRateLimitKey(email);

  const rows = await prisma.$queryRawUnsafe<Array<{ request_count: number }>>(
    `INSERT INTO "rate_limit_buckets"
      ("key", "window_start", "request_count", "expires_at", "updated_at")
     VALUES ($1, $2, 1, $3, NOW())
     ON CONFLICT ("key") DO UPDATE
       SET "request_count" = CASE
         WHEN "rate_limit_buckets"."window_start" = EXCLUDED."window_start"
           THEN "rate_limit_buckets"."request_count" + 1
         ELSE 1
       END,
       "window_start" = EXCLUDED."window_start",
       "expires_at" = EXCLUDED."expires_at",
       "updated_at" = NOW()
     RETURNING "request_count"`,
    key,
    windowStart,
    expiresAt
  );

  const requestCount = rows[0]?.request_count ?? LOGIN_MAX_ATTEMPTS + 1;

  return {
    allowed: requestCount <= LOGIN_MAX_ATTEMPTS,
    retryAfterSeconds: Math.max(1, Math.ceil((expiresAt.getTime() - now) / 1000))
  };
}

async function clearLoginAttempts(email: string) {
  await prisma.rateLimitBucket.delete({
    where: { key: loginRateLimitKey(email) }
  }).catch(() => undefined);
}

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

        const email = parsed.data.email.toLowerCase();

        try {
          const rateLimit = await consumeLoginAttempt(email);
          if (!rateLimit.allowed) return null;
        } catch {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email }
        });

        if (!user || !user.isActive || !user.passwordHash) {
          return null;
        }

        const passwordValid = await bcrypt.compare(
          parsed.data.password,
          user.passwordHash
        );

        if (!passwordValid) return null;

        try {
          await clearLoginAttempts(email);
        } catch {
          // A successful login should not be rejected because rate-limit cleanup failed.
        }

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
        session.user.role = typeof token.role === "string" ? token.role : "";
      }
      return session;
    }
  }
});
