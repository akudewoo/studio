
-- 1. Tabel Cabang (Branches)
CREATE TABLE branches (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Masukkan data cabang awal
INSERT INTO branches (id, name) VALUES
('magetan-01', 'MAGETAN'),
('sragen-02', 'SRAGEN');

-- 2. Tabel Produk (Products)
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    name TEXT NOT NULL,
    purchasePrice NUMERIC NOT NULL,
    sellPrice NUMERIC NOT NULL,
    branchId TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE
);

-- 3. Tabel Kios (Kiosks)
CREATE TABLE kiosks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    phone TEXT NOT NULL,
    desa TEXT NOT NULL,
    kecamatan TEXT NOT NULL,
    penanggungJawab TEXT NOT NULL,
    branchId TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE
);

-- 4. Tabel Penebusan (Redemptions)
CREATE TABLE redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    doNumber TEXT NOT NULL UNIQUE,
    supplier TEXT NOT NULL,
    date TIMESTAMPTZ NOT NULL,
    productId UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity NUMERIC NOT NULL,
    branchId TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE
);

-- 5. Tabel Pengeluaran DO (DO Releases)
CREATE TABLE doReleases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    doNumber TEXT NOT NULL REFERENCES redemptions(doNumber) ON DELETE CASCADE,
    date TIMESTAMPTZ NOT NULL,
    quantity NUMERIC NOT NULL,
    redemptionQuantity NUMERIC NOT NULL,
    branchId TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE
);

-- 6. Tabel Penyaluran Kios (Kiosk Distributions)
CREATE TABLE kioskDistributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    doNumber TEXT NOT NULL, -- Tidak bisa direct reference karena 1 DO bisa ke banyak kios
    date TIMESTAMPTZ NOT NULL,
    kioskId UUID NOT NULL REFERENCES kiosks(id) ON DELETE RESTRICT,
    namaSopir TEXT NOT NULL,
    jamAngkut TEXT NOT NULL, -- Format "HH:mm"
    quantity NUMERIC NOT NULL,
    directPayment NUMERIC NOT NULL DEFAULT 0,
    branchId TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE
);

-- 7. Tabel Pembayaran (Payments)
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    date TIMESTAMPTZ NOT NULL,
    doNumber TEXT NOT NULL,
    kioskId UUID NOT NULL REFERENCES kiosks(id) ON DELETE RESTRICT,
    amount NUMERIC NOT NULL,
    branchId TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE
);

-- 8. Tabel Kas Umum (Kas Umum)
CREATE TABLE kasUmum (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    date TIMESTAMPTZ NOT NULL,
    description TEXT NOT NULL,
    type TEXT NOT NULL, -- 'debit' or 'credit'
    quantity NUMERIC NOT NULL,
    unitPrice NUMERIC NOT NULL,
    total NUMERIC NOT NULL,
    branchId TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE
);

-- 9. Tabel Kas Angkutan (Kas Angkutan)
CREATE TABLE kasAngkutan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    date TIMESTAMPTZ NOT NULL,
    type TEXT NOT NULL, -- 'pemasukan' or 'pengeluaran'
    uangMasuk NUMERIC NOT NULL DEFAULT 0,
    pengeluaran NUMERIC NOT NULL DEFAULT 0,
    distributionId UUID REFERENCES kioskDistributions(id) ON DELETE SET NULL,
    doNumber TEXT,
    namaSopir TEXT,
    uraian TEXT NOT NULL,
    adminFee NUMERIC NOT NULL DEFAULT 0,
    uangMakan NUMERIC NOT NULL DEFAULT 0,
    palang NUMERIC NOT NULL DEFAULT 0,
    solar NUMERIC NOT NULL DEFAULT 0,
    upahSopir NUMERIC NOT NULL DEFAULT 0,
    lembur NUMERIC NOT NULL DEFAULT 0,
    helper NUMERIC NOT NULL DEFAULT 0,
    branchId TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE
);

-- Enable Row Level Security for all tables
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE kiosks ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE doReleases ENABLE ROW LEVEL SECURITY;
ALTER TABLE kioskDistributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE kasUmum ENABLE ROW LEVEL SECURITY;
ALTER TABLE kasAngkutan ENABLE ROW LEVEL SECURITY;

-- Create public access policies for all tables
CREATE POLICY "Public access for all" ON branches FOR SELECT USING (true);
CREATE POLICY "Public access for all" ON products FOR SELECT USING (true);
CREATE POLICY "Public access for all" ON kiosks FOR SELECT USING (true);
CREATE POLICY "Public access for all" ON redemptions FOR SELECT USING (true);
CREATE POLICY "Public access for all" ON doReleases FOR SELECT USING (true);
CREATE POLICY "Public access for all" ON kioskDistributions FOR SELECT USING (true);
CREATE POLICY "Public access for all" ON payments FOR SELECT USING (true);
CREATE POLICY "Public access for all" ON kasUmum FOR SELECT USING (true);
CREATE POLICY "Public access for all" ON kasAngkutan FOR SELECT USING (true);

-- Allow all operations for authenticated users (adjust as needed for more granular security)
CREATE POLICY "Allow all for authenticated users" ON branches FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON products FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON kiosks FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON redemptions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON doReleases FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON kioskDistributions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON payments FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON kasUmum FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON kasAngkutan FOR ALL USING (auth.role() = 'authenticated');
