import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const ROLES = {
  FIELD_MANAGER: "FIELD_MANAGER",
  AREA_MANAGER: "AREA_MANAGER",
  ADMIN: "ADMIN"
} as const;

export type AppRole = (typeof ROLES)[keyof typeof ROLES];
export const ALL_ROLES: readonly AppRole[] = Object.values(ROLES);

export async function getAuthenticatedUser() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) return null;

  const user = await prisma.user.findFirst({
    where: { id: userId, isActive: true }
  });

  if (!user || !hasAnyRole(user.role, ALL_ROLES)) {
    return null;
  }

  return user;
}

export async function requireAuthenticatedUser(
  allowedRoles?: readonly AppRole[]
) {
  const user = await getAuthenticatedUser();

  if (!user) throw new Error("UNAUTHORIZED");

  if (allowedRoles && !hasAnyRole(user.role, allowedRoles)) {
    throw new Error("FORBIDDEN");
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

export function requireRole(
  role: string,
  allowedRoles: readonly AppRole[]
) {
  if (!hasAnyRole(role, allowedRoles)) {
    throw new Error("FORBIDDEN");
  }
}
