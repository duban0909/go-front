import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { GoagendaApiService } from '../../../core/services/goagenda-api.service';
import { SessionService } from '../../../core/services/session.service';
import { SupabaseAuthService } from '../../../core/services/supabase-auth.service';
import { ChatLinkQrCardComponent } from '../../../shared/components/chat-link-qr-card/chat-link-qr-card.component';
import { LucideIconComponent } from '../../../shared/components/lucide-icon/lucide-icon.component';
import { UiButtonComponent } from '../../../shared/components/ui-button/ui-button.component';
import { UiTextFieldComponent } from '../../../shared/components/ui-text-field/ui-text-field.component';

@Component({
  selector: 'app-my-profile-page',
  imports: [ReactiveFormsModule, LucideIconComponent, UiButtonComponent, UiTextFieldComponent, ChatLinkQrCardComponent],
  templateUrl: './my-profile.page.html',
  styleUrl: './my-profile.page.css'
})
export class MyProfilePageComponent implements OnInit {
  private readonly apiService = inject(GoagendaApiService);
  private readonly sessionService = inject(SessionService);
  private readonly authService = inject(SupabaseAuthService);
  private readonly router = inject(Router);

  readonly isSavingName = signal(false);
  readonly isLoggingOut = signal(false);
  readonly error = signal('');
  readonly successMessage = signal('');
  readonly whatsapp = signal('');

  readonly businessName = computed(() => this.sessionService.currentEmployment()?.business_name ?? '');
  readonly chatLink = computed(() => {
    const businessId = this.sessionService.businessId();
    const employeeId = this.sessionService.employeeId();
    return businessId && employeeId ? `${window.location.origin}/chat/${businessId}/${employeeId}` : '';
  });

  readonly nameForm;

  constructor(private readonly formBuilder: FormBuilder) {
    this.nameForm = this.formBuilder.nonNullable.group({
      name: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    this.nameForm.reset({ name: this.sessionService.currentEmployment()?.name ?? '' });
    void this.loadWhatsapp();
  }

  private async loadWhatsapp(): Promise<void> {
    const businessId = this.sessionService.businessId();

    if (!businessId) {
      return;
    }

    try {
      const settings = await firstValueFrom(this.apiService.getBusinessSettings(businessId));
      this.whatsapp.set(settings.phone_number ?? '');
    } catch {
      this.whatsapp.set('');
    }
  }

  async saveName(): Promise<void> {
    const employeeId = this.sessionService.employeeId();

    if (this.nameForm.invalid || !employeeId || this.isSavingName()) {
      this.nameForm.markAllAsTouched();
      return;
    }

    this.isSavingName.set(true);
    this.successMessage.set('');
    this.error.set('');

    try {
      const { name } = this.nameForm.getRawValue();
      await firstValueFrom(this.apiService.updateEmployee(employeeId, { name }));
      await this.sessionService.refresh();
      this.successMessage.set('Nombre actualizado.');
    } catch {
      this.error.set('No se pudo actualizar tu nombre.');
    } finally {
      this.isSavingName.set(false);
    }
  }

  async logout(): Promise<void> {
    this.isLoggingOut.set(true);

    try {
      await this.authService.signOut();
      await this.router.navigateByUrl('/auth/login', { replaceUrl: true });
    } finally {
      this.isLoggingOut.set(false);
    }
  }
}
