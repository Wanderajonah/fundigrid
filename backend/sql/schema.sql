-- Ufundi Postgres schema (migrates the MongoDB models 1:1).
-- Columns are camelCase and quoted to mirror the Mongoose field names so the
-- Mongoose-compatible shim stays thin. `migrate.js` runs this file idempotently.

create extension if not exists pgcrypto;

-- ============================================================
-- users
-- ============================================================
create table if not exists users (
  id              text primary key default gen_random_uuid()::text,
  "firstName"     text not null default '',
  "lastName"      text not null default '',
  gender          text not null default '',
  email           text,
  phone           text,
  password        text,
  role            text not null check (role in ('customer','fundi','admin')),
  "fundiEnabled"  boolean not null default false,
  "phoneVerified" boolean not null default false,
  "dateOfBirth"   timestamptz,
  "profilePhoto"  text not null default '',
  "coverPhoto"    text not null default '',
  "googleId"      text,
  "onboardingComplete" boolean not null default false,
  "isOnline"      boolean not null default false,
  "socketId"      text,
  location        jsonb not null default '{"lat":0,"lng":0}'::jsonb,
  "locationLabel" text not null default '',
  address         text not null default '',
  district        text not null default '',
  country         text not null default '',
  "searchRadiusKm" double precision not null default 10,
  status          text not null default 'active',
  skills          text[] not null default '{}',
  experience      double precision not null default 0,
  bio             text not null default '',
  "portfolioImages" text[] not null default '{}',
  "availableDays" text[] not null default '{}',
  "availableStartTime" text not null default '',
  "availableEndTime" text not null default '',
  "serviceRadius" double precision not null default 10,
  "verificationDocs" text[] not null default '{}',
  "referees"      jsonb not null default '[]'::jsonb,
  _meta           jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Idempotent upgrades for existing databases
alter table users add column if not exists "firstName" text not null default '';
alter table users add column if not exists "lastName" text not null default '';
alter table users drop column if exists "pushToken";          -- never read by the app
alter table users add column if not exists gender text not null default '';
alter table users add column if not exists "availableDays" text[] not null default '{}';
alter table users add column if not exists "availableStartTime" text not null default '';
alter table users add column if not exists "availableEndTime" text not null default '';
alter table users add column if not exists "serviceRadius" double precision not null default 10;
alter table users add column if not exists "verificationDocs" text[] not null default '{}';
alter table users add column if not exists "referees" jsonb not null default '[]'::jsonb;

-- Password sign-in lockout (mobile). 5 wrong attempts lock the account for
-- 10 minutes; 3 such batches leave `passwordBlocked` set until the owner
-- resets through the forgot-password flow.
alter table users add column if not exists "failedLoginAttempts" integer not null default 0;
alter table users add column if not exists "lockedUntil"        timestamptz;
alter table users add column if not exists "lockoutBatches"     integer not null default 0;
alter table users add column if not exists "passwordBlocked"    boolean not null default false;

-- Names are stored as two fields now. Split any legacy `name` into first and
-- last, then drop the column so nothing can read it back.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'users' and column_name = 'name'
  ) then
    update users
       set "firstName" = btrim(split_part(name, ' ', 1)),
           "lastName"  = btrim(substr(name, length(split_part(name, ' ', 1)) + 1))
     where coalesce(name, '') <> ''
       and "firstName" = ''
       and "lastName" = '';
    alter table users drop column name;
  end if;
end $$;

-- `add column if not exists` cannot fix a column that already exists with the
-- wrong type, so repair `serviceRadius` when an older migration created it as text.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'users'
      and column_name = 'serviceRadius' and data_type = 'text'
  ) then
    alter table users
      alter column "serviceRadius" type double precision
      using nullif("serviceRadius", '')::double precision;
    alter table users alter column "serviceRadius" set default 10;
    update users set "serviceRadius" = 10 where "serviceRadius" is null;
    alter table users alter column "serviceRadius" set not null;
  end if;
end $$;

