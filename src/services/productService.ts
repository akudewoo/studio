import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, writeBatch, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Product, ProductInput } from '@/lib/types';

const productsCollection = collection(db, 'products');

export async function addProduct(product: ProductInput): Promise<Product> {
    const docRef = await addDoc(productsCollection, product);
    return { id: docRef.id, ...product };
}

export async function addMultipleProducts(products: ProductInput[]): Promise<Product[]> {
    const batch = writeBatch(db);
    const newProducts: Product[] = [];
    products.forEach(product => {
        const docRef = doc(productsCollection);
        batch.set(docRef, product);
        newProducts.push({ id: docRef.id, ...product });
    });
    await batch.commit();
    return newProducts;
}

export async function getProducts(branchId: string): Promise<Product[]> {
    const q = branchId === 'all'
        ? productsCollection
        : query(productsCollection, where("branchId", "==", branchId));
    const snapshot = await getDocs(q);
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
    const batch = writeBatch(db);
    ids.forEach(id => {
        const productDoc = doc(db, 'products', id);
        batch.delete(productDoc);
    });
    await batch.commit();
}
