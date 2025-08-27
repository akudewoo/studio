-- supabase_schema.sql

-- 1. Cabang (Branches)
-- Menyimpan daftar cabang perusahaan.
drop table if exists "branches" cascade;
create table "branches" (
    "id" uuid primary key default gen_random_uuid(),
    "name" text not null unique
);
-- RLS for branches
alter table "branches" enable row level security;
create policy "Allow authenticated users to manage branches" on "branches" for all using (auth.role() = 'authenticated');
-- Seed data for branches
insert into "branches" (name) values ('MAGETAN'), ('SRAGEN');


-- 2. Produk (Products)
-- Menyimpan daftar produk yang dijual.
drop table if exists "products" cascade;
create table "products" (
    "id" uuid primary key default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "name" text not null,
    "purchasePrice" double precision not null default 0,
    "sellPrice" double precision not null default 0,
    "branchId" uuid not null references "branches"(id) on delete cascade
);
-- RLS for products
alter table "products" enable row level security;
create policy "Allow authenticated users to manage products" on "products" for all using (auth.role() = 'authenticated');


-- 3. Kios (Kiosks)
-- Menyimpan data kios pelanggan.
drop table if exists "kiosks" cascade;
create table "kiosks" (
    "id" uuid primary key default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "name" text not null,
    "address" text,
    "phone" text,
    "desa" text,
    "kecamatan" text,
    "penanggungJawab" text,
    "branchId" uuid not null references "branches"(id) on delete cascade
);
-- RLS for kiosks
alter table "kiosks" enable row level security;
create policy "Allow authenticated users to manage kiosks" on "kiosks" for all using (auth.role() = 'authenticated');


-- 4. Penebusan (Redemptions)
-- Mencatat penebusan pupuk dari supplier.
drop table if exists "redemptions" cascade;
create table "redemptions" (
    "id" uuid primary key default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "doNumber" text not null,
    "supplier" text,
    "date" date not null,
    "productId" uuid not null references "products"(id) on delete cascade,
    "quantity" double precision not null,
    "branchId" uuid not null references "branches"(id) on delete cascade
);
alter table "redemptions" add constraint redemptions_doNumber_branchId_unique unique ("doNumber", "branchId");
-- RLS for redemptions
alter table "redemptions" enable row level security;
create policy "Allow authenticated users to manage redemptions" on "redemptions" for all using (auth.role() = 'authenticated');


-- 5. Pengeluaran DO (DOReleases)
-- Mencatat pengeluaran barang dari gudang berdasarkan DO.
drop table if exists "doReleases" cascade;
create table "doReleases" (
    "id" uuid primary key default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "doNumber" text not null,
    "date" date not null,
    "quantity" double precision not null,
    "redemptionQuantity" double precision not null default 0,
    "branchId" uuid not null references "branches"(id) on delete cascade,
    foreign key ("doNumber", "branchId") references "redemptions"("doNumber", "branchId") on delete cascade
);
-- RLS for doReleases
alter table "doReleases" enable row level security;
create policy "Allow authenticated users to manage DO releases" on "doReleases" for all using (auth.role() = 'authenticated');


-- 6. Penyaluran Kios (KioskDistributions)
-- Mencatat penyaluran barang ke kios.
drop table if exists "kioskDistributions" cascade;
create table "kioskDistributions" (
    "id" uuid primary key default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "doNumber" text not null,
    "date" date not null,
    "kioskId" uuid not null references "kiosks"(id) on delete cascade,
    "namaSopir" text,
    "jamAngkut" text,
    "quantity" double precision not null,
    "directPayment" double precision not null default 0,
    "branchId" uuid not null references "branches"(id) on delete cascade
);
-- RLS for kioskDistributions
alter table "kioskDistributions" enable row level security;
create policy "Allow authenticated users to manage kiosk distributions" on "kioskDistributions" for all using (auth.role() = 'authenticated');


-- 7. Pembayaran (Payments)
-- Mencatat pembayaran tempo dari kios.
drop table if exists "payments" cascade;
create table "payments" (
    "id" uuid primary key default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "date" date not null,
    "doNumber" text not null,
    "kioskId" uuid not null references "kiosks"(id) on delete cascade,
    "amount" double precision not null,
    "branchId" uuid not null references "branches"(id) on delete cascade
);
-- RLS for payments
alter table "payments" enable row level security;
create policy "Allow authenticated users to manage payments" on "payments" for all using (auth.role() = 'authenticated');


-- 8. Kas Umum (KasUmum)
-- Buku kas umum untuk pemasukan dan pengeluaran di luar transaksi utama.
drop table if exists "kasUmum" cascade;
create table "kasUmum" (
    "id" uuid primary key default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "date" date not null,
    "description" text not null,
    "type" text not null, -- 'debit' or 'credit'
    "quantity" double precision not null default 1,
    "unitPrice" double precision not null,
    "total" double precision not null,
    "branchId" uuid not null references "branches"(id) on delete cascade
);
-- RLS for kasUmum
alter table "kasUmum" enable row level security;
create policy "Allow authenticated users to manage kas umum" on "kasUmum" for all using (auth.role() = 'authenticated');


-- 9. Kas Angkutan (KasAngkutan)
-- Buku kas khusus untuk biaya transportasi/angkutan.
drop table if exists "kasAngkutan" cascade;
create table "kasAngkutan" (
    "id" uuid primary key default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "date" date not null,
    "type" text not null, -- 'pemasukan' or 'pengeluaran'
    "uangMasuk" double precision not null default 0,
    "pengeluaran" double precision not null default 0,
    "doNumber" text,
    "namaSopir" text,
    "uraian" text not null,
    "adminFee" double precision not null default 0,
    "uangMakan" double precision not null default 0,
    "palang" double precision not null default 0,
    "solar" double precision not null default 0,
    "upahSopir" double precision not null default 0,
    "lembur" double precision not null default 0,
    "helper" double precision not null default 0,
    "branchId" uuid not null references "branches"(id) on delete cascade
);
-- RLS for kasAngkutan
alter table "kasAngkutan" enable row level security;
create policy "Allow authenticated users to manage kas angkutan" on "kasAngkutan" for all using (auth.role() = 'authenticated');
