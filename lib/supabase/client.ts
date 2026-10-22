import 'react-native-url-polyfill/auto';

import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { env, usingSupabaseBackend } from '@/lib/config/env';
import { supabaseStorage } from '@/lib/supabase/storage';
import { Database } from '@/types/database';

let client: SupabaseClient<Database> | null = null;

export function getSupabaseClient() {
  if (!usingSupabaseBackend) {
    return null;
  }

  if (!client) {
    client = createClient<Database>(env.supabaseUrl, env.supabasePublishableKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: false,
        persistSession: true,
        storage: supabaseStorage,
      },
    });
  }

  return client;
}
