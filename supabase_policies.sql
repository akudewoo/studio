-- Hapus kebijakan lama jika ada (untuk pembersihan)
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.products;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.kiosks;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.redemptions;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.doReleases;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.kioskDistributions;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.payments;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.kasUmum;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.kasAngkutan;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.branches;


-- Buat kebijakan baru yang memberikan akses penuh (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Enable all access for authenticated users"
ON public.products
FOR ALL
USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all access for authenticated users"
ON public.kiosks
FOR ALL
USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all access for authenticated users"
ON public.redemptions
FOR ALL
USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all access for authenticated users"
ON public.doReleases
FOR ALL
USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all access for authenticated users"
ON public.kioskDistributions
FOR ALL
USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all access for authenticated users"
ON public.payments
FOR ALL
USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all access for authenticated users"
ON public.kasUmum
FOR ALL
USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all access for authenticated users"
ON public.kasAngkutan
FOR ALL
USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all access for authenticated users"
ON public.branches
FOR ALL
USING (auth.role() = 'authenticated');
