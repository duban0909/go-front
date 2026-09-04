import { AppointmentApiRecord } from './appointment.model';

export type AppointmentEventType = 'appointment.created' | 'appointment.updated' | 'appointment.cancelled';
export type RealtimeEventType = AppointmentEventType | 'chat.escalated';

/**
 * Contrato del WebSocket (backend en `services/realtime.py` / `routes/realtime_routes.py`):
 * `${wsScheme}://<host>/ws/appointments?business_id=<id>`
 *
 * Tras el `open`, el cliente envia como primer mensaje `{ type: 'auth', token }`
 * con el JWT de Supabase (evita exponer el token en la URL/logs).
 *
 * El servidor emite un mensaje JSON por cada evento del negocio, con una
 * forma distinta segun `type` (ver RealtimeMessage abajo).
 */
export interface RealtimeAppointmentMessage {
  type: AppointmentEventType;
  business_id: string;
  appointment: AppointmentApiRecord;
}

/** Emitido cuando el bot del chat notifica que un cliente necesita que un humano siga la conversacion (ver agent/tools.py:_notificar_negocio_escalamiento). */
export interface RealtimeChatEscalationMessage {
  type: 'chat.escalated';
  business_id: string;
  session_id: string;
  client_name: string | null;
}

export type RealtimeMessage = RealtimeAppointmentMessage | RealtimeChatEscalationMessage;

export interface AppointmentNotification {
  id: string;
  type: AppointmentEventType;
  appointment: AppointmentApiRecord;
  receivedAt: Date;
  read: boolean;
}

export interface ChatEscalationNotification {
  id: string;
  type: 'chat.escalated';
  sessionId: string;
  clientName: string | null;
  receivedAt: Date;
  read: boolean;
}

export type RealtimeNotification = AppointmentNotification | ChatEscalationNotification;
