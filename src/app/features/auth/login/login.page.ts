import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SessionService } from '../../../core/services/session.service';
import { SupabaseAuthService } from '../../../core/services/supabase-auth.service';
import { resolveHomeRoute } from '../../../core/utils/session-routing';
import { UiButtonComponent } from '../../../shared/components/ui-button/ui-button.component';
import { UiTextFieldComponent } from '../../../shared/components/ui-text-field/ui-text-field.component';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, RouterLink, UiTextFieldComponent, UiButtonComponent],
  templateUrl: './login.page.html',
  styleUrl: './login.page.css'
})
export class LoginPageComponent {
  private readonly sessionService = inject(SessionService);

  readonly isLoading = signal(false);
  readonly errorMessage = signal('');

  readonly form;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly authService: SupabaseAuthService,
    private readonly router: Router
  ) {
    this.form = this.formBuilder.nonNullable.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  async submit(): Promise<void> {
    if (this.form.invalid || this.isLoading()) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      const { email, password } = this.form.getRawValue();
      await this.authService.signInWithPassword(email, password);
      await this.sessionService.refresh();
      await this.router.navigateByUrl(resolveHomeRoute(this.sessionService), { replaceUrl: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No fue posible iniciar sesion.';
      this.errorMessage.set(message);
    } finally {
      this.isLoading.set(false);
    }
  }

  fieldError(controlName: 'email' | 'password'): string | null {
    const control = this.form.controls[controlName];

    if (!control.touched || !control.invalid) {
      return null;
    }

    if (controlName === 'email') {
      return 'Ingresa un correo valido.';
    }

    return 'La contrasena debe tener al menos 6 caracteres.';
  }
}
