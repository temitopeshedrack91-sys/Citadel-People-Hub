/**
 * Citadel Realtime Synchronization Service
 * 
 * Provides a resilient, leak-proof Supabase Realtime WebSocket manager.
 * Features:
 * - Channel deduplication (multiple components share one subscription channel per table)
 * - Reference counting with automatic teardown (supabase.removeChannel) when subscribers drop to 0
 * - Exponential backoff reconnection on network interruption
 * - Typed payload propagation for INSERT, UPDATE, DELETE events
 */

import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '../utils/supabase/client';

export type RealtimeTable =
  | 'employees'
  | 'leave_requests'
  | 'attendance_records'
  | 'notifications'
  | 'documents'
  | 'entities'
  | 'departments'
  | 'tasks'
  | 'audit_logs';

export type RealtimeEventType = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

export type RealtimeCallback<T extends { [key: string]: any } = { [key: string]: any }> = (
  payload: RealtimePostgresChangesPayload<T>
) => void;

interface ChannelSubscriptionState {
  channel: RealtimeChannel;
  subscribers: Set<RealtimeCallback<any>>;
  reconnectAttempts: number;
  status: 'SUBSCRIBED' | 'TIMED_OUT' | 'CHANNEL_ERROR' | 'CLOSED' | 'CONNECTING';
}

class RealtimeSyncManager {
  private channels = new Map<string, ChannelSubscriptionState>();
  private readonly maxReconnectAttempts = 5;

  /**
   * Subscribe to real-time Postgres table changes.
   * Multiple calls for the same table share the single channel.
   * Returns an unsubscribe function to be called on component unmount.
   */
  public subscribe<T extends { [key: string]: any } = { [key: string]: any }>(
    table: RealtimeTable,
    callback: RealtimeCallback<T>,
    event: RealtimeEventType = '*'
  ): () => void {
    const channelKey = `realtime:${table}`;
    let state = this.channels.get(channelKey);

    if (!state) {
      state = this.initChannel(channelKey, table, event);
      this.channels.set(channelKey, state);
    }

    state.subscribers.add(callback);

    // Return cleanup function
    return () => {
      const currentState = this.channels.get(channelKey);
      if (!currentState) return;

      currentState.subscribers.delete(callback);

      // If no more subscribers remain, safely tear down the Supabase channel to avoid memory leaks
      if (currentState.subscribers.size === 0) {
        try {
          supabase.removeChannel(currentState.channel);
        } catch (err) {
          console.warn(`[RealtimeSync] Error removing channel ${channelKey}:`, err);
        }
        this.channels.delete(channelKey);
      }
    };
  }

  private initChannel(
    channelKey: string,
    table: RealtimeTable,
    event: RealtimeEventType
  ): ChannelSubscriptionState {
    const state: ChannelSubscriptionState = {
      channel: null as any,
      subscribers: new Set(),
      reconnectAttempts: 0,
      status: 'CONNECTING',
    };

    const setup = () => {
      const channel = supabase
        .channel(channelKey)
        .on(
          'postgres_changes' as any,
          { event, schema: 'public', table },
          (payload: RealtimePostgresChangesPayload<any>) => {
            // Notify all registered component listeners
            state.subscribers.forEach((cb) => {
              try {
                cb(payload);
              } catch (cbErr) {
                console.error(`[RealtimeSync] Callback error for ${table}:`, cbErr);
              }
            });

            // Dispatch global event for cross-view telemetry
            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('citadel:realtime-change', {
                  detail: { table, payload },
                })
              );
            }
          }
        )
        .subscribe((status) => {
          state.status = status as any;

          if (status === 'SUBSCRIBED') {
            state.reconnectAttempts = 0;
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.warn(`[RealtimeSync] Channel ${channelKey} received status ${status}. Attempting reconnection...`);
            this.handleReconnect(channelKey, table, event);
          }
        });

      state.channel = channel;
    };

    setup();
    return state;
  }

  private handleReconnect(channelKey: string, table: RealtimeTable, event: RealtimeEventType) {
    const state = this.channels.get(channelKey);
    if (!state || state.subscribers.size === 0) return;

    if (state.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`[RealtimeSync] Max reconnection attempts reached for ${channelKey}.`);
      return;
    }

    state.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, state.reconnectAttempts), 15000);

    setTimeout(() => {
      if (this.channels.has(channelKey)) {
        try {
          supabase.removeChannel(state.channel);
        } catch {}
        const fresh = this.initChannel(channelKey, table, event);
        fresh.subscribers = state.subscribers;
        fresh.reconnectAttempts = state.reconnectAttempts;
        this.channels.set(channelKey, fresh);
      }
    }, delay);
  }

  /**
   * Get active subscriber count for monitoring/debugging.
   */
  public getActiveSubscriptions(): Record<string, { subscribers: number; status: string }> {
    const info: Record<string, { subscribers: number; status: string }> = {};
    this.channels.forEach((state, key) => {
      info[key] = {
        subscribers: state.subscribers.size,
        status: state.status,
      };
    });
    return info;
  }
}

export const realtimeSync = new RealtimeSyncManager();
