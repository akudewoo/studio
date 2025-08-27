-- 1. Tabel Cabang (Branches)
-- Harus dibuat pertama kali karena tabel lain merujuk ke sini.
CREATE TABLE branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE
);

-- Memasukkan data cabang awal
INSERT INTO branches (name) VALUES ('MAGETAN'), ('SRAGEN');


-- 2. Tabel Produk (Products)
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  name text NOT NULL,
  "purchasePrice" numeric NOT NULL,
  "sellPrice" numeric NOT NULL,
  "branchId" uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE
);


-- 3. Tabel Kios (Kiosks)
CREATE TABLE kiosks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  name text NOT NULL,
  address text NOT NULL,
  phone text,
  desa text,
  kecamatan text,
  "penanggungJawab" text,
  "branchId" uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE
);


-- 4. Tabel Penebusan (Redemptions)
CREATE TABLE redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  "doNumber" text NOT NULL UNIQUE,
  supplier text NOT NULL,
  date timestamptz NOT NULL,
  "productId" uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity numeric NOT NULL,
  "branchId" uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE
);


-- 5. Tabel Pengeluaran DO (DOReleases)
CREATE TABLE "doReleases" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  "doNumber" text NOT NULL REFERENCES redemptions("doNumber") ON DELETE CASCADE,
  date timestamptz NOT NULL,
  quantity numeric NOT NULL,
  "redemptionQuantity" numeric NOT NULL,
  "branchId" uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE
);


-- 6. Tabel Penyaluran Kios (KioskDistributions)
CREATE TABLE "kioskDistributions" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  "doNumber" text NOT NULL REFERENCES redemptions("doNumber") ON DELETE CASCADE,
  date timestamptz NOT NULL,
  "kioskId" uuid NOT NULL REFERENCES kiosks(id) ON DELETE RESTRICT,
  "namaSopir" text,
  "jamAngkut" text,
  quantity numeric NOT NULL,
  "directPayment" numeric DEFAULT 0,
  "branchId" uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE
);


-- 7. Tabel Pembayaran (Payments)
CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  date timestamptz NOT NULL,
  "doNumber" text NOT NULL,
  "kioskId" uuid NOT NULL REFERENCES kiosks(id) ON DELETE RESTRICT,
  amount numeric NOT NULL,
  "branchId" uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE
);


-- 8. Tabel Kas Umum (KasUmum)
CREATE TABLE "kasUmum" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  date timestamptz NOT NULL,
  description text,
  type text NOT NULL, -- 'debit' or 'credit'
  quantity numeric NOT NULL,
  "unitPrice" numeric NOT NULL,
  total numeric NOT NULL,
  "branchId" uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE
);


-- 9. Tabel Kas Angkutan (KasAngkutan)
CREATE TABLE "kasAngkutan" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  date timestamptz NOT NULL,
  type text NOT NULL, -- 'pemasukan' or 'pengeluaran'
  "uangMasuk" numeric DEFAULT 0,
  pengeluaran numeric DEFAULT 0,
  "doNumber" text,
  "namaSopir" text,
  uraian text,
  "adminFee" numeric DEFAULT 0,
  "uangMakan" numeric DEFAULT 0,
  palang numeric DEFAULT 0,
  solar numeric DEFAULT 0,
  "upahSopir" numeric DEFAULT 0,
  lembur numeric DEFAULT 0,
  helper numeric DEFAULT 0,
  "branchId" uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  "distributionId" uuid REFERENCES "kioskDistributions"(id) ON DELETE SET NULL
);