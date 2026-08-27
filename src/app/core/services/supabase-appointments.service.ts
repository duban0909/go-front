import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { AppointmentRecord } from '../models/appointment.model';

@Injectable({ providedIn: 'root' })
export class SupabaseAppointmentsService {
  private readonly client: SupabaseClient = createClient(environment.supabaseUrl, environment.supabaseAnonKey);

  async listByBusiness(businessId: string): Promise<AppointmentRecord[]> {
    const { data, error } = await this.client
      .from('appointments')
      .select('*')
      .eq('business_id', businessId)
      .order('scheduled_at', { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []) as AppointmentRecord[];
  }

  async listByEmployee(employeeId: string): Promise<AppointmentRecord[]> {
    const { data, error } = await this.client
      .from('appointments')
      .select('*')
      .eq('employee_id', employeeId)
      .order('scheduled_at', { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []) as AppointmentRecord[];
  }
}
