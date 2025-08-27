import { supabase } from '@/lib/supabase';
import type { DORelease, DOReleaseInput } from '@/lib/types';

const TABLE_NAME = 'doReleases';

export async function addDORelease(doRelease: DOReleaseInput): Promise<DORelease> {
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .insert(doRelease)
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function addMultipleDOReleases(doReleases: DOReleaseInput[]): Promise<DORelease[]> {
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .insert(doReleases)
        .select();
    if (error) throw error;
    return data;
}

export async function getDOReleases(branchId: string): Promise<DORelease[]> {
    let query = supabase.from(TABLE_NAME).select('*');
    if (branchId !== 'all') {
        query = query.eq('branchId', branchId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}

export async function updateDORelease(id: string, doRelease: Partial<DORelease>): Promise<void> {
    const { error } = await supabase
        .from(TABLE_NAME)
        .update(doRelease)
        .eq('id', id);
    if (error) throw error;
}

export async function deleteDORelease(id: string): Promise<void> {
    const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .eq('id', id);
    if (error) throw error;
}

export async function deleteMultipleDOReleases(ids: string[]): Promise<void> {
    const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .in('id', ids);
    if (error) throw error;
}
