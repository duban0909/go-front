import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { GoagendaApiService } from '../../../core/services/goagenda-api.service';
import { SessionService } from '../../../core/services/session.service';
import { ServiceItem } from '../../../core/models/goagenda.models';
import { LucideIconComponent } from '../../../shared/components/lucide-icon/lucide-icon.component';
import { UiButtonComponent } from '../../../shared/components/ui-button/ui-button.component';
import { UiModalComponent } from '../../../shared/components/ui-modal/ui-modal.component';
import { UiTextFieldComponent } from '../../../shared/components/ui-text-field/ui-text-field.component';
import { CopCurrencyPipe } from '../../../shared/pipes/cop-currency.pipe';

@Component({
  selector: 'app-services-page',
  imports: [ReactiveFormsModule, LucideIconComponent, UiButtonComponent, UiModalComponent, UiTextFieldComponent, CopCurrencyPipe],
  templateUrl: './services.page.html',
  styleUrl: './services.page.css'
})
export class ServicesPageComponent implements OnInit {
  readonly services = signal<ServiceItem[]>([]);
  readonly skeletonRows = [0, 1, 2];
  readonly isLoading = signal(false);
  readonly error = signal('');
  readonly isSaving = signal(false);
  readonly isModalOpen = signal(false);
  readonly editingService = signal<ServiceItem | null>(null);

  readonly form;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly apiService: GoagendaApiService,
    private readonly sessionService: SessionService
  ) {
    this.form = this.formBuilder.nonNullable.group({
      name: ['', [Validators.required]],
      duration_minutes: [30, [Validators.required, Validators.min(5)]],
      price: [0, [Validators.required, Validators.min(0)]]
    });
  }

  ngOnInit(): void {
    void this.loadServices();
  }

  async loadServices(): Promise<void> {
    const businessId = this.sessionService.businessId();

    if (!businessId) {
      return;
    }

    this.error.set('');
    this.isLoading.set(true);

    try {
      const services = await firstValueFrom(this.apiService.listServices(businessId));
      this.services.set(services);
    } catch {
      this.error.set('No se pudo cargar el catalogo de servicios.');
    } finally {
      this.isLoading.set(false);
    }
  }

  openCreateModal(): void {
    this.editingService.set(null);
    this.form.reset({ name: '', duration_minutes: 30, price: 0 });
    this.isModalOpen.set(true);
  }

  openEditModal(service: ServiceItem): void {
    this.editingService.set(service);
    this.form.reset({
      name: service.name,
      duration_minutes: service.duration_minutes,
      price: service.price
    });
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  async submit(): Promise<void> {
    const businessId = this.sessionService.businessId();

    if (this.form.invalid || !businessId || this.isSaving()) {
      this.form.markAllAsTouched();
      return;
    }

    const { name, duration_minutes, price } = this.form.getRawValue();
    this.isSaving.set(true);

    try {
      const editing = this.editingService();

      if (editing) {
        await firstValueFrom(this.apiService.updateService(editing.id, { name, duration_minutes, price }));
      } else {
        await firstValueFrom(this.apiService.createService({ business_id: businessId, name, duration_minutes, price }));
      }

      this.isModalOpen.set(false);
      await this.loadServices();
    } catch {
      this.error.set('No se pudo guardar el servicio.');
    } finally {
      this.isSaving.set(false);
    }
  }

  async deleteService(service: ServiceItem): Promise<void> {
    try {
      await firstValueFrom(this.apiService.deleteService(service.id));
      this.services.update((items) => items.filter((item) => item.id !== service.id));
    } catch {
      this.error.set('No se pudo eliminar el servicio.');
    }
  }
}
