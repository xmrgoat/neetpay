import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { hash } from "bcryptjs";

const EMAIL = "dev@neetpay.com";
const PASSWORD = "dev123";

async function main() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL!,
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const existing = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (existing) {
    console.log(`User ${EMAIL} already exists (id: ${existing.id})`);
    await pool.end();
    return;
  }

  const hashedPassword = await hash(PASSWORD, 12);

  const user = await prisma.user.create({
    data: {
      email: EMAIL,
      hashedPassword,
      name: "Dev",
      plan: "pro",
    },
  });

  console.log(`Created dev user: ${user.email} (id: ${user.id})`);
  console.log(`Login: ${EMAIL} / ${PASSWORD}`);
  await pool.end();
}

main().catch(console.error);
