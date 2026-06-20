import { PrismaClient } from "../generated/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL ?? "admin@example.com";
  const name = process.env.ADMIN_NAME ?? "Platform Admin";

  // WR-06: Only hash and write the password when ADMIN_PASSWORD is explicitly
  // set. On subsequent re-runs (e.g. deploy pipelines) without ADMIN_PASSWORD,
  // we preserve whatever password is already in the DB rather than silently
  // resetting it to the insecure default.
  const passwordUpdate: { passwordHash?: string } = {};
  if (process.env.ADMIN_PASSWORD) {
    passwordUpdate.passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
  } else {
    console.warn("[seed-admin] ADMIN_PASSWORD not set — password will not be updated on existing accounts. Set it in .env before running in production.");
  }

  // For the create branch (new user), we always need a password hash.
  // Fall back to the insecure default only if this is a first-time seed.
  const createSecret = process.env.ADMIN_PASSWORD ?? "Admin@changeme1";
  const createHash = process.env.ADMIN_PASSWORD
    ? passwordUpdate.passwordHash!
    : await bcrypt.hash(createSecret, 12);

  const record = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name,
      passwordHash: createHash,
      role: "ADMIN",
      emailVerified: new Date(),
    },
    update: {
      name,
      role: "ADMIN",
      // Only reset password if ADMIN_PASSWORD was explicitly provided (WR-06)
      ...(passwordUpdate.passwordHash ? { passwordHash: passwordUpdate.passwordHash } : {}),
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
