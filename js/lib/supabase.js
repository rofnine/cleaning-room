import { getPublicConfig } from './config.js?v=20260623-ux6';

let clientPromise;

export function createSupabaseBrowserClient(createClient, config) {
  return createClient(config.supabaseUrl, config.supabasePublishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

export function getSupabase() {
  if (!clientPromise) {
    clientPromise = import('https://esm.sh/@supabase/supabase-js@2').then(({ createClient }) => (
      createSupabaseBrowserClient(createClient, getPublicConfig())
    ));
  }
  return clientPromise;
}
