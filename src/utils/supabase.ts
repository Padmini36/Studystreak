import { createClient } from '@supabase/supabase-js';

// PLACEHOLDERS FOR SUPABASE CONFIGURATION (Support environment variables with fallback)
export const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://placeholder-project.supabase.co';
export const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key-1234567890';

// Fallback to window.supabase if already loaded via CDN, otherwise create standard client
// @ts-ignore
const hasCDNSupabase = typeof window !== 'undefined' && (window as any).supabase && typeof (window as any).supabase.createClient === 'function';

export const supabase = hasCDNSupabase
  ? (window as any).supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


