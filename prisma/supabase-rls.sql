-- ============================================================================
-- RUN THIS IN THE SUPABASE SQL EDITOR (project: tcgdm_db) — NOT via Prisma.
-- ============================================================================
-- Prisma / the app now talk to Neon; this file targets the SEPARATE Supabase
-- database that still holds an exposed copy of these tables (the source of the
-- "Table publicly accessible / rls_disabled_in_public" security alert).
--
-- Enabling RLS with no policies denies all access to the `anon` / `authenticated`
-- roles behind Supabase's auto-generated REST API (PostgREST), closing the hole.
-- The Supabase SQL Editor runs as the table owner, and owners bypass RLS, so this
-- does not lock you out. Do NOT add FORCE ROW LEVEL SECURITY.

ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."suppliers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."product_catalog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."purchases" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."purchase_line_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."inventory_lots" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."sales" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."sale_line_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."cash_transactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."attachments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."audit_log" ENABLE ROW LEVEL SECURITY;
