'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useSupabaseBrowserClient() {
  const [client] = useState(() => createClient());
  return client;
}
