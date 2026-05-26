import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import { env } from "@/lib/env";

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: {
    allowedHosts: [
      "localhost",
      "127.0.0.1",
      ...(env.BETTER_AUTH_EXTRA_HOSTS
        ? env.BETTER_AUTH_EXTRA_HOSTS.split(",").map((h) => h.trim()).filter(Boolean)
        : []),
    ],
    fallback: env.BETTER_AUTH_URL,
    protocol: "http",
  },
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    // Owner-only signup is enforced at the UI/server-action layer.
    // Better Auth itself allows sign-up; we gate access via role.
    minPasswordLength: 6,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "cashier",
        input: false, // never settable from the public sign-up endpoint
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh once per day
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },
  plugins: [nextCookies()],
});

export type Auth = typeof auth;
export type Session = typeof auth.$Infer.Session;
