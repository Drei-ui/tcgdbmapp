import { PrismaClient } from "@prisma/client";

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

/** Lightweight action timer — logs in dev, warns on slow actions (>1s) in prod */
export function actionTimer(name: string) {
  const t0 = performance.now();
  const isDev = process.env.NODE_ENV !== "production";
  return {
    lap(step: string) {
      if (isDev) {
        console.log(`[${name}] ${step}: ${(performance.now() - t0).toFixed(0)}ms`);
      }
    },
    done() {
      const ms = performance.now() - t0;
      if (isDev) {
        console.log(`[${name}] total: ${ms.toFixed(0)}ms`);
      } else if (ms > 1000) {
        console.warn(`[SLOW] ${name}: ${ms.toFixed(0)}ms`);
      }
      return ms;
    },
  };
}
