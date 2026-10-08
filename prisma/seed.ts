import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const patchData = [
  ["Veera Desai", 19], ["Vile Parle", 25], ["Versova", 21],
  ["Andheri Station", 18], ["Oshiwara", 15], ["Lokhandwala", 16], ["Jogeshwari (W)", 14]
] as const;

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
  for (const [name, doctorCount] of patchData) {
    await prisma.patch.upsert({ where: { name }, update: { doctorCount }, create: { name, doctorCount, isDemo: true } });
  }

  for (const name of ["Cardiologist","Diabetologist","Gynecologist","Orthopedic","General Physician"]) {
    await prisma.specialty.upsert({ where: { name }, update: {}, create: { name } });
  }

  await prisma.user.upsert({
    where: { email: "amit.rawat@mr3.demo" },
    update: { name: "Amit Rawat", role: "FIELD_MANAGER" },
    create: { name: "Amit Rawat", email: "amit.rawat@mr3.demo", role: Role.FIELD_MANAGER }
  });

  for (const [name, spec, clinic, location, score, potential, distanceKm, patchName] of doctorData) {
    const specialty = await prisma.specialty.findUniqueOrThrow({ where: { name: spec } });
    const existing = await prisma.doctor.findFirst({ where: { name } });
    const doctor = existing
      ? await prisma.doctor.update({ where: { id: existing.id }, data: { clinic, location, score, potential, distanceKm, specialtyId: specialty.id, isDemo: true } })
      : await prisma.doctor.create({ data: { name, clinic, location, score, potential, distanceKm, specialtyId: specialty.id, isDemo: true } });
    const patch = await prisma.patch.findUniqueOrThrow({ where: { name: patchName } });
    await prisma.doctorPatch.upsert({
      where: { doctorId_patchId: { doctorId: doctor.id, patchId: patch.id } },
      update: {},
      create: { doctorId: doctor.id, patchId: patch.id }
    });
  }

  console.log("MR 3.0 demo seed complete");
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
