import { supabase } from '@/lib/supabase';
import type { KasAngkutan, KasAngkutanInput } from '@/lib/types';

const TABLE_NAME = 'kasAngkutan';

export async function addKasAngkutan(kas: KasAngkutanInput): Promise<KasAngkutan> {
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .insert(kas)
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function getKasAngkutan(branchId: string): Promise<KasAngkutan[]> {
    let query = supabase.from(TABLE_NAME).select('*');
    if (branchId !== 'all') {
        query = query.eq('branchId', branchId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}

export async function updateKasAngkutan(id: string, kas: Partial<KasAngkutanInput>): Promise<void> {
    const { error } = await supabase
        .from(TABLE_NAME)
        .update(kas)
        .eq('id', id);
    if (error) throw error;
}

export async function deleteKasAngkutan(id: string): Promise<void> {
    const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .eq('id', id);
    if (error) throw error;
}

export async function deleteMultipleKasAngkutan(ids: string[]): Promise<void> {
    const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .in('id', ids);
    if (error) throw error;
}
