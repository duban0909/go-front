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
    this.client = createClient(environment.supabaseUrl, environment.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true }
    });

    // Supabase renueva el access_token solo internamente (autoRefreshToken) y
    // al recargar la pagina (INITIAL_SESSION); sin este listener, SessionService
    // se queda con el token viejo hasta que expira y el usuario es desconectado
    // aunque su sesion de Supabase siga viva.
    this.client.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        this.sessionService.clearSession();
        return;
      }

      if (session?.access_token) {
        this.sessionService.saveAccessToken(session.access_token);
      }
    });
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
