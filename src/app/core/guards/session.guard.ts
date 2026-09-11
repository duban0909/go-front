import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from '../services/session.service';
import { resolveHomeRoute } from '../utils/session-routing';

/** Espera a que GET /me se resuelva; sin token valido, manda a login. Base de toda ruta protegida. */
export const sessionGuard: CanActivateFn = async (_route, state) => {
  const router = inject(Router);
  const sessionService = inject(SessionService);

  const me = await sessionService.ensureLoaded();

  if (!sessionService.isAuthenticated() || !me) {
    return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
  }

  return true;
};

export const superAdminGuard: CanActivateFn = () => {
  const router = inject(Router);
  const sessionService = inject(SessionService);

  if (!sessionService.isSuperAdmin()) {
    return router.createUrlTree([resolveHomeRoute(sessionService)]);
  }

  return true;
};

export const ownerGuard: CanActivateFn = () => {
  const router = inject(Router);
  const sessionService = inject(SessionService);

  if (sessionService.employments().length === 0) {
    return router.createUrlTree(['/onboarding/codigo']);
  }

  if (sessionService.role() !== 'owner') {
    return router.createUrlTree([resolveHomeRoute(sessionService)]);
  }

  return true;
};

export const staffGuard: CanActivateFn = () => {
  const router = inject(Router);
  const sessionService = inject(SessionService);

  if (sessionService.role() !== 'staff') {
    return router.createUrlTree([resolveHomeRoute(sessionService)]);
  }

  return true;
};

/** Evita reingresar a /onboarding/codigo si el usuario ya quedo ligado a un negocio (o es super admin). */
export const onboardingGuard: CanActivateFn = () => {
  const router = inject(Router);
  const sessionService = inject(SessionService);

  if (sessionService.isSuperAdmin() || sessionService.employments().length > 0) {
    return router.createUrlTree([resolveHomeRoute(sessionService)]);
  }

  return true;
};

/** Fuerza al dueño a completar el WhatsApp del negocio antes de usar el resto del panel. */
export const businessInfoGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const sessionService = inject(SessionService);

  const complete = await sessionService.ensureBusinessInfoChecked();

  if (!complete) {
    return router.createUrlTree(['/business/settings']);
  }

  return true;
};

/**
 * Bloquea todo el panel de negocio (Citas, Servicios, Horario, Empleados,
 * Ajustes) hasta que el onboarding guiado quede completo. Va en la ruta
 * padre "business", asi que corre una sola vez al entrar al subarbol y
 * cubre todos los hijos sin tener que repetirlo en cada uno.
 */
export const businessOnboardedGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const sessionService = inject(SessionService);

  await sessionService.ensureLoaded();

  if (!sessionService.onboardingCompleted()) {
    return router.createUrlTree(['/business/onboarding']);
  }

  return true;
};

/** Protege la ruta del wizard: solo el dueño puede entrar, y solo mientras el onboarding siga pendiente. */
export const businessOnboardingWizardGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const sessionService = inject(SessionService);

  await sessionService.ensureLoaded();

  if (sessionService.role() !== 'owner') {
    return router.createUrlTree([resolveHomeRoute(sessionService)]);
  }

  if (sessionService.onboardingCompleted()) {
    return router.createUrlTree(['/business/appointments']);
  }

  return true;
};
