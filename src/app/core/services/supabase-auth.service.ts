import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { GoagendaApiService } from './goagenda-api.service';
import { SessionService } from './session.service';

@Injectable({ providedIn: 'root' })
export class SupabaseAuthService {
  private readonly client: SupabaseClient;

  constructor(
    private readonly sessionService: SessionService,
    private readonly apiService: GoagendaApiService
  ) {
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
    await this.bootstrapBusinessContext(email);
  }

  /**
   * Resuelve el negocio del usuario autenticado contra POST /businesses, que es
   * idempotente: si ya existe uno para este owner lo devuelve, si no lo crea.
   * Sin esto no hay business_id con el que llamar al resto de la API.
   */
  private async bootstrapBusinessContext(email: string): Promise<void> {
    try {
      const business = await firstValueFrom(
        this.apiService.crearNegocio({ name: `Negocio de ${email}` })
      );
      this.sessionService.setBusinessContext(business.id);
    } catch (error) {
      console.error('bootstrapBusinessContext failed:', error);
      this.sessionService.clearSession();

      const detail =
        error instanceof HttpErrorResponse
          ? `(${error.status}) ${error.error?.message ?? error.message}`
          : error instanceof Error
            ? error.message
            : String(error);

      throw new Error(`No fue posible cargar la informacion de tu negocio: ${detail}`);
    }
  }

  async signOut(): Promise<void> {
    await this.client.auth.signOut();
    this.sessionService.clearSession();
  }
}
