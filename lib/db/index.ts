import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { join } from "path";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  const dbPath = process.env.DATABASE_URL
    ? process.env.DATABASE_URL
    : join(process.cwd(), "dev.db");
  const url = dbPath.startsWith("file:") ? dbPath : `file:${dbPath}`;
  const adapter = new PrismaLibSql({ url });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
