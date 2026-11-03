import { prisma } from "./prisma.js";

const email = process.argv.slice(2).find((argument) => argument !== "--")?.trim().toLowerCase();

if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("Usage: pnpm admin:promote -- admin@example.com");
  process.exitCode = 1;
} else {
  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      console.error(`No user found for ${email}. Sign up first.`);
      process.exitCode = 1;
    } else {
      await prisma.user.update({ where: { id: user.id }, data: { role: "admin" } });
      console.log(`${email} is now an admin.`);
    }
  } finally {
    await prisma.$disconnect();
  }
}