-- `location` must be a {lat,lng} object; older rows stored a bare JSON string.
update users
   set location = '{"lat":0,"lng":0}'::jsonb
 where jsonb_typeof(location) is distinct from 'object';

-- Tables left behind by earlier iterations of the schema and never read by the app.
drop table if exists referees cascade;

create unique index if not exists users_email_uq   on users (email)   where email is not null;
create unique index if not exists users_phone_uq   on users (phone)   where phone is not null;
create unique index if not exists users_google_uq  on users ("googleId") where "googleId" is not null;

-- Lookup paths used by registration/login (by phone) and by the fundi directory.
create index if not exists users_role_status_idx  on users (role, status);
create index if not exists users_skills_gin       on users using gin (skills);

-- ============================================================
-- fundiprofiles
-- ============================================================
create table if not exists fundiprofiles (
  id                     text primary key default gen_random_uuid()::text,
  "userId"               text not null unique references users (id),
  skills                 text[] not null default '{}',
  experience             double precision not null default 0,
  rating                 double precision not null default 0,
  "jobsCompleted"        double precision not null default 0,
  verified               boolean not null default false,
  "verificationStatus"   text not null default 'unverified' check ("verificationStatus" in ('unverified','pending','verified','rejected')),
  "verificationDocs"     text[] not null default '{}',
  "verificationNotes"    text not null default '',
  "requestedAt"          timestamptz,
  "reviewedAt"           timestamptz,
  "portfolioImages"      text[] not null default '{}',
  "currentLocation"      jsonb not null default '{}'::jsonb,
  "isAvailable"          boolean not null default true,
  "availableForNegotiation" boolean not null default false,
  bio                     text not null default '',
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- ============================================================
-- bookings
-- ============================================================
create table if not exists bookings (
  id                 text primary key default gen_random_uuid()::text,
  "clientId"         text not null references users (id),
  "fundiId"          text references users (id),
  "fundiName"        text not null default '',
  "scheduledFor"     timestamptz,
  category           text not null,
  description        text not null,
  address            text not null,
  location           jsonb not null default '{"lat":0,"lng":0}'::jsonb,
  status             text not null default 'PENDING' check (status in ('PENDING','ACCEPTED','ON_THE_WAY','ARRIVED','IN_PROGRESS','COMPLETED','CANCELLED','DISPUTED')),
  "cancelledBy"      text check ("cancelledBy" in ('CLIENT','FUNDI','SYSTEM')),
  "cancellationReason" text,
  "disputeReason"    text,
  "notifiedFundis"   jsonb not null default '[]'::jsonb,
  "currentFundiIndex" double precision not null default 0,
  "expiresAt"        timestamptz,
  "acceptedAt"       timestamptz,
  "onTheWayAt"       timestamptz,
  "arrivedAt"        timestamptz,
  "startedAt"        timestamptz,
  "completedAt"      timestamptz,
  "clientCompleted"  boolean not null default false,
  "fundiCompleted"   boolean not null default false,
  "clientCompletedAt" timestamptz,
  "fundiCompletedAt"  timestamptz,
  "cancelledAt"      timestamptz,
  "fundiLocation"    jsonb not null default '{}'::jsonb,
  images             text[] not null default '{}',
  "estimatedDuration" double precision not null default 60,
  "actualDuration"   double precision,
  "estimate"         jsonb,
  "proposedPrice"    double precision,
  "proposedBy"       text check ("proposedBy" in ('CLIENT','FUNDI')),
  "clientPriceAgreed" boolean not null default false,
  "fundiPriceAgreed"  boolean not null default false,
  "agreedPrice"      double precision,
  "priceAgreed"      boolean not null default false,
  "paymentStatus"    text not null default 'unpaid' check ("paymentStatus" in ('unpaid','held','released','refunded')),
  "escrowHeldAt"     timestamptz,
  "escrowReleasedAt" timestamptz,
  "escrowAmount"     double precision,
  "clientFee"        double precision not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- Idempotent upgrades for existing databases
alter table bookings add column if not exists "fundiName" text not null default '';
alter table bookings add column if not exists "scheduledFor" timestamptz;
alter table bookings add column if not exists "estimate" jsonb;

-- The quantity-surveyor stage is gone. Clients deal with fundis directly and
-- the fundi quotes the price after seeing the site, so a request reaches fundis
-- the moment it is created. Drop the columns the stage wrote — the foreign key
-- and its index go with "surveyorId" — delete any surveyor accounts, then
-- tighten the role check so no new ones can appear. Bookings that were waiting
-- on a surveyor simply become live requests; their old `estimate` jsonb stays
-- as the amount payment falls back to.
alter table bookings drop column if exists "surveyorId";
alter table bookings drop column if exists "surveyorName";
alter table bookings drop column if exists "surveyStatus";
alter table bookings drop column if exists "assignedAt";
alter table bookings drop column if exists "estimateSubmittedAt";
alter table bookings drop column if exists "estimateBy";

create index if not exists bookings_client_idx on bookings ("clientId");
create index if not exists bookings_fundi_idx on bookings ("fundiId");
create index if not exists bookings_expires_idx on bookings ("expiresAt");

-- ============================================================
-- jobs
-- ============================================================
create table if not exists jobs (
  id           text primary key default gen_random_uuid()::text,
  "customerId" text not null references users (id),
  "fundiId"    text references users (id),
  description  text not null,
  category     text not null,
  location     jsonb not null default '{"lat":0,"lng":0}'::jsonb,
  "imageUrl"   text not null default '',
  "quoteAmount" double precision not null default 0,
  status       text not null default 'open' check (status in ('open','quoted','accepted','in_progress','completed','cancelled')),
  address      text not null default '',
  amount       double precision not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists jobs_customer_idx on jobs ("customerId");
create index if not exists jobs_fundi_idx on jobs ("fundiId");

-- ============================================================
-- conversations
-- ============================================================
create table if not exists conversations (
  id            text primary key default gen_random_uuid()::text,
  participants  text[] not null default '{}',
  "bookingId"   text references bookings (id),
  type          text not null default 'booking' check (type in ('booking','support')),
  "lastMessage"  text not null default '',
  "lastSenderId" text references users (id),
  "lastMessageAt" timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists conversations_participants_idx on conversations using gin (participants);
create index if not exists conversations_booking_idx on conversations ("bookingId");
create index if not exists conversations_updated_idx on conversations (updated_at);

-- ============================================================
-- messages
-- ============================================================
create table if not exists messages (
  id              text primary key default gen_random_uuid()::text,
  "conversationId" text not null references conversations (id),
  "senderId"      text not null references users (id),
  text            text not null default '',
  "imageUrl"      text,
  read            boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists messages_conversation_idx on messages ("conversationId", created_at);

-- ============================================================
-- reviews
-- ============================================================
create table if not exists reviews (
  id           text primary key default gen_random_uuid()::text,
  "fundiId"    text not null references users (id),
  "customerId" text not null references users (id),
  "jobId"      text references jobs (id),
  rating       double precision not null check (rating >= 1 and rating <= 5),
  comment      text not null default '',
  "photoUrls"  text[] not null default '{}',
  service      text not null default '',
  amount       double precision not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create unique index if not exists reviews_job_customer_uq on reviews ("jobId", "customerId") where "jobId" is not null;

-- Bookings are the live job table (jobs is the older quote flow), so reviews
-- link back through bookingId. One review per client per booking.
alter table reviews add column if not exists "bookingId" text references bookings (id);
create unique index if not exists reviews_booking_customer_uq on reviews ("bookingId", "customerId") where "bookingId" is not null;

-- ============================================================
-- wallets
-- ============================================================
create table if not exists wallets (
  id           text primary key default gen_random_uuid()::text,
  "userId"     text not null unique references users (id),
  balance      double precision not null default 0 check (balance >= 0),
  "heldBalance" double precision not null default 0 check ("heldBalance" >= 0),
  currency     text not null default 'UGX',
  status       text not null default 'active' check (status in ('active','frozen')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ============================================================
-- transactions
-- ============================================================
create table if not exists transactions (
  id              text primary key default gen_random_uuid()::text,
  "walletId"      text not null references wallets (id),
  "userId"        text not null references users (id),
  type            text not null check (type in ('deposit','withdrawal','payment','payment_received','refund','transfer_in','transfer_out','escrow_hold','escrow_release','escrow_refund','platform_fee')),
  amount          double precision not null check (amount >= 0),
  currency        text not null default 'UGX',
  reference       text,
  description     text not null default '',
  status          text not null default 'completed' check (status in ('pending','completed','failed','cancelled')),
  "relatedBooking" text references bookings (id),
  "relatedUser"   text references users (id),
  "balanceBefore" double precision not null default 0,
  "balanceAfter"  double precision not null default 0,
  "paymentMethod" text not null default '',
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create unique index if not exists transactions_reference_uq on transactions (reference) where reference is not null;
create index if not exists transactions_wallet_idx on transactions ("walletId", created_at);
create index if not exists transactions_user_idx on transactions ("userId", created_at);

-- ============================================================
-- otps
-- ============================================================
create table if not exists otps (
  id          text primary key default gen_random_uuid()::text,
  phone       text not null,
  purpose     text not null check (purpose in ('register','reset')),
  "codeHash"  text not null,
  "expiresAt" timestamptz not null,
  attempts    double precision not null default 0,
  "lastSentAt" timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (phone, purpose)
);

-- Older installs still allow only ('register','login'); OTP is now used for
-- phone verification (register) and password reset (reset) only.
delete from otps where purpose not in ('register','reset');
alter table otps drop constraint if exists otps_purpose_check;
alter table otps add constraint otps_purpose_check check (purpose in ('register','reset'));

-- ============================================================
-- email_otps
-- ============================================================
create table if not exists email_otps (
  id          text primary key default gen_random_uuid()::text,
  email       text not null,
  purpose     text not null check (purpose in ('login')),
  "codeHash"  text not null,
  "expiresAt" timestamptz not null,
  attempts    double precision not null default 0,
  "lastSentAt" timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (email, purpose)
);

-- ============================================================
-- platform_settings
-- ============================================================
create table if not exists platform_settings (
  id                    text primary key default gen_random_uuid()::text,
  "adminName"           text not null default 'Admin User',
  "adminEmail"          text not null default 'admin@ufundi.com',
  "adminRole"           text not null default 'Super Admin',
  "commissionRate"      double precision not null default 0,
  "clientFeeRate"       double precision not null default 5,
  "minJobAmount"        double precision not null default 500,
  "serviceRadius"       double precision not null default 25,
  "autoApprovalFundis"  text not null default '10 successful jobs',
  "disputeResolution"   text not null default '48 hours',
  notifications         jsonb not null default '[]'::jsonb,
  "paymentIntegrations" jsonb not null default '[]'::jsonb,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ============================================================
-- admin_notifications
-- ============================================================
create table if not exists admin_notifications (
  id         text primary key default gen_random_uuid()::text,
  type       text not null check (type in ('verification_approved','verification_rejected','info')),
  message    text not null,
  "relatedId" text references users (id),
  read       boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists admin_notifications_read_idx on admin_notifications (read, created_at);

-- ============================================================
-- notifications (per-user in-app notification feed for the bell icon)
-- ============================================================
create table if not exists notifications (
  id         text primary key default gen_random_uuid()::text,
  "userId"   text not null references users (id) on delete cascade,
  type       text not null check (type in ('booking','message','system')),
  title      text not null,
  body       text not null default '',
  data       jsonb not null default '{}'::jsonb,
  read       boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notifications_user_read_idx
  on notifications ("userId", read, created_at desc);

-- ============================================================
-- audit_logs (append-only trail behind /admin/audit)
-- Deliberately no foreign key on "actorId": the trail must outlive the
-- account it describes (deleted users, failed sign-ins with no user row).
-- ============================================================
create table if not exists audit_logs (
  id          text primary key default gen_random_uuid()::text,
  "actorId"   text,
  "actorName" text not null default '',
  "actorRole" text not null default '',
  action      text not null,
  category    text not null default 'users'
              check (category in ('auth','users','verifications','jobs','bookings','settings')),
  "entityType" text not null default '',
  "entityId"  text not null default '',
  summary     text not null default '',
  "ipAddress" text not null default '',
  "userAgent" text not null default '',
  meta        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists audit_logs_created_idx on audit_logs (created_at desc);
create index if not exists audit_logs_category_idx on audit_logs (category, created_at desc);
create index if not exists audit_logs_action_idx   on audit_logs (action, created_at desc);

-- ============================================================
-- Directory & booking lookup indexes
-- ============================================================
create index if not exists fundiprofiles_skills_gin on fundiprofiles using gin (skills);
create index if not exists fundiprofiles_user_uq    on fundiprofiles ("userId");
create index if not exists bookings_client_idx      on bookings ("clientId", created_at desc);
create index if not exists bookings_fundi_idx       on bookings ("fundiId", created_at desc);
create index if not exists bookings_status_idx      on bookings (status, created_at desc);

-- ============================================================
-- Retire the surveyor role
-- ============================================================
-- Runs after every table exists so the cleanup can reach everything the
-- account ever touched. Deleting the user would trip a foreign key on any row
-- that points the other way (a booking it joined as client or fundi), so that
-- history is left for a human to review — only the account's own output goes.
do $$
declare
  sid text;
begin
  for sid in select id from users where role = 'surveyor' loop
    delete from messages      where "senderId" = sid;
    delete from transactions  where "userId" = sid
                               or "walletId" in (select id from wallets where "userId" = sid);
    delete from wallets       where "userId" = sid;
    delete from fundiprofiles where "userId" = sid;
    delete from reviews       where "fundiId" = sid or "customerId" = sid;
    delete from audit_logs    where "actorId" = sid
                               or "actorRole" = 'surveyor'
                               or action like 'surveyor.%';
    delete from users         where id = sid;
  end loop;
end $$;

-- `create table if not exists` never touches the check constraint on a database
-- that already exists, so replace it once the surveyor rows are gone.
do $$
begin
  alter table users drop constraint if exists users_role_check;
  alter table users
    add constraint users_role_check
    check (role in ('customer','fundi','admin'));
end $$;

-- ============================================================
-- Row Level Security
-- ============================================================
-- The backend always connects with the service role key, which bypasses RLS.
-- Enabling RLS only affects anon/authenticated keys (no direct client access).
alter table users                 enable row level security;
alter table fundiprofiles         enable row level security;
alter table bookings              enable row level security;
alter table jobs                  enable row level security;
alter table conversations         enable row level security;
alter table messages              enable row level security;
alter table reviews               enable row level security;
alter table wallets               enable row level security;
alter table transactions          enable row level security;
alter table otps                  enable row level security;
alter table email_otps            enable row level security;
alter table platform_settings     enable row level security;
alter table admin_notifications   enable row level security;
alter table notifications         enable row level security;
alter table audit_logs            enable row level security;

-- Optional cleanup jobs (requires the pg_cron extension):
--   create extension if not exists pg_cron;
--   select cron.schedule('expire-old-otps', '0 * * * *',
--     $$delete from otps where "expiresAt" < now() - interval '1 day'$$);
--   select cron.schedule('expire-old-email-otps', '0 * * * *',
--     $$delete from email_otps where "expiresAt" < now() - interval '1 day'$$);
--   select cron.schedule('auto-cancel-expired-bookings', '*/5 * * * *',
--     $$update bookings set status='CANCELLED', "cancelledBy"='SYSTEM', "cancellationReason"='Expired' where status='PENDING' and "expiresAt" < now()$$);