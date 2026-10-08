import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: { id: true, name: true, molecule: true, category: true },
    orderBy: { name: "asc" }
  });
  return NextResponse.json({ products });
}
