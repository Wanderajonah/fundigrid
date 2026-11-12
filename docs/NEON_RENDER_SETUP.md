# Neon + Render setup — exact steps

Target architecture:

```
Expo mobile ─┐
             ├── https://fundigrid.onrender.com/api  (Render, Docker, Frankfurt)
Vercel web ──┘                 │
                               └── Neon Postgres (eu-central-1 / Frankfurt)
```

Keep the API and the database in the **same region** (Frankfurt / `eu-central-1`).

---

## 0. Before you start

Collect these from the current Node service on Render (Settings → Environment):

- `JWT_SECRET` — **must be copied exactly**, or every existing session is invalidated
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`
- `COMMS_USERNAME`, `COMMS_API_KEY` (EgoSMS)
- `GOOGLE_WEB_CLIENT_ID`, `GOOGLE_MAPS_API_KEY`

Do this before deleting or replacing the old service.

---

## 1. Create the Neon database

1. Go to <https://neon.tech> and sign in.
2. **Create project**:
   - Name: `fundigrid`
   - Postgres version: 17 (default)
   - Region: **AWS eu-central-1 (Frankfurt)** — matches Render `frankfurt`
3. On the project dashboard, click **Connect**.
4. Turn **Connection pooling** on.
5. Copy the **pooled** connection string. It looks like:

   ```
   postgresql://neondb_owner:<password>@ep-xxx-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```

   It must contain `-pooler` and `sslmode=require`.

> Neon free plan: 100 CU-hours/project/month and roughly 0.5–1 GB storage.
> Compute auto-suspends after ~5 minutes idle and wakes on the next query.

---

## 2. Apply the schema from your laptop

```bash
cd backend
export DATABASE_URL="postgresql://...-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require"

# Optional: verify connectivity
psql "$DATABASE_URL" -c "select version();"

# Apply sql/schema.sql (idempotent)
dotnet run -- --migrate

# Verify tables
psql "$DATABASE_URL" -c "\dt"
```

You should see `users`, `bookings`, `wallets`, `transactions`, `otps`, etc.

> If you restored an old Supabase project and want its data in Neon, dump and
> restore first, then run `--migrate`:
> ```bash
> pg_dump "$OLD_SUPABASE_URL" --no-owner --no-privileges -f fundigrid.sql
> psql "$NEON_DATABASE_URL" -f fundigrid.sql
> dotnet run -- --migrate
> ```

---

## 3. Deploy the API to Render

### 3a. Push the branch

The blueprint lives at the repo root (`render.yaml`). Make sure it is on the
branch you deploy:

```bash
git push origin feat/aspnet-backend
```

### 3b. Create the Blueprint

1. Render Dashboard → **New → Blueprint**.
2. Select the `fundigrid/fundigrid` repository.
3. Select branch `feat/aspnet-backend` (or `main` after merging).
4. Render reads `render.yaml` and asks for the `sync: false` values:

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | Neon **pooled** connection string from step 1 |
   | `JWT_SECRET` | copied from the old Node service |
   | `ADMIN_EMAIL` | admin sign-in email |
   | `ADMIN_PASSWORD` | admin password |
   | `COMMS_USERNAME` | EgoSMS username |
   | `COMMS_API_KEY` | EgoSMS API key |
   | `GOOGLE_WEB_CLIENT_ID` | Google OAuth client id |
   | `GOOGLE_MAPS_API_KEY` | Google Maps key |

5. Click **Apply**.

The blueprint creates a Docker web service named `fundigrid` with:
- Root directory `backend`
- Dockerfile `./Dockerfile`
- Health check `/api/health`
- Region `frankfurt`
- `RUN_MIGRATIONS=true` for the first deploy
- `ASPNETCORE_ENVIRONMENT=Production`
- `COMMS_DEV_MODE=false`

> **Name conflict?** If a Node service named `fundigrid` already exists, Render
> may refuse the name. Two options:
> - Delete the old service first (after copying its env vars), then apply the
>   blueprint — the hostname `fundigrid.onrender.com` is reused.
> - Or temporarily rename the blueprint service to `fundigrid-api`, verify it,
>   then delete the old service and rename the new one to `fundigrid`.

### 3c. Watch the first deploy

In the Render logs you should see:

```
Schema applied from .../sql/schema.sql
Admin user ready: ...
Now listening on: http://0.0.0.0:<port>
```

If the schema was already applied in step 2, that line is harmless.

---

## 4. Verify

```bash
curl https://fundigrid.onrender.com/api/health
# {"status":"ok","service":"Ufundi API",...}
```

Then:

1. Open the web admin and sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
2. Create or list a fundi, open a booking, check wallet balances.
3. On mobile, sign in and confirm job tracking receives `fundi_location`.

---

## 5. Turn migrations off

After the first successful deploy, set `RUN_MIGRATIONS` to `false`:

- Edit `render.yaml` → change `"true"` to `"false"` → commit/push, **or**
- Render Dashboard → service → Environment → edit `RUN_MIGRATIONS` → save.

The schema is idempotent, but running it on every boot briefly locks tables.
For future schema changes, prefer a Render **pre-deploy command**:

```
dotnet /app/FundiGrid.Api.dll --migrate
```

---

## 6. Clients

The hostname is unchanged (`fundigrid.onrender.com`), so no URL edits are
needed:

- **Web:** `.github/workflows/deploy.yml` already sets
  `VITE_API_URL=https://fundigrid.onrender.com/api`. Push to `main` to deploy.
- **Mobile:** `mobile/eas.json` now sets `EXPO_PUBLIC_API_URL` in the
  **production** profile too. Build and submit:
  ```bash
  cd mobile
  npx eas build --platform android --profile production
  npx eas submit --platform android --profile production
  ```

---

## 7. Post-launch checks

- [ ] `https://fundigrid.onrender.com/api/health` returns `status: ok`
- [ ] Admin login works
- [ ] A new client can request OTP and sign up
- [ ] A booking reaches a fundi and can be accepted
- [ ] Payment + wallet credit + receipt work
- [ ] SignalR location updates reach the client
- [ ] Neon dashboard shows normal compute/storage usage
- [ ] `RUN_MIGRATIONS=false` after the first deploy
- [ ] `COMMS_LOG_OTP=false` once SMS delivery is trusted

---

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `tenant/user ... not found` | `DATABASE_URL` still points at the old Supabase project |
| `password authentication failed` | URL-encode special characters in the Neon password |
| `SSL required` | Add `?sslmode=require` to the Neon URL |
| Deploy fails: port bind | Do **not** set `PORT`; Render injects it and `Program.cs` binds to it |
| Health check fails | Check logs for a startup exception; verify `DATABASE_URL` and `JWT_SECRET` are set |
| 500s after ~30 days | Old Render free Postgres expired — you should be on Neon, so check the URL |
| Neon compute suspended | 100 CU-hours used for the month; upgrade to Launch or wait for the next cycle |
| Old sessions invalid | `JWT_SECRET` differs from the Node service |
| Mobile calls localhost | Production EAS build missing `EXPO_PUBLIC_API_URL`; `eas.json` is now fixed |

---

## Cost expectations (small production)

| Item | Plan | Approx. |
|---|---|---|
| Render web service | Starter (or free for testing) | $7/mo (free sleeps) |
| Neon Postgres | Free → Launch usage-based | $0 → ~$5–15/mo |
| Vercel web | Free/Pro | $0 → $20/mo |
| EAS builds | Free tier | $0 (limited builds) |

Upgrade Render to Starter before real users; the free instance sleeps after 15
minutes and the first request takes ~1 minute to wake.
