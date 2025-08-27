import { supabase } from '@/lib/supabase';
import type { Kiosk, KioskInput } from '@/lib/types';

const TABLE_NAME = 'kiosks';

export async function addKiosk(kiosk: KioskInput): Promise<Kiosk> {
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .insert(kiosk)
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function addMultipleKiosks(kiosks: KioskInput[]): Promise<Kiosk[]> {
     const { data, error } = await supabase
        .from(TABLE_NAME)
        .insert(kiosks)
        .select();
    if (error) throw error;
    return data;
}

export async function getKiosks(branchId: string): Promise<Kiosk[]> {
    let query = supabase.from(TABLE_NAME).select('*');
    if (branchId !== 'all') {
        query = query.eq('branchId', branchId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}

export async function updateKiosk(id: string, kiosk: Partial<Kiosk>): Promise<void> {
    const { error } = await supabase
        .from(TABLE_NAME)
        .update(kiosk)
        .eq('id', id);
    if (error) throw error;
}

export async function deleteKiosk(id: string): Promise<void> {
    const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .eq('id', id);
    if (error) throw error;
}

export async function deleteMultipleKiosks(ids: string[]): Promise<void> {
    const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .in('id', ids);
    if (error) throw error;
}
