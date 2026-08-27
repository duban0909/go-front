import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Employment, MeResponse } from '../models/goagenda.models';
import { GoagendaApiService } from './goagenda-api.service';

const ACCESS_TOKEN_KEY = 'goagenda_access_token';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly apiService = inject(GoagendaApiService);

  private readonly accessToken = signal<string | null>(localStorage.getItem(ACCESS_TOKEN_KEY));
  private readonly me = signal<MeResponse | null>(null);
  private readonly businessInfoComplete = signal<boolean | null>(null);

  private loadPromise: Promise<MeResponse | null> | null = null;
  private businessInfoPromise: Promise<boolean> | null = null;

  readonly isAuthenticated = computed(() => Boolean(this.accessToken()));
  readonly isSuperAdmin = computed(() => this.me()?.is_super_admin ?? false);
  readonly employments = computed<Employment[]>(() => this.me()?.employments ?? []);
  readonly currentEmployment = computed(() => this.employments().find((e) => e.active));
  readonly businessId = computed(() => this.currentEmployment()?.business_id ?? '');
  readonly employeeId = computed(() => this.currentEmployment()?.employee_id ?? '');
  readonly role = computed(() => this.currentEmployment()?.role);

  get token(): string | null {
    return this.accessToken();
  }

  saveAccessToken(token: string): void {
    this.accessToken.set(token);
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  }

  clearSession(): void {
    this.accessToken.set(null);
    this.me.set(null);
    this.businessInfoComplete.set(null);
    this.loadPromise = null;
    this.businessInfoPromise = null;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }

  /** Carga GET /me una sola vez (memoizado); no llama a la API si no hay token. */
  async ensureLoaded(): Promise<MeResponse | null> {
    if (!this.accessToken()) {
      return null;
    }

    if (this.me()) {
      return this.me();
    }

    this.loadPromise ??= this.fetchMe();
    return this.loadPromise;
  }

  /** Fuerza un re-fetch de GET /me (ej: despues de redimir un codigo de invitacion). */
  async refresh(): Promise<MeResponse | null> {
    this.me.set(null);
    this.businessInfoComplete.set(null);
    this.loadPromise = null;
    this.businessInfoPromise = null;
    return this.ensureLoaded();
  }

  /** Verifica (memoizado) si al negocio actual le falta completar datos (telefono de WhatsApp). */
  async ensureBusinessInfoChecked(): Promise<boolean> {
    if (this.businessInfoComplete() !== null) {
      return this.businessInfoComplete()!;
    }

    this.businessInfoPromise ??= this.fetchBusinessInfoComplete();
    return this.businessInfoPromise;
  }

  private async fetchMe(): Promise<MeResponse | null> {
    try {
      const me = await firstValueFrom(this.apiService.getMe());
      this.me.set(me);
      return me;
    } catch {
      this.clearSession();
      return null;
    }
  }

  private async fetchBusinessInfoComplete(): Promise<boolean> {
    const businessId = this.businessId();

    if (!businessId) {
      return false;
    }

    try {
      const settings = await firstValueFrom(this.apiService.getBusinessSettings(businessId));
      const complete = Boolean(settings.phone_number && settings.phone_number.trim());
      this.businessInfoComplete.set(complete);
      return complete;
    } catch {
      return false;
    }
  }
}
