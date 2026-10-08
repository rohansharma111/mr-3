import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth-user";

const stockistQuerySchema = z.object({
  productId: z.string().uuid().optional(),
  molecule: z.string().trim().min(1).max(200).optional()
});

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const parsed = stockistQuerySchema.safeParse({
    productId: params.get("productId") ?? undefined,
    molecule: params.get("molecule") ?? undefined
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid stockist filters", details: parsed.error.flatten() }, { status: 400 });
  }

  const { productId, molecule } = parsed.data;

  try {
  const stockists = await prisma.stockist.findMany({
    where: { isActive: true },
    include: {
      inventory: {
        where: {
          ...(productId ? { productId } : {}),
          ...(molecule ? { product: { molecule } } : {})
        },
        include: {
          product: { select: { id: true, name: true, molecule: true, category: true } }
        },
        orderBy: { quantity: "desc" }
      }
    },
    orderBy: { name: "asc" }
  });

  const rows = stockists.flatMap(stockist =>
    stockist.inventory.map(item => ({
      stockistId: stockist.id,
      stockistName: stockist.name,
      location: stockist.location,
      productId: item.product.id,
      productName: item.product.name,
      molecule: item.product.molecule,
      category: item.product.category,
      quantity: item.quantity,
      unit: item.unit,
      status: item.status,
      updatedAt: item.updatedAt.toISOString()
    }))
  );

  const summary = {
    totalStockists: stockists.length,
    inStock: rows.filter(row => row.quantity > 0).length,
    lowStock: rows.filter(row => row.status === "LOW").length,
    outOfStock: rows.filter(row => row.quantity === 0 || row.status === "OUT_OF_STOCK").length
  };

  return NextResponse.json({ summary, stockists: rows });
  } catch {
    return NextResponse.json({ error: "Unable to load stockist data" }, { status: 500 });
  }
}
