import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth-user";

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const productId = params.get("productId");
  const molecule = params.get("molecule");

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
}
