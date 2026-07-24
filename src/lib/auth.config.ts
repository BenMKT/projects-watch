import type { NextAuthConfig } from "next-auth";
import type { Role } from "@/types/roles";

export const authConfig = {
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isLoggedIn = !!auth?.user;

      if (pathname.startsWith("/admin")) {
        if (!isLoggedIn) return false;
        const role = auth.user?.role as Role | undefined;
        return !!role && ["SUPER_ADMIN", "DISTRICT_ADMIN", "PARLIAMENTARY"].includes(role);
      }

      if (pathname.startsWith("/officer")) {
        if (!isLoggedIn) return false;
        const role = auth.user?.role as Role | undefined;
        return !!role && ["SUPER_ADMIN", "DISTRICT_ADMIN", "FIELD_OFFICER"].includes(role);
      }

      if (pathname.startsWith("/account")) {
        return isLoggedIn;
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        const u = user as {
          id?: string;
          role?: Role;
          district?: string | null;
          mfaEnabled?: boolean;
          anonymisedId?: string | null;
        };
        token.id = u.id;
        token.role = u.role;
        token.district = u.district;
        token.mfaEnabled = u.mfaEnabled;
        token.anonymisedId = u.anonymisedId;
        token.mfaVerified = true;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.district = token.district as string | null | undefined;
        session.user.mfaEnabled = token.mfaEnabled as boolean | undefined;
        session.user.anonymisedId = token.anonymisedId as string | null | undefined;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
