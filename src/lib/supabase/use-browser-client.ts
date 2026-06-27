'use client';

import { useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useSupabaseBrowserClient() {
  const clientRef = useRef<ReturnType<typeof createClient> | null>(null);

  if (!clientRef.current) {
    clientRef.current = createClient();
  }

  return clientRef.current;
}
