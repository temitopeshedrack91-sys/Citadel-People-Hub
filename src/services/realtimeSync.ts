/**
 * Citadel Realtime Synchronization Service
 *
 * Supports two transports seamlessly:
 * 1. Laravel Realtime Event Stream + BroadcastChannel when connected to the PHP backend.
 * 2. Supabase Realtime Postgres Changes WebSocket when running directly against Supabase / unit tests.
 */

import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '../utils/supabase/client';
import { getLaravelAccessToken, isLaravelApiConfigured, requestLaravelData } from './laravelClient';
import { shouldUseLaravelBackend } from '../utils/authMode';

export type RealtimeTable =
  | 'employees'
  | 'leave_requests'
  | 'leave_balances'
  | 'attendance_records'
  | 'notifications'
  | 'documents'
  | 'entities'
  | 'departments'
  | 'tasks'
  | 'audit_logs'
  | 'kpis'
  | 'performance_reviews'
  | 'onboarding_journeys'
  | 'onboarding_checklist_templates'
  | 'offboarding_requests';

export type RealtimeEventType = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

export type RealtimeCallback<T extends { [key: string]: any } = { [key: string]: any }> = (
  payload: RealtimePostgresChangesPayload<T>
) => void;

interface ChannelSubscriptionState {
  channel: RealtimeChannel | null;
  subscribers: Set<RealtimeCallback<any>>;
  reconnectAttempts: number;
  status: 'SUBSCRIBED' | 'TIMED_OUT' | 'CHANNEL_ERROR' | 'CLOSED' | 'CONNECTING';
}

interface RealtimeEventItem {
  id: number;
  table: string;
  eventType: string;
  recordId: string | null;
  payload: Record<string, any>;
  createdAt: string | null;
}

class RealtimeSyncManager {
  private channels = new Map<string, ChannelSubscriptionState>();
  private readonly maxReconnectAttempts = 5;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private lastEventId: number | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private localMutationListenerBound = false;
  private pollingInFlight = false;

  private shouldUseLaravelRealtime(): boolean {
    if (import.meta.env.MODE === 'test') {
      return false;
    }
    return shouldUseLaravelBackend(import.meta.env.PROD, isLaravelApiConfigured());
  }

  public subscribe<T extends { [key: string]: any } = { [key: string]: any }>(
    table: RealtimeTable,
    callback: RealtimeCallback<T>,
    event: RealtimeEventType = '*'
  ): () => void {
    const channelKey = `realtime:${table}`;
    const useLaravel = this.shouldUseLaravelRealtime();
    let state = this.channels.get(channelKey);

    if (!state) {
      state = useLaravel
        ? this.initLaravelChannel()
        : this.initSupabaseChannel(channelKey, table, event);
      this.channels.set(channelKey, state);
    }

    state.subscribers.add(callback);

    if (useLaravel) {
      this.ensureLaravelTransportStarted();
    }

    return () => {
      const currentState = this.channels.get(channelKey);
      if (!currentState) return;

      currentState.subscribers.delete(callback);

      if (currentState.subscribers.size === 0) {
        if (currentState.channel) {
          try {
            supabase.removeChannel(currentState.channel);
          } catch (err) {
            console.warn(`[RealtimeSync] Error removing channel ${channelKey}:`, err);
          }
        }
        this.channels.delete(channelKey);

        if (useLaravel && this.channels.size === 0) {
          this.teardownLaravelTransport();
        }
      }
    };
  }

  private initLaravelChannel(): ChannelSubscriptionState {
    return {
      channel: null,
      subscribers: new Set(),
      reconnectAttempts: 0,
      status: 'SUBSCRIBED',
    };
  }

  private ensureLaravelTransportStarted(): void {
    if (typeof window === 'undefined') return;

    if (!this.localMutationListenerBound) {
      window.addEventListener('citadel:local-mutation', this.handleLocalOrBroadcastEvent as EventListener);
      window.addEventListener('focus', this.pollLaravelEventsNow);
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
      this.localMutationListenerBound = true;
    }

    if (!this.broadcastChannel && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('citadel_realtime');
        this.broadcastChannel.onmessage = (ev: MessageEvent) => {
          const data = ev.data || {};
          if (data.table) {
            this.emitToTable(data.table, {
              eventType: data.eventType || 'UPDATE',
              new: data.payload || {},
              old: {},
            } as any);
          }
        };
      } catch {}
    }

    if (!this.pollTimer) {
      void this.pollLaravelEventsNow();
      this.pollTimer = setInterval(() => {
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
        void this.pollLaravelEventsNow();
      }, 1800);
    }
  }

  private teardownLaravelTransport(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.close();
      } catch {}
      this.broadcastChannel = null;
    }
    if (this.localMutationListenerBound && typeof window !== 'undefined') {
      window.removeEventListener('citadel:local-mutation', this.handleLocalOrBroadcastEvent as EventListener);
      window.removeEventListener('focus', this.pollLaravelEventsNow);
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
      this.localMutationListenerBound = false;
    }
    this.lastEventId = null;
  }

  private handleLocalOrBroadcastEvent = (event: CustomEvent<{ table: string; eventType: string }>) => {
    const detail = event.detail;
    if (!detail?.table) return;
    this.emitToTable(detail.table, {
      eventType: detail.eventType || 'UPDATE',
      new: {},
      old: {},
    } as any);
  };

  private handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      void this.pollLaravelEventsNow();
    }
  };

  private pollLaravelEventsNow = async () => {
    if (this.pollingInFlight || this.channels.size === 0 || !getLaravelAccessToken()) return;
    this.pollingInFlight = true;
    try {
      const query = this.lastEventId !== null ? `?since=${this.lastEventId}` : '';
      const res = await requestLaravelData<{ latestId: number; events: RealtimeEventItem[] }>(
        `/realtime/events${query}`
      );
      if (typeof res?.latestId === 'number') {
        this.lastEventId = res.latestId;
      }
      if (Array.isArray(res?.events)) {
        for (const ev of res.events) {
          this.emitToTable(ev.table, {
            eventType: ev.eventType || 'UPDATE',
            new: { id: ev.recordId, ...(ev.payload || {}) },
            old: {},
          } as any);
        }
      }
    } catch {
      // Transient polling errors are ignored and retried on next tick
    } finally {
      this.pollingInFlight = false;
    }
  };

  private emitToTable(table: string, payload: RealtimePostgresChangesPayload<any>): void {
    const channelKey = `realtime:${table}`;
    const state = this.channels.get(channelKey);
    if (!state) return;

    state.subscribers.forEach((cb) => {
      try {
        cb(payload);
      } catch (cbErr) {
        console.error(`[RealtimeSync] Callback error for ${table}:`, cbErr);
      }
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('citadel:realtime-change', {
          detail: { table, payload },
        })
      );
    }
  }

  private initSupabaseChannel(
    channelKey: string,
    table: RealtimeTable,
    event: RealtimeEventType
  ): ChannelSubscriptionState {
    const state: ChannelSubscriptionState = {
      channel: null,
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
            state.subscribers.forEach((cb) => {
              try {
                cb(payload);
              } catch (cbErr) {
                console.error(`[RealtimeSync] Callback error for ${table}:`, cbErr);
              }
            });

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
          if (state.channel) {
            supabase.removeChannel(state.channel);
          }
        } catch {}
        const fresh = this.initSupabaseChannel(channelKey, table, event);
        fresh.subscribers = state.subscribers;
        fresh.reconnectAttempts = state.reconnectAttempts;
        this.channels.set(channelKey, fresh);
      }
    }, delay);
  }

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
