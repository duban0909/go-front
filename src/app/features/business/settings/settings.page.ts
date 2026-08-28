import { Component, OnInit, computed, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { GoagendaApiService } from '../../../core/services/goagenda-api.service';
import { SessionService } from '../../../core/services/session.service';
import { SupabaseAuthService } from '../../../core/services/supabase-auth.service';
import { ChatLinkQrCardComponent } from '../../../shared/components/chat-link-qr-card/chat-link-qr-card.component';
import { LucideIconComponent } from '../../../shared/components/lucide-icon/lucide-icon.component';
import { UiButtonComponent } from '../../../shared/components/ui-button/ui-button.component';
import { UiModalComponent } from '../../../shared/components/ui-modal/ui-modal.component';
import { UiTextFieldComponent } from '../../../shared/components/ui-text-field/ui-text-field.component';

@Component({
  selector: 'app-settings-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    LucideIconComponent,
    UiButtonComponent,
    UiTextFieldComponent,
    UiModalComponent,
    ChatLinkQrCardComponent
  ],
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
  readonly isSavingOwnerName = signal(false);
  readonly ownerNameSuccess = signal('');
  readonly isLinksInfoModalOpen = signal(false);

  readonly form;
  readonly ownerNameForm;

  readonly chatLink = computed(() => {
    const businessId = this.sessionService.businessId();
    return businessId ? `${window.location.origin}/chat/${businessId}` : '';
  });

  readonly ownChatLink = computed(() => {
    const businessId = this.sessionService.businessId();
    const employeeId = this.sessionService.employeeId();
    return businessId && employeeId ? `${window.location.origin}/chat/${businessId}/${employeeId}` : '';
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
    this.ownerNameForm = this.formBuilder.nonNullable.group({
      name: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    void this.loadSettings();
    void this.loadChatConfig();
    this.ownerNameForm.reset({ name: this.sessionService.currentEmployment()?.name ?? '' });
  }

  async saveOwnerName(): Promise<void> {
    const employeeId = this.sessionService.employeeId();

    if (this.ownerNameForm.invalid || !employeeId || this.isSavingOwnerName()) {
      this.ownerNameForm.markAllAsTouched();
      return;
    }

    this.isSavingOwnerName.set(true);
    this.ownerNameSuccess.set('');
    this.error.set('');

    try {
      const { name } = this.ownerNameForm.getRawValue();
      await firstValueFrom(this.apiService.updateEmployee(employeeId, { name }));
      await this.sessionService.refresh();
      this.ownerNameSuccess.set('Nombre actualizado.');
    } catch {
      this.error.set('No se pudo actualizar tu nombre.');
    } finally {
      this.isSavingOwnerName.set(false);
    }
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
