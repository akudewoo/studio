
import { supabase } from '@/lib/supabase';
import type { Product, ProductInput } from '@/lib/types';

const TABLE_NAME = 'products';

export async function addProduct(product: ProductInput): Promise<Product> {
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .insert(product)
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function addMultipleProducts(products: ProductInput[]): Promise<Product[]> {
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .insert(products)
        .select();
    if (error) throw error;
    return data;
}

export async function getProducts(branchId: string): Promise<Product[]> {
    let query = supabase.from(TABLE_NAME).select('*');
    if (branchId !== 'all') {
        query = query.eq('branchId', branchId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}

export async function updateProduct(id: string, product: Partial<ProductInput>): Promise<void> {
    const { error } = await supabase
        .from(TABLE_NAME)
        .update(product)
        .eq('id', id);
    if (error) throw error;
}

export async function deleteProduct(id: string): Promise<void> {
    const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .eq('id', id);
    if (error) throw error;
}

export async function deleteMultipleProducts(ids: string[]): Promise<void> {
    const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .in('id', ids);
    if (error) throw error;
}
