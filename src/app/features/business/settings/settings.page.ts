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
import { WHATSAPP_PHONE_PATTERN, notBlankValidator } from '../../../shared/utils/form-validators';
import { HomeVisitZone } from '../../../core/models/goagenda.models';
import { CopCurrencyPipe } from '../../../shared/pipes/cop-currency.pipe';

@Component({
  selector: 'app-settings-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    LucideIconComponent,
    UiButtonComponent,
    UiTextFieldComponent,
    UiModalComponent,
    ChatLinkQrCardComponent,
    CopCurrencyPipe
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
  readonly homeVisitsEnabled = computed(() => this.sessionService.homeVisitsEnabled());
  readonly isTogglingHomeVisits = signal(false);
  readonly activeTab = signal<'general' | 'chat' | 'domicilios'>('general');

  readonly form;
  readonly ownerNameForm;
  readonly zoneForm;
  readonly zones = signal<HomeVisitZone[]>([]);
  readonly isSavingZone = signal(false);
  readonly zoneError = signal('');
  readonly editingZoneId = signal<string | null>(null);
  readonly editZoneForm;
  readonly isUpdatingZone = signal(false);

  readonly businessId = computed(() => this.sessionService.businessId() ?? '');

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
      name: ['', [Validators.required, notBlankValidator]],
      phone_number: ['', [Validators.required, Validators.pattern(WHATSAPP_PHONE_PATTERN)]]
    });
    this.zoneForm = this.formBuilder.nonNullable.group({
      name: ['', [Validators.required, notBlankValidator]],
      fee: [0, [Validators.required, Validators.min(0)]]
    });
    this.editZoneForm = this.formBuilder.nonNullable.group({
      name: ['', [Validators.required, notBlankValidator]],
      fee: [0, [Validators.required, Validators.min(0)]]
    });
    this.ownerNameForm = this.formBuilder.nonNullable.group({
      name: ['', [Validators.required]]
    });
  }

  get nameError(): string | null {
    if (!this.form.controls.name.touched) {
      return null;
    }
    if (this.form.controls.name.hasError('required') || this.form.controls.name.hasError('blank')) {
      return 'El nombre del negocio es obligatorio.';
    }
    return null;
  }

  get phoneError(): string | null {
    if (!this.form.controls.phone_number.touched) {
      return null;
    }
    if (this.form.controls.phone_number.hasError('required')) {
      return 'El WhatsApp del negocio es obligatorio.';
    }
    if (this.form.controls.phone_number.hasError('pattern')) {
      return 'Ingresa un numero de WhatsApp valido (solo digitos, con codigo de pais opcional).';
    }
    return null;
  }

  ngOnInit(): void {
    void this.loadSettings();
    void this.loadChatConfig();
    void this.loadZones();
    this.ownerNameForm.reset({ name: this.sessionService.currentEmployment()?.name ?? '' });
  }

  async loadZones(): Promise<void> {
    const businessId = this.sessionService.businessId();

    if (!businessId) {
      return;
    }

    try {
      this.zones.set(await firstValueFrom(this.apiService.listHomeVisitZones(businessId)));
    } catch {
      this.zoneError.set('No se pudieron cargar las zonas de domicilio.');
    }
  }

  async addZone(): Promise<void> {
    const businessId = this.sessionService.businessId();

    if (this.zoneForm.invalid || !businessId || this.isSavingZone()) {
      this.zoneForm.markAllAsTouched();
      return;
    }

    const { name, fee } = this.zoneForm.getRawValue();
    this.isSavingZone.set(true);
    this.zoneError.set('');

    try {
      await firstValueFrom(this.apiService.createHomeVisitZone({ business_id: businessId, name: name.trim(), fee }));
      this.zoneForm.reset({ name: '', fee: 0 });
      await this.loadZones();
    } catch (error) {
      const status = (error as { status?: number }).status;
      this.zoneError.set(status === 409 ? 'Ya existe una zona con ese nombre.' : 'No se pudo agregar la zona.');
    } finally {
      this.isSavingZone.set(false);
    }
  }

  async toggleHomeVisits(): Promise<void> {
    const businessId = this.sessionService.businessId();

    if (!businessId || this.isTogglingHomeVisits()) {
      return;
    }

    const enabled = !this.homeVisitsEnabled();
    this.isTogglingHomeVisits.set(true);
    this.zoneError.set('');

    try {
      await firstValueFrom(this.apiService.updateHomeVisitsEnabled({ business_id: businessId, enabled }));
      this.sessionService.setHomeVisitsEnabled(enabled);
    } catch {
      this.zoneError.set('No se pudo cambiar la configuracion de domicilios.');
    } finally {
      this.isTogglingHomeVisits.set(false);
    }
  }

  startEditZone(zone: HomeVisitZone): void {
    this.zoneError.set('');
    this.editZoneForm.reset({ name: zone.name, fee: zone.fee });
    this.editingZoneId.set(zone.id);
  }

  cancelEditZone(): void {
    this.editingZoneId.set(null);
  }

  async saveEditZone(zone: HomeVisitZone): Promise<void> {
    if (this.editZoneForm.invalid || this.isUpdatingZone()) {
      this.editZoneForm.markAllAsTouched();
      return;
    }

    const { name, fee } = this.editZoneForm.getRawValue();
    this.isUpdatingZone.set(true);
    this.zoneError.set('');

    try {
      await firstValueFrom(this.apiService.updateHomeVisitZone(zone.id, { name: name.trim(), fee }));
      this.zones.update((list) => list.map((item) => (item.id === zone.id ? { ...item, name: name.trim(), fee } : item)));
      this.editingZoneId.set(null);
    } catch {
      this.zoneError.set('No se pudo guardar la zona.');
    } finally {
      this.isUpdatingZone.set(false);
    }
  }

  async toggleZone(zone: HomeVisitZone): Promise<void> {
    try {
      await firstValueFrom(this.apiService.updateHomeVisitZone(zone.id, { active: !zone.active }));
      this.zones.update((list) => list.map((item) => (item.id === zone.id ? { ...item, active: !zone.active } : item)));
    } catch {
      this.zoneError.set('No se pudo actualizar la zona.');
    }
  }

  async deleteZone(zone: HomeVisitZone): Promise<void> {
    try {
      await firstValueFrom(this.apiService.deleteHomeVisitZone(zone.id));
      this.zones.update((list) => list.filter((item) => item.id !== zone.id));
    } catch {
      this.zoneError.set('No se pudo eliminar la zona.');
    }
  }

  get zoneNameError(): string | null {
    const control = this.zoneForm.controls.name;
    return control.touched && control.invalid ? 'El nombre del municipio o zona es obligatorio.' : null;
  }

  get zoneFeeError(): string | null {
    const control = this.zoneForm.controls.fee;
    return control.touched && control.invalid ? 'El recargo no puede ser negativo.' : null;
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
      await firstValueFrom(
        this.apiService.updateBusinessInfo({ business_id: businessId, name: name.trim(), phone_number: phone_number.trim() })
      );
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
