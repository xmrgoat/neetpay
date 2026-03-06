import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12),
});

const loginAttempts = new Map<string, { count: number; blockedUntil: number }>();

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
    updateAge: 24 * 60 * 60, // refresh token every 24h
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email } = parsed.data;

        const attempts = loginAttempts.get(email);
        if (attempts && attempts.blockedUntil > Date.now()) {
          throw new Error("Too many login attempts. Try again later.");
        }

        const user = await db.user.findUnique({
          where: { email },
        });
        if (!user) return null;

        const valid = await compare(parsed.data.password, user.hashedPassword);
        if (!valid) {
          const current = loginAttempts.get(email) || { count: 0, blockedUntil: 0 };
          current.count++;
          if (current.count >= 10) {
            current.blockedUntil = Date.now() + 15 * 60 * 1000;
            current.count = 0;
          }
          loginAttempts.set(email, current);
          return null;
        }

        loginAttempts.delete(email);

        return {
          id: user.id,
          name: user.name,
          email: user.email,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
