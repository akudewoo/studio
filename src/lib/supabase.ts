
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL and Anon Key are not defined. Please check your .env file.');
}

// Ensure createClient is not called with undefined values
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : {
      from: () => {
        console.error('Supabase client is not initialized.');
        // Return a mock object that prevents further errors
        return {
          select: () => Promise.resolve({ data: [], error: { message: 'Supabase not initialized', details: '', hint: '', code: '' } }),
          insert: () => Promise.resolve({ data: [], error: { message: 'Supabase not initialized', details: '', hint: '', code: '' } }),
          update: () => Promise.resolve({ data: [], error: { message: 'Supabase not initialized', details: '', hint: '', code: '' } }),
          delete: () => Promise.resolve({ data: [], error: { message: 'Supabase not initialized', details: '', hint: '', code: '' } }),
        };
      }
    };
