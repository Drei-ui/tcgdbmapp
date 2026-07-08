import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { toCurrencyCode, type CurrencyCode } from "@/lib/currency";

/** Cached per-request — deduplicates across multiple server actions/components in one render */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return prisma.user.findUnique({ where: { id: user.id } });
});

export const requireUser = cache(async () => {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
});

/** The current user's display currency, coerced to a supported code. */
export const getCurrency = cache(async (): Promise<CurrencyCode> => {
  const user = await getUser();
  return toCurrencyCode(user?.currency);
});
