"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { isCurrencyCode } from "@/lib/currency";
import { revalidatePath } from "next/cache";

export async function updateCurrency(currency: string) {
  if (!isCurrencyCode(currency)) {
    return { error: "Unsupported currency" };
  }

  const user = await requireUser();
  await prisma.user.update({
    where: { id: user.id },
    data: { currency },
  });

  // Currency is read in the app layout, so refresh every page under it.
  revalidatePath("/", "layout");
  return { success: true };
}
