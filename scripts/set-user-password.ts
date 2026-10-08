import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.MR3_USER_EMAIL?.trim().toLowerCase();
  const password = process.env.MR3_USER_PASSWORD;

  if (!email) throw new Error("MR3_USER_EMAIL is required.");
  if (!password || password.length < 8 || password.length > 128) {
    throw new Error("MR3_USER_PASSWORD must be between 8 and 128 characters.");
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error("User not found.");

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, isActive: true }
  });

  console.log("Password updated.");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
