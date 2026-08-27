import { SessionService } from '../services/session.service';

/** Ruta "home" segun el rol resuelto por GET /me. Usada tras login, registro y redencion de codigo. */
export function resolveHomeRoute(session: SessionService): string {
  if (session.isSuperAdmin()) {
    return '/admin';
  }

  if (session.employments().length === 0) {
    return '/onboarding/codigo';
  }

  return session.role() === 'staff' ? '/employee' : '/business';
}
