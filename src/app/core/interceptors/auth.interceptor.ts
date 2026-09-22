import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { GOAGENDA_API_URL } from '../config/goagenda-api.config';
import { SessionService } from '../services/session.service';
import { SupabaseAuthService } from '../services/supabase-auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const sessionService = inject(SessionService);
  const supabaseAuthService = inject(SupabaseAuthService);
  const router = inject(Router);

  const isGoagendaApiRequest = req.url.startsWith(GOAGENDA_API_URL);
  const token = sessionService.token;

  const authorizedReq = isGoagendaApiRequest && token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  const cerrarSesion = () => {
    sessionService.clearSession();
    void router.navigateByUrl('/auth/login');
  };

  return next(authorizedReq).pipe(
    catchError((error: unknown) => {
      if (!isGoagendaApiRequest || !(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }

      // Un 401 aca puede ser solo que el access_token expiro justo en este
      // instante (pasa cada ~1h de uso activo, es normal), no
      // necesariamente que la sesion de Supabase este muerta: el cliente
      // renueva el token solo en segundo plano (autoRefreshToken), pero esa
      // renovacion puede no haber alcanzado a completarse antes de esta
      // llamada puntual. Antes esto cerraba la sesion de inmediato ante
      // CUALQUIER 401, desconectando al usuario cada vez que el token
      // rotaba aunque su sesion siguiera siendo perfectamente valida. Ahora
      // se intenta refrescar el token y reintentar UNA vez con el token
      // nuevo; solo si eso tambien falla se asume que la sesion realmente
      // ya no es valida (refresh_token vencido o revocado) y se cierra de
      // verdad.
      return from(supabaseAuthService.getFreshAccessToken()).pipe(
        switchMap((freshToken) => {
          if (!freshToken) {
            cerrarSesion();
            return throwError(() => error);
          }

          const retriedReq = req.clone({ setHeaders: { Authorization: `Bearer ${freshToken}` } });
          return next(retriedReq).pipe(
            catchError((retryError: unknown) => {
              if (retryError instanceof HttpErrorResponse && retryError.status === 401) {
                cerrarSesion();
              }
              return throwError(() => retryError);
            })
          );
        })
      );
    })
  );
};
