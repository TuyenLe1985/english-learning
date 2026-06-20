import { PrismaClient } from "../generated/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL ?? "admin@example.com";
  const secret = process.env.ADMIN_PASSWORD ?? "Admin@changeme1";
  const name = process.env.ADMIN_NAME ?? "Platform Admin";

  if (!process.env.ADMIN_PASSWORD) {
    console.warn("[seed-admin] ADMIN_PASSWORD not set — using insecure default. Set it in .env before running in production.");
  }

  const hash = await bcrypt.hash(secret, 12);

  const record = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name,
      password: hash,
      role: "ADMIN",
      emailVerified: new Date(),
    },
    update: {
      name,
      password: hash,
      role: "ADMIN",
    },
  });

  console.log(`[seed-admin] upserted: ${record.email} id=${record.id}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
