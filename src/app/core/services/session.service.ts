import { Injectable, computed, signal } from '@angular/core';

const ACCESS_TOKEN_KEY = 'goagenda_access_token';
const BUSINESS_ID_KEY = 'goagenda_business_id';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly accessToken = signal<string | null>(localStorage.getItem(ACCESS_TOKEN_KEY));
  private readonly businessIdState = signal<string>(localStorage.getItem(BUSINESS_ID_KEY) ?? '');

  readonly isAuthenticated = computed(() => Boolean(this.accessToken()));
  readonly businessId = computed(() => this.businessIdState());

  get token(): string | null {
    return this.accessToken();
  }

  saveAccessToken(token: string): void {
    this.accessToken.set(token);
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  }

  clearSession(): void {
    this.accessToken.set(null);
    this.businessIdState.set('');
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(BUSINESS_ID_KEY);
  }

  setBusinessContext(businessId: string): void {
    this.businessIdState.set(businessId.trim());
    localStorage.setItem(BUSINESS_ID_KEY, businessId.trim());
  }
}
