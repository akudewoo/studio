import { supabase } from '@/lib/supabase';
import type { KasUmum, KasUmumInput } from '@/lib/types';

const TABLE_NAME = 'kasUmum';

export async function addKasUmum(kas: KasUmumInput): Promise<KasUmum> {
    const fullKasData = { ...kas, total: kas.quantity * kas.unitPrice };
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .insert(fullKasData)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function addMultipleKasUmum(kases: KasUmumInput[]): Promise<KasUmum[]> {
    const newKasesWithTotal = kases.map(kas => ({
      ...kas,
      total: kas.quantity * kas.unitPrice,
    }));

    const { data, error } = await supabase
        .from(TABLE_NAME)
        .insert(newKasesWithTotal)
        .select();

    if (error) throw error;
    return data;
}

export async function getKasUmum(branchIds: string[]): Promise<KasUmum[]> {
    if (branchIds.length === 0) return [];
    
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .in('branchId', branchIds);

    if (error) throw error;
    return data || [];
}

export async function updateKasUmum(id: string, kas: Partial<KasUmumInput>): Promise<void> {
    const fullKasData = (kas.quantity && kas.unitPrice)
        ? { ...kas, total: kas.quantity * kas.unitPrice }
        : kas;

    const { error } = await supabase
        .from(TABLE_NAME)
        .update(fullKasData)
        .eq('id', id);

    if (error) throw error;
}

export async function deleteKasUmum(id: string): Promise<void> {
    const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .eq('id', id);

    if (error) throw error;
}

export async function deleteMultipleKasUmum(ids: string[]): Promise<void> {
    const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .in('id', ids);

    if (error) throw error;
}
