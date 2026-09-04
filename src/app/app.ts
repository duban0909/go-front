import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SupabaseAuthService } from './core/services/supabase-auth.service';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  // Se inyecta sin usarse directamente: fuerza a Angular a instanciar este
  // singleton (y por lo tanto registrar su listener de onAuthStateChange
  // que mantiene sincronizado el token) desde el arranque de la app, sin
  // depender de que el usuario visite login/registro/ajustes primero.
  constructor(private readonly supabaseAuthService: SupabaseAuthService) {}
}
