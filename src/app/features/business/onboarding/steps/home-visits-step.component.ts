import { Component, EventEmitter, Input, OnInit, Output, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { HomeVisitZone, ServiceItem } from '../../../../core/models/goagenda.models';
import { GoagendaApiService } from '../../../../core/services/goagenda-api.service';
import { SessionService } from '../../../../core/services/session.service';
import { UiButtonComponent } from '../../../../shared/components/ui-button/ui-button.component';
import { UiTextFieldComponent } from '../../../../shared/components/ui-text-field/ui-text-field.component';
import { CopCurrencyPipe } from '../../../../shared/pipes/cop-currency.pipe';
import { notBlankValidator } from '../../../../shared/utils/form-validators';

@Component({
  selector: 'app-onboarding-home-visits',
  imports: [ReactiveFormsModule, UiButtonComponent, UiTextFieldComponent, CopCurrencyPipe],
  templateUrl: './home-visits-step.component.html',
  styleUrl: './step.css'
})
export class HomeVisitsStepComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly apiService = inject(GoagendaApiService);
  private readonly sessionService = inject(SessionService);

  @Input({ required: true }) businessId!: string;
  @Output() readonly next = new EventEmitter<void>();
  @Output() readonly back = new EventEmitter<void>();

  readonly enabled = computed(() => this.sessionService.homeVisitsEnabled());
  readonly services = signal<ServiceItem[]>([]);
  readonly zones = signal<HomeVisitZone[]>([]);
  readonly isToggling = signal(false);
  readonly isAddingZone = signal(false);
  readonly error = signal('');

  readonly zoneForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, notBlankValidator]],
    fee: [0, [Validators.required, Validators.min(0)]]
  });

  get zoneNameError(): string | null {
    const control = this.zoneForm.controls.name;
    return control.touched && control.invalid ? 'El nombre del municipio o zona es obligatorio.' : null;
  }

  get zoneFeeError(): string | null {
    const control = this.zoneForm.controls.fee;
    return control.touched && control.invalid ? 'El recargo no puede ser negativo.' : null;
  }

  ngOnInit(): void {
    void this.loadData();
  }

  private async loadData(): Promise<void> {
    if (!this.businessId) {
      return;
    }

    try {
      const [services, zones] = await Promise.all([
        firstValueFrom(this.apiService.listServices(this.businessId)),
        firstValueFrom(this.apiService.listHomeVisitZones(this.businessId))
      ]);
      this.services.set(services);
      this.zones.set(zones);
    } catch {
      this.error.set('No se pudo cargar la informacion de domicilios.');
    }
  }

  async toggleEnabled(): Promise<void> {
    if (!this.businessId || this.isToggling()) {
      return;
    }

    const nextValue = !this.enabled();
    this.isToggling.set(true);
    this.error.set('');

    try {
      await firstValueFrom(this.apiService.updateHomeVisitsEnabled({ business_id: this.businessId, enabled: nextValue }));
      this.sessionService.setHomeVisitsEnabled(nextValue);
    } catch {
      this.error.set('No se pudo cambiar la configuracion de domicilios.');
    } finally {
      this.isToggling.set(false);
    }
  }

  async toggleService(service: ServiceItem): Promise<void> {
    const nextValue = !service.offers_home_visit;
    this.error.set('');

    try {
      await firstValueFrom(this.apiService.updateService(service.id, { offers_home_visit: nextValue }));
      this.services.update((list) => list.map((item) => (item.id === service.id ? { ...item, offers_home_visit: nextValue } : item)));
    } catch {
      this.error.set('No se pudo actualizar el servicio.');
    }
  }

  async addZone(): Promise<void> {
    if (this.zoneForm.invalid || !this.businessId || this.isAddingZone()) {
      this.zoneForm.markAllAsTouched();
      return;
    }

    const { name, fee } = this.zoneForm.getRawValue();
    this.isAddingZone.set(true);
    this.error.set('');

    try {
      await firstValueFrom(this.apiService.createHomeVisitZone({ business_id: this.businessId, name: name.trim(), fee }));
      this.zoneForm.reset({ name: '', fee: 0 });
      this.zones.set(await firstValueFrom(this.apiService.listHomeVisitZones(this.businessId)));
    } catch (error) {
      const status = (error as { status?: number }).status;
      this.error.set(status === 409 ? 'Ya existe una zona con ese nombre.' : 'No se pudo agregar la zona.');
    } finally {
      this.isAddingZone.set(false);
    }
  }

  async deleteZone(zone: HomeVisitZone): Promise<void> {
    try {
      await firstValueFrom(this.apiService.deleteHomeVisitZone(zone.id));
      this.zones.update((list) => list.filter((item) => item.id !== zone.id));
    } catch {
      this.error.set('No se pudo eliminar la zona.');
    }
  }
}
