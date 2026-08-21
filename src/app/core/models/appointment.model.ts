export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

/** Fila de la tabla `appointments` de Supabase, consultada directamente (no pasa por el backend de GoAgenda). */
export interface AppointmentRecord {
  id: string;
  business_id: string;
  client_name: string;
  client_phone: string;
  service_id: string;
  scheduled_at: string;
  status: AppointmentStatus;
  created_at: string;
  reminder_sent: boolean;
}
