-- supabase_policies.sql
--
-- Deskripsi:
-- Script ini membuat kebijakan Row Level Security (RLS) untuk semua tabel.
-- Kebijakan ini mengizinkan SEMUA operasi (SELECT, INSERT, UPDATE, DELETE)
-- untuk PENGGUNA YANG TELAH LOGIN (AUTHENTICATED).
-- Ini adalah pengaturan umum yang aman untuk aplikasi di mana semua pengguna yang login
-- dianggap tepercaya untuk mengakses data sesuai dengan logika aplikasi.
--
-- Cara Menggunakan:
-- 1. Buka Supabase Dashboard Anda.
-- 2. Pergi ke SQL Editor.
-- 3. Salin dan tempel seluruh isi file ini.
-- 4. Klik "RUN".

-- ----------------------------------------------------------------
-- Kebijakan untuk Tabel: branches
-- ----------------------------------------------------------------
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to manage branches" ON public.branches;
CREATE POLICY "Allow authenticated users to manage branches"
    ON public.branches
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ----------------------------------------------------------------
-- Kebijakan untuk Tabel: products
-- ----------------------------------------------------------------
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to manage products" ON public.products;
CREATE POLICY "Allow authenticated users to manage products"
    ON public.products
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ----------------------------------------------------------------
-- Kebijakan untuk Tabel: kiosks
-- ----------------------------------------------------------------
ALTER TABLE public.kiosks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to manage kiosks" ON public.kiosks;
CREATE POLICY "Allow authenticated users to manage kiosks"
    ON public.kiosks
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ----------------------------------------------------------------
-- Kebijakan untuk Tabel: redemptions
-- ----------------------------------------------------------------
ALTER TABLE public.redemptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to manage redemptions" ON public.redemptions;
CREATE POLICY "Allow authenticated users to manage redemptions"
    ON public.redemptions
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ----------------------------------------------------------------
-- Kebijakan untuk Tabel: doReleases
-- ----------------------------------------------------------------
ALTER TABLE public.doReleases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to manage DO releases" ON public.doReleases;
CREATE POLICY "Allow authenticated users to manage DO releases"
    ON public.doReleases
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ----------------------------------------------------------------
-- Kebijakan untuk Tabel: kioskDistributions
-- ----------------------------------------------------------------
ALTER TABLE public.kioskDistributions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to manage kiosk distributions" ON public.kioskDistributions;
CREATE POLICY "Allow authenticated users to manage kiosk distributions"
    ON public.kioskDistributions
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ----------------------------------------------------------------
-- Kebijakan untuk Tabel: payments
-- ----------------------------------------------------------------
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to manage payments" ON public.payments;
CREATE POLICY "Allow authenticated users to manage payments"
    ON public.payments
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ----------------------------------------------------------------
-- Kebijakan untuk Tabel: kasUmum
-- ----------------------------------------------------------------
ALTER TABLE public.kasUmum ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to manage kas umum" ON public.kasUmum;
CREATE POLICY "Allow authenticated users to manage kas umum"
    ON public.kasUmum
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ----------------------------------------------------------------
-- Kebijakan untuk Tabel: kasAngkutan
-- ----------------------------------------------------------------
ALTER TABLE public.kasAngkutan ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to manage kas angkutan" ON public.kasAngkutan;
CREATE POLICY "Allow authenticated users to manage kas angkutan"
    ON public.kasAngkutan
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
