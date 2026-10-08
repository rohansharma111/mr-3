import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth-user";

const querySchema = z.object({
  period: z.enum(["This Month", "Last 3 Months"]).default("Last 3 Months")
});

export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({ period: url.searchParams.get("period") ?? undefined });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid writing pattern period" }, { status: 400 });
  }

  const snapshot = await prisma.writingPatternSnapshot.findUnique({
    where: { period: parsed.data.period }
  });

  if (!snapshot) {
    return NextResponse.json({ error: "Writing pattern data is not available for this period" }, { status: 404 });
  }

  return NextResponse.json({
    period: snapshot.period,
    categories: snapshot.categories,
    molecules: snapshot.molecules,
    insight: snapshot.insight,
    sourceLabel: snapshot.sourceLabel,
    doctorSpecific: false
  });
}