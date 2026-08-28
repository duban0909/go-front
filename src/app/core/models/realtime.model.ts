import { AppointmentApiRecord } from './appointment.model';

export type RealtimeEventType = 'appointment.created' | 'appointment.updated' | 'appointment.cancelled';

/**
 * Contrato del WebSocket (a implementar en el backend):
 * `${wsScheme}://<host>/ws/appointments?business_id=<id>`
 *
 * Tras el `open`, el cliente envia como primer mensaje `{ type: 'auth', token }`
 * con el JWT de Supabase (evita exponer el token en la URL/logs).
 *
 * El servidor emite un mensaje JSON por cada evento de cita del negocio:
 * `{ type: RealtimeEventType, business_id: string, appointment: AppointmentApiRecord }`
 */
export interface RealtimeAppointmentMessage {
  type: RealtimeEventType;
  business_id: string;
  appointment: AppointmentApiRecord;
}

export interface AppointmentNotification {
  id: string;
  type: RealtimeEventType;
  appointment: AppointmentApiRecord;
  receivedAt: Date;
  read: boolean;
}
