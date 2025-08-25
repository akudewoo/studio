import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Payment, PaymentInput } from '@/lib/types';

const paymentsCollection = collection(db, 'payments');

export async function addPayment(payment: PaymentInput): Promise<Payment> {
    const docRef = await addDoc(paymentsCollection, payment);
    return { id: docRef.id, ...payment };
}

export async function getPayments(): Promise<Payment[]> {
    const snapshot = await getDocs(paymentsCollection);
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
