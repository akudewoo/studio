import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Product } from '@/lib/types';

const productsCollection = collection(db, 'products');

export async function addProduct(product: Omit<Product, 'id'>): Promise<Product> {
    const docRef = await addDoc(productsCollection, product);
    return { id: docRef.id, ...product };
}

export async function getProducts(): Promise<Product[]> {
    const snapshot = await getDocs(productsCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
}

export async function updateProduct(id: string, product: Partial<Product>): Promise<void> {
    const productDoc = doc(db, 'products', id);
    await updateDoc(productDoc, product);
}

export async function deleteProduct(id: string): Promise<void> {
    const productDoc = doc(db, 'products', id);
    await deleteDoc(productDoc);
}

export async function deleteMultipleProducts(ids: string[]): Promise<void> {
    const deletePromises = ids.map(id => deleteProduct(id));
    await Promise.all(deletePromises);
}
