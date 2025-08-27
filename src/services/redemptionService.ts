import { supabase } from '@/lib/supabase';
import type { Redemption, RedemptionInput } from '@/lib/types';

const TABLE_NAME = 'redemptions';

export async function addRedemption(redemption: RedemptionInput): Promise<Redemption> {
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .insert(redemption)
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function addMultipleRedemptions(redemptions: RedemptionInput[]): Promise<Redemption[]> {
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .insert(redemptions)
        .select();
    if (error) throw error;
    return data;
}

export async function getRedemptions(branchId: string): Promise<Redemption[]> {
    let query = supabase.from(TABLE_NAME).select('*');
    if (branchId !== 'all') {
        query = query.eq('branchId', branchId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}

export async function updateRedemption(id: string, redemption: Partial<Redemption>): Promise<void> {
    const { error } = await supabase
        .from(TABLE_NAME)
        .update(redemption)
        .eq('id', id);
    if (error) throw error;
}

export async function deleteRedemption(id: string): Promise<void> {
    const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .eq('id', id);
    if (error) throw error;
}

export async function deleteMultipleRedemptions(ids: string[]): Promise<void> {
    const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .in('id', ids);
    if (error) throw error;
}
