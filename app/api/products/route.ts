import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth-user";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: { id: true, name: true, molecule: true, category: true },
    orderBy: { name: "asc" }
  });
  return NextResponse.json({ products });
}
