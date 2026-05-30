const { PrismaClient } = require("@prisma/client");
const { PrismaLibSql } = require("@prisma/adapter-libsql");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");

dotenv.config();

const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Seed admin user
  const existingUser = await prisma.user.findUnique({
    where: { email: "admin@example.com" },
  });

  if (!existingUser) {
    const hashedPassword = await bcrypt.hash("admin123", 12);
    await prisma.user.create({
      data: {
        email: "admin@example.com",
        name: "Admin",
        password: hashedPassword,
      },
    });
    console.log("Admin user created: admin@example.com / admin123");
  }

  // Seed demo trip
  const existingTrip = await prisma.trip.findFirst({
    where: { title: "Paris Adventure" },
  });

  if (!existingTrip) {
    await prisma.trip.create({
      data: {
        title: "Paris Adventure",
        description: "A wonderful week exploring the city of lights, visiting the Eiffel Tower, Louvre Museum, and charming Montmartre streets.",
        color: "#3b82f6",
        tripDate: new Date("2024-06-15"),
        coverImage: null,
      },
    });
    console.log("Demo trip created: Paris Adventure");
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
