import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { SupabaseAuthService } from './core/services/supabase-auth.service';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideRouter(routes),
    // Fuerza la creacion de SupabaseAuthService (y con ella, el cliente de
    // Supabase que renueva el access_token en segundo piano) desde que
    // arranca la app, sin importar en que ruta caiga el usuario. Antes solo
    // se creaba si el usuario pasaba por Login/Registro en esa misma carga
    // de pagina: si ya estaba logueado (token guardado de una sesion
    // anterior) y entraba directo a una pantalla interna, o si recargaba la
    // pagina estando adentro, nadie renovaba el token y terminaba
    // expirando en silencio, sacando al usuario con 401 en cualquier
    // llamada al backend.
    provideAppInitializer(() => {
      inject(SupabaseAuthService);
    })
  ]
};
