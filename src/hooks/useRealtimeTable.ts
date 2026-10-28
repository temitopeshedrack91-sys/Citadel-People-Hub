/**
 * React Hook for Realtime Supabase Database Table Synchronization
 * 
 * Automatically subscribes a component to real-time events on any Supabase table
 * and performs strict cleanup on component unmount.
 */

import { useEffect, useRef } from 'react';
import { realtimeSync, RealtimeTable, RealtimeCallback, RealtimeEventType } from '../services/realtimeSync';

export const useRealtimeTable = <T extends { [key: string]: any } = { [key: string]: any }>(
  table: RealtimeTable,
  onUpdate: RealtimeCallback<T>,
  event: RealtimeEventType = '*'
): void => {
  const callbackRef = useRef(onUpdate);
  callbackRef.current = onUpdate;

  useEffect(() => {
    const unsubscribe = realtimeSync.subscribe<T>(
      table,
      (payload) => {
        callbackRef.current(payload);
      },
      event
    );

    return () => {
      unsubscribe();
    };
  }, [table, event]);
};
