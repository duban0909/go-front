import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SessionService } from '../../../core/services/session.service';
import { SupabaseAuthService } from '../../../core/services/supabase-auth.service';
import { resolveHomeRoute } from '../../../core/utils/session-routing';
import { UiButtonComponent } from '../../../shared/components/ui-button/ui-button.component';
import { UiTextFieldComponent } from '../../../shared/components/ui-text-field/ui-text-field.component';

function passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirm_password')?.value;
  return password && confirmPassword && password !== confirmPassword ? { passwordMismatch: true } : null;
}

@Component({
  selector: 'app-register-page',
  imports: [ReactiveFormsModule, RouterLink, UiTextFieldComponent, UiButtonComponent],
  templateUrl: './register.page.html',
  styleUrl: './register.page.css'
})
export class RegisterPageComponent {
  private readonly sessionService = inject(SessionService);

  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly needsEmailConfirmation = signal(false);

  readonly form;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly authService: SupabaseAuthService,
    private readonly router: Router
  ) {
    this.form = this.formBuilder.nonNullable.group(
      {
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirm_password: ['', [Validators.required]]
      },
      { validators: passwordsMatchValidator }
    );
  }

  async submit(): Promise<void> {
    if (this.form.invalid || this.isLoading()) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.needsEmailConfirmation.set(false);

    try {
      const { email, password } = this.form.getRawValue();
      const result = await this.authService.signUpWithPassword(email, password);

      if (result.needsEmailConfirmation) {
        this.needsEmailConfirmation.set(true);
        return;
      }

      await this.sessionService.refresh();
      await this.router.navigateByUrl(resolveHomeRoute(this.sessionService), { replaceUrl: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No fue posible crear la cuenta.';
      this.errorMessage.set(message);
    } finally {
      this.isLoading.set(false);
    }
  }

  fieldError(controlName: 'email' | 'password' | 'confirm_password'): string | null {
    const control = this.form.controls[controlName];

    if (controlName === 'confirm_password' && control.touched && this.form.hasError('passwordMismatch')) {
      return 'Las contrasenas no coinciden.';
    }

    if (!control.touched || !control.invalid) {
      return null;
    }

    if (controlName === 'email') {
      return 'Ingresa un correo valido.';
    }

    if (controlName === 'password') {
      return 'La contrasena debe tener al menos 6 caracteres.';
    }

    return 'Confirma tu contrasena.';
  }
}
