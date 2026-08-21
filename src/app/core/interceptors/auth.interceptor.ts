import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { GOAGENDA_API_URL } from '../config/goagenda-api.config';
import { SessionService } from '../services/session.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const sessionService = inject(SessionService);
  const router = inject(Router);

  const isGoagendaApiRequest = req.url.startsWith(GOAGENDA_API_URL);
  const token = sessionService.token;

  const authorizedReq = isGoagendaApiRequest && token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authorizedReq).pipe(
    catchError((error: unknown) => {
      if (isGoagendaApiRequest && error instanceof HttpErrorResponse && error.status === 401) {
        sessionService.clearSession();
        void router.navigateByUrl('/auth/login');
      }

      return throwError(() => error);
    })
  );
};
