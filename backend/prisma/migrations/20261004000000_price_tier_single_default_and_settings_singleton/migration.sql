-- Database invariants that the Prisma schema DSL cannot express.
--
-- These objects exist only in this raw migration. Apply them with
-- `prisma migrate deploy`; never use `prisma db push`, which would not create
-- them. If a future `prisma migrate dev` diff proposes dropping either object,
-- remove that statement from the generated migration before applying it.

-- At most one PriceTier may be both active and default. Inactive tiers are
-- unaffected because they fall outside the partial index predicate.
CREATE UNIQUE INDEX "PriceTier_single_active_default_key"
  ON "PriceTier" ("isDefault")
  WHERE "isActive" = true AND "isDefault" = true;

-- PlatformSettings is a singleton row whose id is always 1.
ALTER TABLE "PlatformSettings"
  ADD CONSTRAINT "PlatformSettings_singleton_id_check" CHECK ("id" = 1);
