import { supabase } from '@/lib/supabase';
import type { Payment, PaymentInput } from '@/lib/types';

const TABLE_NAME = 'payments';

export async function addPayment(payment: PaymentInput): Promise<Payment> {
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .insert(payment)
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function addMultiplePayments(payments: PaymentInput[]): Promise<Payment[]> {
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .insert(payments)
        .select();
    if (error) throw error;
    return data;
}

export async function getPayments(branchId: string): Promise<Payment[]> {
    let query = supabase.from(TABLE_NAME).select('*');
    if (branchId !== 'all') {
        query = query.eq('branchId', branchId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}

export async function updatePayment(id: string, payment: Partial<Payment>): Promise<void> {
    const { error } = await supabase
        .from(TABLE_NAME)
        .update(payment)
        .eq('id', id);
    if (error) throw error;
}

export async function deletePayment(id: string): Promise<void> {
    const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .eq('id', id);
    if (error) throw error;
}

export async function deleteMultiplePayments(ids: string[]): Promise<void> {
    const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .in('id', ids);
    if (error) throw error;
}
