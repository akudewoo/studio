import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, writeBatch, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Payment, PaymentInput } from '@/lib/types';

const paymentsCollection = collection(db, 'payments');

export async function addPayment(payment: PaymentInput): Promise<Payment> {
    const docRef = await addDoc(paymentsCollection, payment);
    return { id: docRef.id, ...payment };
}

export async function addMultiplePayments(payments: PaymentInput[]): Promise<Payment[]> {
    const batch = writeBatch(db);
    const newPayments: Payment[] = [];
    payments.forEach(payment => {
        const docRef = doc(paymentsCollection);
        batch.set(docRef, payment);
        newPayments.push({ id: docRef.id, ...payment });
    });
    await batch.commit();
    return newPayments;
}

export async function getPayments(branchId: string): Promise<Payment[]> {
    const q = query(paymentsCollection, where("branchId", "==", branchId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
}

export async function updatePayment(id: string, payment: Partial<Payment>): Promise<void> {
    const paymentDoc = doc(db, 'payments', id);
    await updateDoc(paymentDoc, payment);
}

export async function deletePayment(id: string): Promise<void> {
    const paymentDoc = doc(db, 'payments', id);
    await deleteDoc(paymentDoc);
}

export async function deleteMultiplePayments(ids: string[]): Promise<void> {
    const batch = writeBatch(db);
    ids.forEach(id => {
        const paymentDoc = doc(db, 'payments', id);
        batch.delete(paymentDoc);
    });
    await batch.commit();
}
