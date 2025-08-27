-- 1. Tabel Cabang (Branches)
CREATE TABLE branches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL
);

-- Masukkan data cabang awal
INSERT INTO branches (name) VALUES ('MAGETAN'), ('SRAGEN');


-- 2. Tabel Produk (Products)
CREATE TABLE products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    name text NOT NULL,
    purchasePrice numeric NOT NULL,
    sellPrice numeric NOT NULL,
    branchId uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE
);

-- 3. Tabel Kios (Kiosks)
CREATE TABLE kiosks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    name text NOT NULL,
    address text NOT NULL,
    phone text NOT NULL,
    desa text NOT NULL,
    kecamatan text NOT NULL,
    penanggungJawab text NOT NULL,
    branchId uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE
);

-- 4. Tabel Penebusan (Redemptions)
CREATE TABLE redemptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    doNumber text NOT NULL UNIQUE,
    supplier text NOT NULL,
    date date NOT NULL,
    productId uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity integer NOT NULL,
    branchId uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE
);

-- 5. Tabel Pengeluaran DO (DOReleases)
CREATE TABLE doReleases (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    doNumber text NOT NULL REFERENCES redemptions(doNumber) ON DELETE CASCADE,
    date date NOT NULL,
    quantity integer NOT NULL,
    redemptionQuantity integer NOT NULL,
    branchId uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE
);

-- 6. Tabel Penyaluran Kios (KioskDistributions)
CREATE TABLE kioskDistributions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    doNumber text NOT NULL REFERENCES redemptions(doNumber) ON DELETE CASCADE,
    date date NOT NULL,
    kioskId uuid NOT NULL REFERENCES kiosks(id) ON DELETE CASCADE,
    namaSopir text NOT NULL,
    jamAngkut text NOT NULL,
    quantity integer NOT NULL,
    directPayment numeric NOT NULL,
    branchId uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE
);

-- 7. Tabel Pembayaran (Payments)
CREATE TABLE payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    date date NOT NULL,
    doNumber text NOT NULL REFERENCES redemptions(doNumber) ON DELETE CASCADE,
    kioskId uuid NOT NULL REFERENCES kiosks(id) ON DELETE CASCADE,
    amount numeric NOT NULL,
    branchId uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE
);

-- 8. Tabel Kas Umum (KasUmum)
CREATE TABLE kasUmum (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    date date NOT NULL,
    description text NOT NULL,
    type text NOT NULL CHECK (type IN ('debit', 'credit')),
    quantity integer NOT NULL,
    unitPrice numeric NOT NULL,
    total numeric NOT NULL,
    branchId uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE
);

-- 9. Tabel Kas Angkutan (KasAngkutan)
CREATE TABLE kasAngkutan (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    date date NOT NULL,
    type text NOT NULL CHECK (type IN ('pemasukan', 'pengeluaran')),
    uangMasuk numeric DEFAULT 0 NOT NULL,
    pengeluaran numeric DEFAULT 0 NOT NULL,
    doNumber text,
    namaSopir text,
    uraian text NOT NULL,
    adminFee numeric DEFAULT 0 NOT NULL,
    uangMakan numeric DEFAULT 0 NOT NULL,
    palang numeric DEFAULT 0 NOT NULL,
    solar numeric DEFAULT 0 NOT NULL,
    upahSopir numeric DEFAULT 0 NOT NULL,
    lembur numeric DEFAULT 0 NOT NULL,
    helper numeric DEFAULT 0 NOT NULL,
    branchId uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE
);

-- AKTIFKAN ROW LEVEL SECURITY & BUAT KEBIJAKAN (POLICIES)
-- Ini mengizinkan pengguna yang sudah login untuk mengakses data.

ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow logged-in users to read branches" ON branches FOR SELECT USING (auth.role() = 'authenticated');

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow logged-in users to manage products" ON products FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE kiosks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow logged-in users to manage kiosks" ON kiosks FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow logged-in users to manage redemptions" ON redemptions FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE doReleases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow logged-in users to manage DO releases" ON doReleases FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE kioskDistributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow logged-in users to manage kiosk distributions" ON kioskDistributions FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow logged-in users to manage payments" ON payments FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE kasUmum ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow logged-in users to manage kas umum" ON kasUmum FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE kasAngkutan ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow logged-in users to manage kas angkutan" ON kasAngkutan FOR ALL USING (auth.role() = 'authenticated');