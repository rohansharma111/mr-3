import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const patchData = [
  ["Veera Desai", "Maharashtra", "Andheri Region", 19],
  ["Vile Parle", "Maharashtra", "Andheri Region", 25],
  ["Versova", "Maharashtra", "Andheri Region", 21],
  ["Andheri Station", "Maharashtra", "Andheri Region", 18],
  ["Oshiwara", "Maharashtra", "Andheri Region", 15],
  ["Lokhandwala", "Maharashtra", "Andheri Region", 16],
  ["Jogeshwari (W)", "Maharashtra", "Andheri Region", 14]
] as const;

const doctorMapCoords: Record<string, readonly [number, number]> = {
  "Dr. Ankit Rawal": [35, 40],
  "Dr. Ramesh Gupta": [48, 58],
  "Dr. Neha Verma": [68, 30],
  "Dr. Amit Shah": [25, 72],
  "Dr. Pooja Mehta": [75, 75],
  "Dr. Suresh Patil": [52, 25],
  "Dr. Kirit Desai": [40, 35],
  "Dr. Sneha Kulkarni": [60, 65],
  "Dr. Kabir Malik": [45, 45],
  "Dr. Tanya Sen": [70, 55]
};

const doctorData = [
  ["Dr. Ankit Rawal","Cardiologist","HealthCare Clinic","Veera Desai Rd",92,"HIGH",0.6,"Veera Desai"],
  ["Dr. Ramesh Gupta","Cardiologist","City Heart Hospital","Veera Desai Rd",88,"HIGH",1.2,"Veera Desai"],
  ["Dr. Neha Verma","Cardiologist","Lotus Hospital","Azad Nagar",75,"MEDIUM",1.8,"Veera Desai"],
  ["Dr. Amit Shah","Cardiologist","Life Line Hospital","Veera Desai Rd",73,"MEDIUM",2.1,"Veera Desai"],
  ["Dr. Pooja Mehta","Cardiologist","Sunrise Hospital","Andheri (W)",70,"MEDIUM",2.4,"Veera Desai"],
  ["Dr. Suresh Patil","Diabetologist","Care Clinic","Veera Desai Rd",84,"HIGH",0.9,"Veera Desai"],
  ["Dr. Kirit Desai","Cardiologist","Parle Heart Care","MG Road",95,"HIGH",2.8,"Vile Parle"],
  ["Dr. Sneha Kulkarni","Gynecologist","Motherhood Hub","Station Rd",81,"HIGH",3.1,"Vile Parle"],
  ["Dr. Kabir Malik","Orthopedic","Joint & Spine Clinic","Yari Road",89,"HIGH",1.5,"Versova"],
  ["Dr. Tanya Sen","General Physician","Versova Medical","Beach Rd",68,"MEDIUM",2.2,"Versova"]
] as const;

async function main() {
  for (const [name, state, region, doctorCount] of patchData) {
    await prisma.patch.upsert({
      where: { name },
      update: { state, region, doctorCount },
      create: { name, state, region, doctorCount, isDemo: true }
    });
  }

  for (const name of ["Cardiologist","Diabetologist","Gynecologist","Orthopedic","General Physician"]) {
    await prisma.specialty.upsert({ where: { name }, update: {}, create: { name } });
  }

  await prisma.user.upsert({
    where: { email: "amit.rawat@mr3.demo" },
    update: { name: "Amit Rawat", role: "FIELD_MANAGER" },
    create: { name: "Amit Rawat", email: "amit.rawat@mr3.demo", role: "FIELD_MANAGER" }
  });

  for (const [name, spec, clinic, location, score, potential, distanceKm, patchName] of doctorData) {
    const specialty = await prisma.specialty.findUniqueOrThrow({ where: { name: spec } });
    const [mapX, mapY] = doctorMapCoords[name] ?? [null, null];
    const existing = await prisma.doctor.findFirst({ where: { name } });
    const doctor = existing
      ? await prisma.doctor.update({ where: { id: existing.id }, data: { clinic, location, score, potential, distanceKm, mapX, mapY, specialtyId: specialty.id, isDemo: true } })
      : await prisma.doctor.create({ data: { name, clinic, location, score, potential, distanceKm, specialtyId: specialty.id, isDemo: true } });
    const patch = await prisma.patch.findUniqueOrThrow({ where: { name: patchName } });
    await prisma.doctorPatch.upsert({
      where: { doctorId_patchId: { doctorId: doctor.id, patchId: patch.id } },
      update: {},
      create: { doctorId: doctor.id, patchId: patch.id }
    });
  }


  const writingPatternSnapshots = [
    {
      period: "This Month",
      categories: [["Pain Relievers", 45], ["Antibiotics", 20], ["Gastro Medicines", 16], ["Vitamins / Supplements", 12], ["Others", 7]],
      molecules: [["Aceclofenac + Paracetamol", "30%"], ["Paracetamol", "15%"], ["Etoricoxib", "11%"], ["Amoxicillin + Clavulanate", "9%"], ["Pantoprazole", "8%"], ["Vitamin D3", "6%"], ["Others", "21%"]],
      insight: "Pain Relievers jumped to 45% this month due to seasonal joint flare-ups."
    },
    {
      period: "Last 3 Months",
      categories: [["Pain Relievers", 42], ["Antibiotics", 22], ["Gastro Medicines", 15], ["Vitamins / Supplements", 12], ["Others", 9]],
      molecules: [["Aceclofenac + Paracetamol", "28%"], ["Paracetamol", "14%"], ["Etoricoxib", "12%"], ["Amoxicillin + Clavulanate", "10%"], ["Pantoprazole", "8%"], ["Vitamin D3", "5%"], ["Others", "23%"]],
      insight: "Doctor prescribes Pain Relievers most frequently (42%). Focus on Pain Management products."
    }
  ] as const;

  for (const snapshot of writingPatternSnapshots) {
    await prisma.writingPatternSnapshot.upsert({
      where: { period: snapshot.period },
      update: { categories: snapshot.categories, molecules: snapshot.molecules, insight: snapshot.insight, sourceLabel: "PROTOTYPE_SOURCE" },
      create: { period: snapshot.period, categories: snapshot.categories, molecules: snapshot.molecules, insight: snapshot.insight, sourceLabel: "PROTOTYPE_SOURCE" }
    });
  }

  console.log("MR 3.0 demo seed complete");
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
