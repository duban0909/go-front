import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { SessionService } from './session.service';

export interface SignUpResult {
  needsEmailConfirmation: boolean;
}

@Injectable({ providedIn: 'root' })
export class SupabaseAuthService {
  private readonly client: SupabaseClient;

  constructor(private readonly sessionService: SessionService) {
    this.client = createClient(environment.supabaseUrl, environment.supabaseAnonKey);
  }

  async signInWithPassword(email: string, password: string): Promise<void> {
    const { data, error } = await this.client.auth.signInWithPassword({ email, password });

    if (error) {
      throw new Error(error.message);
    }

    if (!data.session?.access_token) {
      throw new Error('No se recibio token de acceso desde Supabase.');
    }

    this.sessionService.saveAccessToken(data.session.access_token);
  }

  /**
   * Registra un usuario nuevo en Supabase Auth. Si el proyecto exige confirmar el correo,
   * Supabase no devuelve sesion todavia y el usuario debe iniciar sesion despues de confirmar.
   */
  async signUpWithPassword(email: string, password: string): Promise<SignUpResult> {
    const { data, error } = await this.client.auth.signUp({ email, password });

    if (error) {
      throw new Error(error.message);
    }

    if (data.session?.access_token) {
      this.sessionService.saveAccessToken(data.session.access_token);
      return { needsEmailConfirmation: false };
    }

    return { needsEmailConfirmation: true };
  }

  async signOut(): Promise<void> {
    await this.client.auth.signOut();
    this.sessionService.clearSession();
  }
}
