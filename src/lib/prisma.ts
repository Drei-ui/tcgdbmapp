import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV !== "production"
        ? ["warn", "error"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/** Lightweight action timer — logs to server console in dev */
export function actionTimer(name: string) {
  const t0 = performance.now();
  return {
    lap(step: string) {
      if (process.env.NODE_ENV !== "production") {
        console.log(`[${name}] ${step}: ${(performance.now() - t0).toFixed(0)}ms`);
      }
    },
    done() {
      const ms = performance.now() - t0;
      if (process.env.NODE_ENV !== "production") {
        console.log(`[${name}] total: ${ms.toFixed(0)}ms`);
      }
      return ms;
    },
  };
}
