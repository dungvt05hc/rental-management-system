# Deployment

The repository deploys as two services described by [`render.yaml`](render.yaml):

| Service | Type | Source |
| --- | --- | --- |
| `rental-management-api` | Docker web service | `RentalManagementSystem/Backend/RentalManagement.Api` |
| `rental-management-web` | Static site | `RentalManagementSystem/Frontend` |

No secret is stored in this repository. Every sensitive variable is marked
`sync: false` in the blueprint, which means the hosting dashboard prompts for it
on first deploy and keeps it out of version control.

## Prerequisites

- A PostgreSQL database. Any managed Postgres works; the connection string is the
  only thing the API needs.
- A Render account connected to this repository.

## Database schema

The API applies EF Core migrations itself at startup (`Database.MigrateAsync()`
in `Program.cs`), so a fresh database needs no manual step — bring the service up
and the schema is created.

Migrations live in
`RentalManagementSystem/Backend/RentalManagement.Api/Migrations/` and **must be
committed**. A deploy from a checkout without them starts against an empty
database and creates no tables.

To add one after changing an entity:

```bash
cd RentalManagementSystem/Backend/RentalManagement.Api
dotnet ef migrations add <DescriptiveName>
```

### Baselining a database that already has tables

If you point the API at a database whose tables already exist but which has **no
`__EFMigrationsHistory` table**, startup will try to run `InitialCreate` and fail
with `relation "AspNetRoles" already exists`. `Program.cs` catches that and keeps
serving, so the health check still passes while the failure is only visible in
the logs.

Baseline the database instead — record `InitialCreate` as already applied:

**1. Confirm the existing schema matches the migration.** The migration expects
these 16 tables:

```
AspNetRoleClaims  AspNetRoles       AspNetUserClaims  AspNetUserLogins
AspNetUserRoles   AspNetUserTokens  AspNetUsers       InvoiceItems
Invoices          Items             Languages         Payments
Rooms             SystemSettings    Tenants           Translations
```

Compare against the live database:

```bash
psql "$DATABASE_URL" -c "\dt"
```

For a column-level check, generate the schema the migration would produce and
diff it against the real one:

```bash
cd RentalManagementSystem/Backend/RentalManagement.Api
dotnet ef migrations script -o expected-schema.sql
```

**2. If they match**, apply the baseline:

```bash
psql "$DATABASE_URL" -f RentalManagementSystem/Backend/RentalManagement.Api/Scripts/baseline-existing-database.sql
```

**3. If they do not match**, stop. Do not baseline — EF would then believe the
schema is current and every later migration would build on a wrong assumption.
Either bring the database up to the migration's shape by hand first, or drop it
and let the app recreate it.

After baselining, deploys apply new migrations normally.

## Environment variables

### API (`rental-management-api`)

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | Npgsql connection string or a `postgresql://` URL. `Program.cs` normalizes both, and it takes precedence over `appsettings.Production.json`. |
| `JWT_SECRET_KEY` | yes | Signing key for issued tokens. Use at least 32 random characters. The API refuses to start without it. |
| `FRONTEND_URL` | yes | Comma-separated list of origins allowed by CORS, e.g. `https://rental-management-web.onrender.com`. Without it, browser requests from the deployed frontend are blocked. |
| `SEED_ADMIN_PASSWORD` | first deploy | Password for the seeded `admin@rentalmanagement.com` account. If unset, the account is not created and startup logs a warning. |
| `ASPNETCORE_ENVIRONMENT` | set in blueprint | `Production`. |

Generate a signing key with:

```bash
openssl rand -base64 48
```

### Web (`rental-management-web`)

| Variable | Required | Notes |
| --- | --- | --- |
| `VITE_API_BASE_URL` | yes | Full API base including the suffix, e.g. `https://rental-management-api.onrender.com/api`. |
| `VITE_API_URL` | yes | Same value. Some modules read this name instead. |

These are build-time variables — Vite inlines them. Changing one requires a
rebuild, not just a restart.

## First deploy

1. In Render, create a new Blueprint pointing at this repository. `render.yaml`
   at the repository root is picked up automatically.
2. Render prompts for each `sync: false` variable. Fill in the API values above.
   Leave the frontend's API URLs for step 4 — you do not know the API hostname yet.
3. Let the API service build and deploy. Watch the logs for
   `Database initialization completed successfully`, then confirm
   `GET /api/health` returns `{"status":"healthy"}`.
4. Set `VITE_API_BASE_URL` and `VITE_API_URL` on the web service to the API's
   URL plus `/api`, and set `FRONTEND_URL` on the API service to the web
   service's URL. Redeploy both.
5. Sign in as `admin@rentalmanagement.com` with the `SEED_ADMIN_PASSWORD` you
   chose, and change the password.

Steps 3 and 4 are circular by nature — each service needs the other's hostname —
so the first deploy always takes two passes.

## Subsequent deploys

`autoDeploy: true` on both services means a push to the default branch rebuilds
and redeploys. Environment variables persist across deploys; only a changed
`render.yaml` structure needs a blueprint sync.

## Rotating a secret

Change the value in the dashboard and redeploy the affected service. Rotating
`JWT_SECRET_KEY` invalidates every issued token, signing all users out.

## Troubleshooting

**Startup logs `An error occurred while initializing the database`.** The app
catches this and keeps serving, so the health check still passes while the
failure is invisible from outside. Read the inner exception in the logs. If it
says `relation "..." already exists`, the database needs baselining — see above.
Otherwise it is almost always a wrong `DATABASE_URL`.

**Browser requests fail with a CORS error.** `FRONTEND_URL` does not match the
origin the browser sends. It must include the scheme and no trailing slash.

**Login returns 401 with correct credentials.** Either `SEED_ADMIN_PASSWORD` was
unset on the deploy that created the database — check the logs for
`SEED_ADMIN_PASSWORD is not set` — or `JWT_SECRET_KEY` changed since the token
was issued.

## Local development

See [`dev.sh`](dev.sh) and the README. Local credentials are development-only
values written into that script; they are deliberately not secrets and have no
bearing on a deployed environment.
