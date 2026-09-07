-- Baseline an existing database against the InitialCreate migration.
--
-- Run this ONCE, against a database whose tables already exist but which has no
-- __EFMigrationsHistory table. It tells EF Core that InitialCreate is already
-- applied, so Database.MigrateAsync() at startup skips it instead of failing on
-- "relation already exists".
--
-- Do NOT run this against an empty database — there, let the app create the
-- schema itself by simply starting it.
--
-- Verify the schema matches BEFORE running this. See DEPLOYMENT.md.

BEGIN;

CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
    "MigrationId" character varying(150) NOT NULL,
    "ProductVersion" character varying(32) NOT NULL,
    CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY ("MigrationId")
);

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260108052328_InitialCreate', '9.0.7')
ON CONFLICT ("MigrationId") DO NOTHING;

COMMIT;

-- Expected result: one row.
SELECT "MigrationId", "ProductVersion" FROM "__EFMigrationsHistory";
