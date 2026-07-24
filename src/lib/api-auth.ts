import { NextResponse } from "next/server";
import { auth } from "./auth";
import { hasPermission, type Permission } from "./rbac";
import type { Role } from "@prisma/client";

export async function getSessionUser() {
  const session = await auth();
  return session?.user ?? null;
}

export async function requireAuth(permission?: Permission) {
  const user = await getSessionUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), user: null };
  }
  if (permission && !hasPermission(user.role as Role, permission)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), user: null };
  }
  return { error: null, user };
}
