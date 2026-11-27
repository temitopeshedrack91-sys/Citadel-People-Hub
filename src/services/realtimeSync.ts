/**
 * Citadel Realtime Synchronization Service
 *
 * Supports two transports seamlessly:
 * 1. Laravel SSE Stream (/api/v1/realtime/stream) + incremental polling fallback + BroadcastChannel.
 * 2. Supabase Realtime Postgres Changes WebSocket when running directly against Supabase / unit tests.
 */

import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '../utils/supabase/client';
import {
  getLaravelAccessToken,
  getLaravelApiBaseUrl,
  isLaravelApiConfigured,
  requestLaravelData,
} from './laravelClient';
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
  subscribers: Map<RealtimeCallback<any>, RealtimeEventType>;
  reconnectAttempts: number;
  reconnectTimer?: ReturnType<typeof setTimeout> | null;
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
  private eventSource: EventSource | null = null;
  private sseConnected = false;
  private sseReconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private lastEventId: number | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private localMutationListenerBound = false;
  private pollingInFlight = false;
  private lastPollAt = 0;

  private shouldUseLaravelRealtime(): boolean {
    if (import.meta.env.MODE === 'test') {
      return isLaravelApiConfigured();
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

    state.subscribers.set(callback, event);

    if (useLaravel) {
      this.ensureLaravelTransportStarted();
    }

    return () => {
      const currentState = this.channels.get(channelKey);
      if (!currentState) return;

      currentState.subscribers.delete(callback);

      if (currentState.subscribers.size === 0) {
        if (currentState.reconnectTimer) {
          clearTimeout(currentState.reconnectTimer);
          currentState.reconnectTimer = null;
        }
        if (currentState.channel) {
          try {
            supabase.removeChannel(currentState.channel);
          } catch (err) {
            console.warn(`[RealtimeSync] Error removing channel ${channelKey}:`, err);
          }
        }
        this.channels.delete(channelKey);

        if (this.channels.size === 0) {
          this.teardownLaravelTransport();
        }
      }
    };
  }

  private initLaravelChannel(): ChannelSubscriptionState {
    return {
      channel: null,
      subscribers: new Map(),
      reconnectAttempts: 0,
      status: 'SUBSCRIBED',
    };
  }

  private ensureLaravelTransportStarted(): void {
    if (typeof window === 'undefined') return;

    if (!this.localMutationListenerBound) {
      window.addEventListener('citadel:local-mutation', this.handleLocalOrBroadcastEvent as EventListener);
      window.addEventListener('citadel:auth-changed', this.handleAuthChanged);
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

    this.connectSseStream();

    if (!this.pollTimer) {
      this.pollTimer = setInterval(() => {
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
        // When SSE is healthy, polling acts only as a lightweight fallback sync
        if (!this.sseConnected) {
          void this.pollLaravelEventsNow();
        }
      }, 5000);
    }
  }

  private connectSseStream(): void {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;
    const token = getLaravelAccessToken();
    const apiBase = getLaravelApiBaseUrl();
    if (!token || !apiBase || this.channels.size === 0) {
      this.closeSseStream();
      return;
    }
    if (this.eventSource && this.eventSource.readyState !== EventSource.CLOSED) {
      return;
    }

    try {
      const sinceParam = this.lastEventId !== null ? `&since=${this.lastEventId}` : '';
      const streamUrl = `${apiBase}/api/v1/realtime/stream?token=${encodeURIComponent(token)}${sinceParam}`;
      const es = new EventSource(streamUrl);
      this.eventSource = es;

      es.addEventListener('connected', (event: MessageEvent) => {
        this.sseConnected = true;
        try {
          const parsed = JSON.parse(event.data || '{}');
          if (typeof parsed.latestId === 'number' && this.lastEventId === null) {
            this.lastEventId = parsed.latestId;
          }
        } catch {}
      });

      es.addEventListener('change', (event: MessageEvent) => {
        this.sseConnected = true;
        try {
          const ev = JSON.parse(event.data || '{}') as RealtimeEventItem;
          const numericId =
            typeof ev.id === 'number'
              ? ev.id
              : event.lastEventId && /^\d+$/.test(event.lastEventId)
              ? Number(event.lastEventId)
              : null;

          if (numericId !== null) {
            if (this.lastEventId !== null && numericId <= this.lastEventId) {
              return;
            }
            this.lastEventId = numericId;
          }

          if (ev.table) {
            this.emitToTable(ev.table, {
              eventType: ev.eventType || 'UPDATE',
              new: { id: ev.recordId, ...(ev.payload || {}) },
              old: {},
            } as any);
          }
        } catch {}
      });

      es.addEventListener('ping', (event: MessageEvent) => {
        this.sseConnected = true;
        try {
          const parsed = JSON.parse(event.data || '{}');
          if (typeof parsed.latestId === 'number') {
            this.lastEventId = Math.max(this.lastEventId ?? 0, parsed.latestId);
          }
        } catch {}
      });

      es.onerror = () => {
        this.sseConnected = false;
        if (this.eventSource === es) {
          try {
            es.close();
          } catch {}
          this.eventSource = null;

          // Immediately fall back to incremental polling so events during the drop are not delayed
          void this.pollLaravelEventsNow();

          if (!this.sseReconnectTimer && this.channels.size > 0 && getLaravelAccessToken()) {
            this.sseReconnectTimer = setTimeout(() => {
              this.sseReconnectTimer = null;
              this.connectSseStream();
            }, 3000);
          }
        }
      };
    } catch {
      this.sseConnected = false;
    }
  }

  private closeSseStream(): void {
    this.sseConnected = false;
    if (this.sseReconnectTimer) {
      clearTimeout(this.sseReconnectTimer);
      this.sseReconnectTimer = null;
    }
    if (this.eventSource) {
      try {
        this.eventSource.close();
      } catch {}
      this.eventSource = null;
    }
  }

  private handleAuthChanged = () => {
    if (getLaravelAccessToken()) {
      this.closeSseStream();
      this.connectSseStream();
      void this.pollLaravelEventsNow();
    } else {
      this.closeSseStream();
      this.lastEventId = null;
    }
  };

  private teardownLaravelTransport(): void {
    this.closeSseStream();
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
      window.removeEventListener('citadel:auth-changed', this.handleAuthChanged);
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
      this.connectSseStream();
      void this.pollLaravelEventsNow();
    }
  };

  private pollLaravelEventsNow = async () => {
    if (this.pollingInFlight || this.channels.size === 0 || !getLaravelAccessToken()) return;
    const now = Date.now();
    if (now - this.lastPollAt < 1500) return;
    this.lastPollAt = now;
    this.pollingInFlight = true;
    try {
      const previousLastId = this.lastEventId;
      const query = previousLastId !== null ? `?since=${previousLastId}` : '';
      const res = await requestLaravelData<{ latestId: number; events: RealtimeEventItem[] }>(
        `/realtime/events${query}`
      );
      const events = Array.isArray(res?.events) ? res.events : [];
      for (const ev of events) {
        if (typeof ev.id === 'number') {
          if (previousLastId !== null && ev.id <= previousLastId) {
            continue;
          }
          this.lastEventId = Math.max(this.lastEventId ?? 0, ev.id);
        }
        if (ev.table) {
          this.emitToTable(ev.table, {
            eventType: ev.eventType || 'UPDATE',
            new: { id: ev.recordId, ...(ev.payload || {}) },
            old: {},
          } as any);
        }
      }
      // Advance cursor to latestId when initializing or caught up (avoid skipping unread pages when limit=100 is hit)
      if (typeof res?.latestId === 'number' && (events.length === 0 || events.length < 100)) {
        this.lastEventId = Math.max(this.lastEventId ?? 0, res.latestId);
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

    const incomingType = String((payload as any)?.eventType || '').toUpperCase();

    state.subscribers.forEach((subscribedEvent, cb) => {
      if (subscribedEvent !== '*' && incomingType && subscribedEvent.toUpperCase() !== incomingType) {
        return;
      }
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
      subscribers: new Map(),
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
            const incomingType = String((payload as any)?.eventType || '').toUpperCase();
            state.subscribers.forEach((subscribedEvent, cb) => {
              if (
                subscribedEvent !== '*' &&
                incomingType &&
                subscribedEvent.toUpperCase() !== incomingType
              ) {
                return;
              }
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

    if (import.meta.env.MODE === 'test' && !(supabase.channel as any)?._isMockFunction) {
      return;
    }

    if (state.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`[RealtimeSync] Max reconnection attempts reached for ${channelKey}.`);
      return;
    }

    state.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, state.reconnectAttempts), 15000);

    if (state.reconnectTimer) {
      clearTimeout(state.reconnectTimer);
    }

    state.reconnectTimer = setTimeout(async () => {
      state.reconnectTimer = null;
      if (!this.channels.has(channelKey) || state.subscribers.size === 0) return;
      try {
        if (state.channel) {
          await supabase.removeChannel(state.channel);
        }
      } catch {}
      try {
        const fresh = this.initSupabaseChannel(channelKey, table, event);
        fresh.subscribers = state.subscribers;
        fresh.reconnectAttempts = state.reconnectAttempts;
        this.channels.set(channelKey, fresh);
      } catch (err) {
        console.warn(`[RealtimeSync] Reconnect error for ${channelKey}:`, err);
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
