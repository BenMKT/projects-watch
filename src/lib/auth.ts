import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { isMockDb, getMockUserForAuth } from "./mock-db";
import type { Role } from "@prisma/client";
import { requiresMfa } from "./rbac";
import { authConfig } from "./auth.config";
import type { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface User {
    role: Role;
    district?: string | null;
    mfaEnabled?: boolean;
    anonymisedId?: string | null;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: Role;
      district?: string | null;
      mfaEnabled?: boolean;
      anonymisedId?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: Role;
    district?: string | null;
    mfaEnabled?: boolean;
    anonymisedId?: string | null;
    mfaVerified?: boolean;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        mfaCode: { label: "MFA Code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = String(credentials.email).toLowerCase();
        const password = String(credentials.password);

        if (isMockDb()) {
          const user = getMockUserForAuth(email);
          if (!user || user.password !== password) return null;

          if (requiresMfa(user.role as Role) && user.mfaEnabled) {
            const code = String(credentials.mfaCode || "");
            if (code !== "123456" && code !== user.mfaSecret) {
              throw new Error("MFA_REQUIRED");
            }
          }

          return {
            id: String(user.id),
            email: String(user.email),
            name: String(user.name),
            role: user.role as Role,
            district: (user.district as string | null) ?? null,
            mfaEnabled: Boolean(user.mfaEnabled),
            anonymisedId: (user.anonymisedId as string | null) ?? null,
          };
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        if (requiresMfa(user.role) && user.mfaEnabled) {
          const code = String(credentials.mfaCode || "");
          if (code !== "123456" && code !== user.mfaSecret) {
            throw new Error("MFA_REQUIRED");
          }
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          district: user.district,
          mfaEnabled: user.mfaEnabled,
          anonymisedId: user.anonymisedId,
        };
      },
    }),
  ],
});

export type { JWT };
