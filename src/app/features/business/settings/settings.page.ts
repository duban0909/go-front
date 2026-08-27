import { Component, OnInit, computed, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { GoagendaApiService } from '../../../core/services/goagenda-api.service';
import { SessionService } from '../../../core/services/session.service';
import { SupabaseAuthService } from '../../../core/services/supabase-auth.service';
import { LucideIconComponent } from '../../../shared/components/lucide-icon/lucide-icon.component';
import { UiButtonComponent } from '../../../shared/components/ui-button/ui-button.component';
import { UiTextFieldComponent } from '../../../shared/components/ui-text-field/ui-text-field.component';

@Component({
  selector: 'app-settings-page',
  imports: [ReactiveFormsModule, LucideIconComponent, UiButtonComponent, UiTextFieldComponent],
  templateUrl: './settings.page.html',
  styleUrl: './settings.page.css'
})
export class SettingsPageComponent implements OnInit {
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly isLoggingOut = signal(false);
  readonly error = signal('');
  readonly successMessage = signal('');

  readonly chatEnabled = signal(false);
  readonly linkCopied = signal(false);

  readonly form;

  readonly chatLink = computed(() => {
    const businessId = this.sessionService.businessId();
    return businessId ? `${window.location.origin}/chat/${businessId}` : '';
  });

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly apiService: GoagendaApiService,
    private readonly sessionService: SessionService,
    private readonly authService: SupabaseAuthService,
    private readonly router: Router
  ) {
    this.form = this.formBuilder.nonNullable.group({
      name: ['', [Validators.required]],
      phone_number: ['']
    });
  }

  ngOnInit(): void {
    void this.loadSettings();
    void this.loadChatConfig();
  }

  async loadChatConfig(): Promise<void> {
    const businessId = this.sessionService.businessId();

    if (!businessId) {
      return;
    }

    try {
      const config = await firstValueFrom(this.apiService.getChatConfig(businessId));
      this.chatEnabled.set(config.enabled);
    } catch {
      this.chatEnabled.set(false);
    }
  }

  async copyLink(): Promise<void> {
    const link = this.chatLink();

    if (!link) {
      return;
    }

    try {
      await navigator.clipboard.writeText(link);
      this.linkCopied.set(true);
      setTimeout(() => this.linkCopied.set(false), 2000);
    } catch {
      this.error.set('No se pudo copiar el enlace.');
    }
  }

  async loadSettings(): Promise<void> {
    const businessId = this.sessionService.businessId();

    if (!businessId) {
      return;
    }

    this.error.set('');
    this.isLoading.set(true);

    try {
      const settings = await firstValueFrom(this.apiService.getBusinessSettings(businessId));
      this.form.reset({ name: settings.name, phone_number: settings.phone_number ?? '' });
    } catch {
      this.error.set('No se pudo cargar la informacion del negocio.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async saveChanges(): Promise<void> {
    const businessId = this.sessionService.businessId();

    if (this.form.invalid || !businessId || this.isSaving()) {
      this.form.markAllAsTouched();
      return;
    }

    const { name, phone_number } = this.form.getRawValue();
    this.error.set('');
    this.successMessage.set('');
    this.isSaving.set(true);

    try {
      await firstValueFrom(this.apiService.updateBusinessInfo({ business_id: businessId, name, phone_number }));
      this.successMessage.set('Cambios guardados.');
    } catch {
      this.error.set('No se pudieron guardar los cambios.');
    } finally {
      this.isSaving.set(false);
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
