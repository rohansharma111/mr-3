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
  ["Dr. Ankit Rawal","Cardiologist","HealthCare Clinic","Veera Desai Rd",92,"High",0.6,"Veera Desai"],
  ["Dr. Ramesh Gupta","Cardiologist","City Heart Hospital","Veera Desai Rd",88,"High",1.2,"Veera Desai"],
  ["Dr. Neha Verma","Cardiologist","Lotus Hospital","Azad Nagar",75,"Medium",1.8,"Veera Desai"],
  ["Dr. Amit Shah","Cardiologist","Life Line Hospital","Veera Desai Rd",73,"Medium",2.1,"Veera Desai"],
  ["Dr. Pooja Mehta","Cardiologist","Sunrise Hospital","Andheri (W)",70,"Medium",2.4,"Veera Desai"],
  ["Dr. Suresh Patil","Diabetologist","Care Clinic","Veera Desai Rd",84,"High",0.9,"Veera Desai"],
  ["Dr. Kirit Desai","Cardiologist","Parle Heart Care","MG Road",95,"High",2.8,"Vile Parle"],
  ["Dr. Sneha Kulkarni","Gynecologist","Motherhood Hub","Station Rd",81,"High",3.1,"Vile Parle"],
  ["Dr. Kabir Malik","Orthopedic","Joint & Spine Clinic","Yari Road",89,"High",1.5,"Versova"],
  ["Dr. Tanya Sen","General Physician","Versova Medical","Beach Rd",68,"Medium",2.2,"Versova"]
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



  // Expanded, fictional demo dataset. Keep all records clearly marked as demo.
  const additionalPatchData = [
    ["Bandra East", "Maharashtra", "Bandra Region", 8],
    ["Khar West", "Maharashtra", "Bandra Region", 9],
    ["Santacruz", "Maharashtra", "Bandra Region", 11],
    ["Goregaon East", "Maharashtra", "Goregaon Region", 10],
    ["Malad West", "Maharashtra", "Goregaon Region", 12],
    ["Kandivali", "Maharashtra", "Goregaon Region", 9],
    ["Borivali", "Maharashtra", "Goregaon Region", 13],
    ["Powai", "Maharashtra", "Central Mumbai Region", 8],
    ["Vikhroli", "Maharashtra", "Central Mumbai Region", 7],
    ["Mulund", "Maharashtra", "Central Mumbai Region", 10]
  ] as const;

  for (const [name, state, region, doctorCount] of additionalPatchData) {
    await prisma.patch.upsert({
      where: { name },
      update: { state, region, doctorCount },
      create: { name, state, region, doctorCount, isDemo: true }
    });
  }

  const additionalDoctorData = [
    ["Dr. Kavita Rao", "Cardiologist", "Western Heart & Wellness Clinic", "Bandra East", 87, "High", 1.1, "Bandra East"],
    ["Dr. Nikhil Bhat", "Diabetologist", "Bandra Diabetes Centre", "Khar West", 79, "Medium", 1.6, "Khar West"],
    ["Dr. Meera Iyer", "Gynecologist", "Santacruz Women's Clinic", "Santacruz East", 91, "High", 0.8, "Santacruz"],
    ["Dr. Arjun Deshmukh", "Orthopedic", "Goregaon Ortho Care", "Goregaon East", 83, "High", 1.3, "Goregaon East"],
    ["Dr. Farah Khan", "General Physician", "Malad Family Clinic", "Malad West", 64, "Medium", 2.0, "Malad West"],
    ["Dr. Vivek Nair", "Cardiologist", "Kandivali Cardiac Associates", "Kandivali West", 76, "Medium", 1.7, "Kandivali"],
    ["Dr. Shweta Joshi", "Diabetologist", "Borivali Endocrine Clinic", "Borivali West", 90, "High", 0.9, "Borivali"],
    ["Dr. Rahul Menon", "Orthopedic", "Powai Bone & Joint Centre", "Powai", 72, "Medium", 2.4, "Powai"],
    ["Dr. Isha Kapoor", "Gynecologist", "Vikhroli Women's Health", "Vikhroli West", 86, "High", 1.2, "Vikhroli"],
    ["Dr. Sameer Kulkarni", "General Physician", "Mulund Community Clinic", "Mulund West", 69, "Medium", 1.8, "Mulund"],
    ["Dr. Priya Nambiar", "Cardiologist", "Bandra Heart Clinic", "Bandra West", 94, "High", 1.0, "Khar West"],
    ["Dr. Aditya Shah", "Diabetologist", "Santacruz Metabolic Care", "Santacruz West", 74, "Medium", 2.1, "Santacruz"],
    ["Dr. Naina Fernandes", "General Physician", "Goregaon Health Point", "Goregaon West", 61, "Low", 2.8, "Goregaon East"],
    ["Dr. Omkar Patwardhan", "Orthopedic", "Malad Mobility Clinic", "Malad East", 82, "High", 1.4, "Malad West"],
    ["Dr. Ritu Sethi", "Gynecologist", "Borivali Women's Centre", "Borivali East", 78, "Medium", 1.9, "Borivali"],
    ["Dr. Kunal Shetty", "Cardiologist", "Powai Cardiac Clinic", "Powai", 89, "High", 1.1, "Powai"],
    ["Dr. Ayesha Merchant", "Diabetologist", "Mulund Diabetes & Wellness", "Mulund East", 80, "High", 1.5, "Mulund"],
    ["Dr. Pranav Kulkarni", "General Physician", "Vikhroli Family Practice", "Vikhroli East", 58, "Low", 2.6, "Vikhroli"],
    ["Dr. Simran Gill", "Orthopedic", "Bandra Sports Injury Clinic", "Bandra East", 85, "High", 1.3, "Bandra East"],
    ["Dr. Devika Menon", "Gynecologist", "Kandivali Women's Wellness", "Kandivali East", 71, "Medium", 2.2, "Kandivali"]
  ] as const;

  const allDemoDoctors: { id: string; name: string; specialtyName: string; patchName: string }[] = [];
  for (const [name, spec, clinic, location, score, potential, distanceKm, patchName] of additionalDoctorData) {
    const specialty = await prisma.specialty.findUniqueOrThrow({ where: { name: spec } });
    let doctor = await prisma.doctor.findFirst({ where: { name } });
    doctor = doctor
      ? await prisma.doctor.update({
          where: { id: doctor.id },
          data: { clinic, location, score, potential, distanceKm, specialtyId: specialty.id, isDemo: true, isActive: true }
        })
      : await prisma.doctor.create({
          data: { name, clinic, location, score, potential, distanceKm, specialtyId: specialty.id, isDemo: true, isActive: true }
        });
    const patch = await prisma.patch.findUniqueOrThrow({ where: { name: patchName } });
    await prisma.doctorPatch.upsert({
      where: { doctorId_patchId: { doctorId: doctor.id, patchId: patch.id } },
      update: {},
      create: { doctorId: doctor.id, patchId: patch.id }
    });
    allDemoDoctors.push({ id: doctor.id, name, specialtyName: spec, patchName });
  }

  const demoProducts = [
    ["Cardioval-5", "Amlodipine", "Cardiovascular"],
    ["GlucoSure-M", "Metformin", "Diabetes Care"],
    ["GlucoSure-D", "Dapagliflozin", "Diabetes Care"],
    ["Painrelief-A", "Aceclofenac + Paracetamol", "Pain Management"],
    ["GastroEase-40", "Pantoprazole", "Gastrointestinal"],
    ["CalciWell-D3", "Calcium + Vitamin D3", "Vitamins & Supplements"],
    ["AirwayCare-L", "Levocetirizine", "Respiratory & Allergy"],
    ["NeuroB-Plus", "Methylcobalamin + B Vitamins", "Vitamins & Supplements"],
    ["Cardioval-AT", "Atenolol + Amlodipine", "Cardiovascular"],
    ["GastroEase-DSR", "Pantoprazole + Domperidone", "Gastrointestinal"]
  ] as const;

  for (const [name, molecule, category] of demoProducts) {
    await prisma.product.upsert({
      where: { name },
      update: { molecule, category, isDemo: true, isActive: true },
      create: { name, molecule, category, isDemo: true, isActive: true }
    });
  }

  const demoStockists = [
    ["Western MedSupply - Andheri", "Andheri West, Mumbai"],
    ["Harbour Pharma Distributors", "Bandra East, Mumbai"],
    ["Goregaon Health Wholesale", "Goregaon East, Mumbai"],
    ["North Suburbs Medicals", "Borivali West, Mumbai"],
    ["Central Line Pharma", "Powai, Mumbai"]
  ] as const;
  const stockistRecords = [];
  for (const [name, location] of demoStockists) {
    stockistRecords.push(await prisma.stockist.upsert({
      where: { name },
      update: { location, isDemo: true, isActive: true },
      create: { name, location, isDemo: true, isActive: true }
    }));
  }

  const products = await prisma.product.findMany({ where: { isDemo: true }, orderBy: { name: "asc" } });
  for (let s = 0; s < stockistRecords.length; s++) {
    for (let p = 0; p < products.length; p++) {
      const quantity = [0, 12, 24, 36, 60, 84, 120][(s * 3 + p * 2) % 7];
      const status = quantity === 0 ? "OUT_OF_STOCK" : quantity <= 12 ? "Low" : "GOOD";
      await prisma.stockistInventory.upsert({
        where: { stockistId_productId: { stockistId: stockistRecords[s].id, productId: products[p].id } },
        update: { quantity, unit: "packs", status },
        create: { stockistId: stockistRecords[s].id, productId: products[p].id, quantity, unit: "packs", status }
      });
    }
  }

  const demoUser = await prisma.user.findUniqueOrThrow({ where: { email: "amit.rawat@mr3.demo" } });
  const existingDemoDoctors = await prisma.doctor.findMany({ where: { isDemo: true }, include: { specialty: true }, orderBy: { name: "asc" } });
  const activeProducts = await prisma.product.findMany({ where: { isDemo: true }, orderBy: { name: "asc" } });
  const now = new Date();
  const dayStart = new Date(now);
  dayStart.setHours(9, 0, 0, 0);
  const callOutcomes = ["Product information shared", "Follow-up requested", "Clinical literature discussed", "Sample request received", "Next visit scheduled"];
  const callNotes = [
    "Discussed approved product information and answered dosage-form questions.",
    "Doctor requested a concise evidence summary for the next visit.",
    "Reviewed availability with the clinic team; follow-up planned next week.",
    "Brief product discussion completed; leave updated product literature.",
    "Doctor was occupied; receptionist helped coordinate a suitable revisit."
  ];
  for (let i = 0; i < 48; i++) {
    const doctor = existingDemoDoctors[i % existingDemoDoctors.length];
    const product = activeProducts[i % activeProducts.length];
    const calledAt = new Date(dayStart.getTime() - ((i % 28) * 24 * 60 * 60 * 1000) + ((i % 7) * 45 * 60 * 1000));
    const status = i % 11 === 0 ? "MISSED" : i % 9 === 0 ? "PLANNED" : "COMPLETED";
    const exists = await prisma.call.findFirst({
      where: { doctorId: doctor.id, userId: demoUser.id, productId: product.id, calledAt }
    });
    if (!exists) {
      await prisma.call.create({
        data: {
          doctorId: doctor.id, userId: demoUser.id, productId: product.id, calledAt, status,
          outcome: status === "COMPLETED" ? callOutcomes[i % callOutcomes.length] : null,
          notes: callNotes[i % callNotes.length], isDemo: true
        }
      });
    }
  }

  for (let i = 0; i < 22; i++) {
    const doctor = existingDemoDoctors[(i * 3) % existingDemoDoctors.length];
    const product = activeProducts[(i * 2) % activeProducts.length];
    const issuedAt = new Date(dayStart.getTime() - ((i % 25) * 24 * 60 * 60 * 1000) + ((i % 5) * 60 * 60 * 1000));
    const status = i % 13 === 0 ? "RETURNED" : "ISSUED";
    const exists = await prisma.sampleIssue.findFirst({ where: { doctorId: doctor.id, productId: product.id, userId: demoUser.id, issuedAt } });
    if (!exists) {
      await prisma.sampleIssue.create({
        data: { doctorId: doctor.id, productId: product.id, userId: demoUser.id, quantity: [5, 10, 15, 20][i % 4], status, issuedAt, isDemo: true }
      });
    }
  }

  for (let i = 0; i < 24; i++) {
    const doctor = existingDemoDoctors[(i * 5) % existingDemoDoctors.length];
    const plannedFor = new Date(dayStart.getTime() + ((i % 12) - 5) * 24 * 60 * 60 * 1000 + (9 + (i % 7)) * 60 * 60 * 1000);
    const status = i % 10 === 0 ? "MISSED" : i % 8 === 0 ? "COMPLETED" : "PLANNED";
    const priority = i % 12 === 0 ? "URGENT" : i % 5 === 0 ? "High" : i % 3 === 0 ? "Low" : "NORMAL";
    const objectives = ["Introduce new product information", "Review product availability and feedback", "Discuss follow-up questions", "Share approved clinical literature", "Check sample feedback"];
    const exists = await prisma.plan.findFirst({ where: { userId: demoUser.id, doctorId: doctor.id, plannedFor } });
    if (!exists) {
      await prisma.plan.create({
        data: { userId: demoUser.id, doctorId: doctor.id, plannedFor, status, priority, objective: objectives[i % objectives.length], notes: "Demo visit plan — fictional activity for UI testing." }
      });
    }
  }

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  await prisma.target.upsert({
    where: { userId_periodStart_periodEnd: { userId: demoUser.id, periodStart: monthStart, periodEnd: monthEnd } },
    update: { targetCalls: 80, targetSamples: 120, targetConversions: 18 },
    create: { userId: demoUser.id, periodStart: monthStart, periodEnd: monthEnd, targetCalls: 80, targetSamples: 120, targetConversions: 18 }
  });

  const demoNotifications = [
    ["TARGET_PROGRESS", "Monthly target is underway", "Demo progress summary is ready to review.", "/reports"],
    ["PLAN_REMINDER", "Upcoming doctor visits", "Review the planned visits for your current patch.", "/plans"],
    ["INVENTORY_ALERT", "Stock availability needs review", "A demo stockist has low or zero quantity for selected products.", "/stockists"],
    ["SAMPLE_FOLLOW_UP", "Sample feedback follow-up", "A few demo sample issues are ready for a follow-up discussion.", "/samples"]
  ] as const;
  for (const [type, title, message, actionUrl] of demoNotifications) {
    const existing = await prisma.notification.findFirst({ where: { userId: demoUser.id, title } });
    if (!existing) {
      await prisma.notification.create({ data: { userId: demoUser.id, type, title, message, actionUrl, isRead: false } });
    }
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
