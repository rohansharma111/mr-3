import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const patch = searchParams.get("patch") || "Veera Desai";
  const specialty = searchParams.get("specialty") || "All";
  const q = searchParams.get("q")?.trim() || "";
  const sort = searchParams.get("sort") || "score";

  const doctors = await prisma.doctor.findMany({
    where: {
      isActive: true,
      patches: { some: { patch: { name: patch } } },
      ...(specialty !== "All" ? { specialty: { name: specialty } } : {}),
      ...(q ? {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { clinic: { contains: q, mode: "insensitive" } },
          { location: { contains: q, mode: "insensitive" } },
          { specialty: { name: { contains: q, mode: "insensitive" } } }
        ]
      } : {})
    },
    include: { specialty: true },
    orderBy: sort === "distance" ? { distanceKm: "asc" } : { score: "desc" }
  });

  return NextResponse.json(doctors.map((doctor) => ({
    id: doctor.id,
    name: doctor.name,
    spec: doctor.specialty?.name ?? "—",
    clinic: doctor.clinic,
    loc: doctor.location,
    score: doctor.score,
    potential: doctor.potential === "HIGH" ? "High" : doctor.potential === "LOW" ? "Low" : "Medium",
    dist: doctor.distanceKm ? doctor.distanceKm.toString() + " km" : "—"
  })));
}
