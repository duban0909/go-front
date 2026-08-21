import { Component, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseAuthService } from '../../../core/services/supabase-auth.service';
import { UiButtonComponent } from '../../../shared/components/ui-button/ui-button.component';
import { UiTextFieldComponent } from '../../../shared/components/ui-text-field/ui-text-field.component';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, UiTextFieldComponent, UiButtonComponent],
  templateUrl: './login.page.html',
  styleUrl: './login.page.css'
})
export class LoginPageComponent {
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
      await this.router.navigateByUrl('/admin', { replaceUrl: true });
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
