# FundiGrid API (ASP.NET Core 10)

Replaces the former Node/Express backend. The REST contract is unchanged
except for the cleanup below; JWT secrets, bcrypt password hashes, the Postgres
schema, and the public base URL are all preserved.

## Run locally

```bash
cp .env.example .env   # fill DATABASE_URL, JWT_SECRET, ADMIN_*
dotnet run             # http://localhost:5000
```

`Program.cs` loads `.env` through DotNetEnv, but explicit environment
variables win. The API listens on `PORT` when set, otherwise on the URL from
`launchSettings.json` / `ASPNETCORE_URLS`.

Apply the schema (idempotent):

```bash
dotnet run -- --migrate
# or set RUN_MIGRATIONS=true to apply it on boot
```

## Layout

| Folder | Purpose |
|---|---|
| `Controllers/` | 1:1 with the old Express route modules |
| `Entities/` + `Data/` | EF Core model mapped onto `sql/schema.sql` |
| `Services/` | Auth, OTP/SMS, bookings, estimates, audit, mapping |
| `Hubs/` | SignalR realtime transport (replaces Socket.IO) |
| `Contracts/` | Response DTOs (camelCase, no snake_case columns) |

`sql/schema.sql` remains the source of truth; EF Core migrations are not used.

## Contract cleanup

- JSON is camelCase everywhere (`createdAt`, `updatedAt`).
- `id` only — the old `_id` fallbacks are gone.
- Optional fields are always present (`null` when absent).
- Removed unused placeholders: `GET /api/chat`, `GET /api/ai`,
  `GET /api/maps/route`, and the admin root `GET /api/admin`.
- Routes, `{ success, code?, message }` errors, and enum values are unchanged.

## Realtime

Hub: `/hubs/realtime` (JWT via `access_token` query or `Authorization` header).
Method and event names match the old Socket.IO ones: `user_connect`,
`update_location`, `accept_booking`, `decline_booking`, `negotiate_price`,
`join_conversation`, `leave_conversation`, `send_message`, `typing_start`,
`typing_stop`; server events include `fundi_location`, `booking_request`,
`booking_accepted`, `booking_declined`, `price_update`, `new_message`,
`new_message_notification`, `conversation_created`, `user_typing`,
`user_stopped_typing`, `error`.

## Deploy (Render)

Build the included `Dockerfile`. Configure the same environment variables as
`.env.example`, keep the existing service hostname (`fundigrid.onrender.com`),
and use `/api/health` as the health check. WebSockets work without extra
configuration; `PORT` is injected by Render and read by `Program.cs`.

## Tests

`dotnet build` is the CI gate. The migration was verified end-to-end against a
local Postgres with a full booking lifecycle, wallet/payment, reviews, admin
stats/audit, and a SignalR `fundi_location` round-trip.
