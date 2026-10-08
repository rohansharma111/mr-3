import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const ROLES = {
  FIELD_MANAGER: "FIELD_MANAGER",
  AREA_MANAGER: "AREA_MANAGER",
  ADMIN: "ADMIN"
} as const;

export type AppRole = (typeof ROLES)[keyof typeof ROLES];

export async function getAuthenticatedUser() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) return null;

  return prisma.user.findFirst({
    where: { id: userId, isActive: true }
  });
}

export async function requireAuthenticatedUser() {
  const user = await getAuthenticatedUser();

  if (!user) {
    throw new Error("UNAUTHORIZED");
  }

  return user;
}

export function hasAnyRole(role: string, allowedRoles: readonly AppRole[]) {
  return allowedRoles.includes(role as AppRole);
}

export function hasRole(role: string, requiredRole: AppRole) {
  return role === requiredRole;
}

export function isManagementRole(role: string) {
  return hasAnyRole(role, [ROLES.AREA_MANAGER, ROLES.ADMIN]);
}
