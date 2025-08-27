import { supabase } from '@/lib/supabase';
import type { KioskDistribution, KioskDistributionInput } from '@/lib/types';

const TABLE_NAME = 'kioskDistributions';

export async function addKioskDistribution(distribution: KioskDistributionInput): Promise<KioskDistribution> {
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .insert(distribution)
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function addMultipleKioskDistributions(distributions: KioskDistributionInput[]): Promise<KioskDistribution[]> {
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .insert(distributions)
        .select();
    if (error) throw error;
    return data;
}

export async function getKioskDistributions(branchId: string): Promise<KioskDistribution[]> {
    let query = supabase.from(TABLE_NAME).select('*');
    if (branchId !== 'all') {
        query = query.eq('branchId', branchId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}

export async function updateKioskDistribution(id: string, distribution: Partial<KioskDistribution>): Promise<void> {
    const { error } = await supabase
        .from(TABLE_NAME)
        .update(distribution)
        .eq('id', id);
    if (error) throw error;
}

export async function deleteKioskDistribution(id: string): Promise<void> {
    const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .eq('id', id);
    if (error) throw error;
}

export async function deleteMultipleKioskDistributions(ids: string[]): Promise<void> {
    const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .in('id', ids);
    if (error) throw error;
}
