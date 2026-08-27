export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface AppointmentRecord {
  id: string;
  business_id: string;
  employee_id: string | null;
  client_name: string;
  client_phone: string;
  service_id: string;
  scheduled_at: string;
  status: AppointmentStatus;
  created_at: string;
  reminder_sent: boolean;
}

/** Fila de GET /appointments: la cita cruda mas el servicio y el empleado resueltos via join. */
export interface AppointmentApiRecord extends AppointmentRecord {
  services: { name: string; price: number; duration_minutes: number } | null;
  employees: { name: string | null } | null;
}

export interface AppointmentsListResponse {
  appointments: AppointmentApiRecord[];
  total: number;
  limit: number;
  offset: number;
}

export interface ListAppointmentsParams {
  business_id: string;
  employee_id?: string;
  status?: AppointmentStatus;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}
