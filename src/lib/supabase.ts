import { createClient } from '@supabase/supabase-js'
import type { Branch, Product, Kiosk, Redemption, DORelease, KioskDistribution, Payment, KasUmum, KasAngkutan } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
