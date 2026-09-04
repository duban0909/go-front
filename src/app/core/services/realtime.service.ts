import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { GOAGENDA_API_URL } from '../config/goagenda-api.config';
import { RealtimeEventType, RealtimeMessage, RealtimeNotification } from '../models/realtime.model';
import { SessionService } from './session.service';

const WS_URL = GOAGENDA_API_URL.replace(/^http/, 'ws');
const MAX_NOTIFICATIONS = 50;
const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 30000;

const EVENT_TITLES: Record<RealtimeEventType, string> = {
  'appointment.created': 'Nueva cita agendada',
  'appointment.updated': 'Cita actualizada',
  'appointment.cancelled': 'Cita cancelada',
  'chat.escalated': 'Un cliente necesita ayuda'
};

/**
 * Conexion WebSocket en tiempo real para notificaciones de citas del negocio activo.
 * Se conecta/reconecta automaticamente segun la sesion (business_id + token) y expone:
 * - `notifications`/`unreadCount` para la campana del header.
 * - `lastEvent`, que las paginas de calendario observan para recargar su listado.
 * Ver `realtime.model.ts` para el contrato de mensajes esperado del backend.
 */
@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private readonly sessionService = inject(SessionService);

  private socket: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private audioContext: AudioContext | null = null;
  private permissionRequested = false;

  readonly notifications = signal<RealtimeNotification[]>([]);
  readonly unreadCount = computed(() => this.notifications().filter((n) => !n.read).length);
  readonly connected = signal(false);
  readonly lastEvent = signal<RealtimeMessage | null>(null);

  constructor() {
    this.unlockAudioOnFirstInteraction();

    effect(() => {
      const businessId = this.sessionService.businessId();
      const token = this.sessionService.token;

      if (businessId && token) {
        this.connect(businessId, token);
      } else {
        this.disconnect();
      }
    });
  }

  /** Pide permiso de Notification al navegador (no-op si ya se pidio o no aplica). */
  requestNotificationPermission(): void {
    if (this.permissionRequested || typeof Notification === 'undefined') {
      return;
    }

    this.permissionRequested = true;

    if (Notification.permission === 'default') {
      void Notification.requestPermission();
    }
  }

  markAsRead(id: string): void {
    this.notifications.update((list) => list.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  markAllAsRead(): void {
    this.notifications.update((list) => list.map((n) => ({ ...n, read: true })));
  }

  clear(): void {
    this.notifications.set([]);
  }

  private connect(businessId: string, token: string): void {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const url = `${WS_URL}/ws/appointments?business_id=${encodeURIComponent(businessId)}`;

    try {
      this.socket = new WebSocket(url);
    } catch {
      this.scheduleReconnect(businessId, token);
      return;
    }

    this.socket.onopen = () => {
      this.connected.set(true);
      this.reconnectAttempts = 0;
      this.socket?.send(JSON.stringify({ type: 'auth', token }));
    };

    this.socket.onmessage = (event: MessageEvent<string>) => this.handleMessage(event);

    this.socket.onerror = () => {
      this.socket?.close();
    };

    this.socket.onclose = () => {
      this.connected.set(false);
      this.socket = null;

      if (this.sessionService.businessId() === businessId) {
        this.scheduleReconnect(businessId, token);
      }
    };
  }

  private disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.reconnectAttempts = 0;
    this.socket?.close();
    this.socket = null;
    this.connected.set(false);
  }

  private scheduleReconnect(businessId: string, token: string): void {
    if (this.reconnectTimer) {
      return;
    }

    const delay = Math.min(RECONNECT_BASE_DELAY_MS * 2 ** this.reconnectAttempts, RECONNECT_MAX_DELAY_MS);
    this.reconnectAttempts += 1;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;

      if (this.sessionService.businessId() === businessId && this.sessionService.token === token) {
        this.connect(businessId, token);
      }
    }, delay);
  }

  private handleMessage(event: MessageEvent<string>): void {
    let message: RealtimeMessage;

    try {
      message = JSON.parse(event.data);
    } catch {
      return;
    }

    if (!message?.type) {
      return;
    }

    let notification: RealtimeNotification;

    if (message.type === 'chat.escalated') {
      if (!message.session_id) {
        return;
      }

      notification = {
        id: `${message.session_id}-${message.type}-${Date.now()}`,
        type: message.type,
        sessionId: message.session_id,
        clientName: message.client_name,
        receivedAt: new Date(),
        read: false
      };
    } else {
      if (!message.appointment) {
        return;
      }

      notification = {
        id: `${message.appointment.id}-${message.type}-${Date.now()}`,
        type: message.type,
        appointment: message.appointment,
        receivedAt: new Date(),
        read: false
      };
    }

    this.lastEvent.set(message);
    this.notifications.update((list) => [notification, ...list].slice(0, MAX_NOTIFICATIONS));

    this.playNotificationSound();
    this.showBrowserNotification(message);
  }

  private showBrowserNotification(message: RealtimeMessage): void {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
      return;
    }

    // Si la pestaña esta visible, la campana + sonido ya avisan; evitamos duplicar.
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      return;
    }

    const title = EVENT_TITLES[message.type] ?? 'Notificacion de GoAgenda';
    const body =
      message.type === 'chat.escalated'
        ? `${message.client_name ?? 'Un cliente'} esta esperando ayuda en el chat`
        : `${message.appointment.client_name} · ${message.appointment.services?.name ?? 'Servicio'}`;
    const tag = message.type === 'chat.escalated' ? message.session_id : message.appointment.id;

    try {
      new Notification(title, { body, tag });
    } catch {
      // Algunos navegadores moviles no soportan el constructor Notification directamente.
    }
  }

  private unlockAudioOnFirstInteraction(): void {
    if (typeof document === 'undefined') {
      return;
    }

    const unlock = () => {
      this.getAudioContext();
      document.removeEventListener('click', unlock);
      document.removeEventListener('keydown', unlock);
    };

    document.addEventListener('click', unlock, { once: true });
    document.addEventListener('keydown', unlock, { once: true });
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') {
      return null;
    }

    if (!this.audioContext) {
      const AudioContextCtor =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

      if (!AudioContextCtor) {
        return null;
      }

      this.audioContext = new AudioContextCtor();
    }

    if (this.audioContext.state === 'suspended') {
      void this.audioContext.resume();
    }

    return this.audioContext;
  }

  /** Genera un "ding" de dos tonos con Web Audio API, sin depender de un asset de audio. */
  private playNotificationSound(): void {
    const ctx = this.getAudioContext();

    if (!ctx) {
      return;
    }

    const now = ctx.currentTime;
    const tones = [880, 1175];

    tones.forEach((freq, index) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = freq;

      const start = now + index * 0.12;
      const end = start + 0.18;

      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.25, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);

      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(start);
      oscillator.stop(end);
    });
  }
}
