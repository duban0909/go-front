import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { GoagendaApiService } from '../../../core/services/goagenda-api.service';
import { SessionService } from '../../../core/services/session.service';
import { resolveHomeRoute } from '../../../core/utils/session-routing';
import { UiButtonComponent } from '../../../shared/components/ui-button/ui-button.component';

const CODE_LENGTH = 6;

@Component({
  selector: 'app-redeem-code-page',
  imports: [FormsModule, UiButtonComponent],
  templateUrl: './redeem-code.page.html',
  styleUrl: './redeem-code.page.css'
})
export class RedeemCodePageComponent {
  private readonly apiService = inject(GoagendaApiService);
  private readonly sessionService = inject(SessionService);
  private readonly router = inject(Router);

  readonly code = signal('');
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');

  readonly canSubmit = () => this.code().length === CODE_LENGTH && !this.isSubmitting();

  onCodeInput(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    const normalized = raw
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, CODE_LENGTH);
    this.code.set(normalized);
    (event.target as HTMLInputElement).value = normalized;
  }

  async submit(): Promise<void> {
    if (!this.canSubmit()) {
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    try {
      await firstValueFrom(this.apiService.redeemInvitationCode({ code: this.code() }));
      await this.sessionService.refresh();
      await this.router.navigateByUrl(resolveHomeRoute(this.sessionService), { replaceUrl: true });
    } catch (error) {
      this.errorMessage.set(this.resolveErrorMessage(error));
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 404) {
        return 'Codigo invalido o ya usado.';
      }

      if (error.status === 409) {
        return 'Este negocio ya tiene un dueño asignado.';
      }
    }

    return 'No se pudo validar el codigo. Intenta de nuevo.';
  }
}
