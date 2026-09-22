import { Component, OnInit, computed, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { GoagendaApiService } from '../../../core/services/goagenda-api.service';
import { SessionService } from '../../../core/services/session.service';
import { ServiceItem, ServicePaymentType } from '../../../core/models/goagenda.models';
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
  readonly homeVisitsEnabled = computed(() => this.sessionService.homeVisitsEnabled());
  readonly skeletonRows = [0, 1, 2];
  readonly isLoading = signal(false);
  readonly error = signal('');
  readonly isSaving = signal(false);
  readonly isModalOpen = signal(false);
  readonly editingService = signal<ServiceItem | null>(null);
  readonly deleteTarget = signal<ServiceItem | null>(null);
  readonly isDeleting = signal(false);

  // Nada de < > { } ni comillas: el nombre se muestra tal cual a los
  // clientes en el chat, y un nombre con pinta de codigo (ej. una etiqueta
  // <script>) se ve roto ahi aunque el navegador lo escape sin riesgo real.
  private static readonly NOMBRE_SERVICIO_PATTERN = /^[a-zA-Z0-9À-ÿñÑ\s.,'&%/!¡¿()-]+$/;

  readonly form;
  /** Reflejo en signal de los valores del form, para derivar `paymentPreviewAmount` (los FormGroup no son signals). */
  private readonly formValue;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly apiService: GoagendaApiService,
    private readonly sessionService: SessionService
  ) {
    this.form = this.formBuilder.nonNullable.group({
      name: ['', [Validators.required, Validators.pattern(ServicesPageComponent.NOMBRE_SERVICIO_PATTERN)]],
      duration_minutes: [30, [Validators.required, Validators.min(5)]],
      price: [0, [Validators.required, Validators.min(0)]],
      offers_home_visit: [false],
      requires_payment: [false],
      payment_type: ['percentage' as ServicePaymentType],
      payment_percentage: [30, [Validators.min(1), Validators.max(100)]],
      // En pesos en el formulario (como price); se convierte a centavos al guardar.
      payment_fixed_amount: [0, [Validators.min(0)]],
      payment_description: ['Abono requerido para confirmar la cita']
    });
    this.formValue = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  }

  get nameError(): string | null {
    const control = this.form.controls.name;
    if (!control.touched) {
      return null;
    }
    if (control.hasError('required')) {
      return 'El nombre del servicio es obligatorio.';
    }
    if (control.hasError('pattern')) {
      return 'Usa solo letras, numeros, espacios y signos basicos (nada de < > { } ni comillas).';
    }
    return null;
  }

  get durationError(): string | null {
    const control = this.form.controls.duration_minutes;
    if (!control.touched) {
      return null;
    }
    if (control.hasError('required')) {
      return 'La duracion es obligatoria.';
    }
    if (control.hasError('min')) {
      return 'La duracion debe ser de al menos 5 minutos.';
    }
    return null;
  }

  get priceError(): string | null {
    const control = this.form.controls.price;
    if (!control.touched) {
      return null;
    }
    if (control.hasError('required')) {
      return 'El precio es obligatorio.';
    }
    if (control.hasError('min')) {
      return 'El precio no puede ser negativo.';
    }
    return null;
  }

  get paymentPercentageError(): string | null {
    const control = this.form.controls.payment_percentage;
    if (!control.touched || this.form.controls.payment_type.value !== 'percentage') {
      return null;
    }
    if (control.hasError('min') || control.hasError('max')) {
      return 'El porcentaje debe estar entre 1 y 100.';
    }
    return null;
  }

  get paymentFixedAmountError(): string | null {
    const control = this.form.controls.payment_fixed_amount;
    if (!control.touched || this.form.controls.payment_type.value !== 'fixed') {
      return null;
    }
    if (control.hasError('min') || control.value <= 0) {
      return 'El monto del abono debe ser mayor a 0.';
    }
    return null;
  }

  /** Vista previa del monto de abono en pesos, calculado igual que lo hara el backend. */
  readonly paymentPreviewAmount = computed(() => {
    const { payment_type, payment_percentage, payment_fixed_amount, price } = this.formValue();
    if (payment_type === 'percentage') {
      return Math.round(((price ?? 0) * (payment_percentage ?? 0)) / 100);
    }
    return payment_fixed_amount ?? 0;
  });

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
    this.form.reset({
      name: '',
      duration_minutes: 30,
      price: 0,
      offers_home_visit: false,
      requires_payment: false,
      payment_type: 'percentage',
      payment_percentage: 30,
      payment_fixed_amount: 0,
      payment_description: 'Abono requerido para confirmar la cita'
    });
    this.isModalOpen.set(true);
  }

  openEditModal(service: ServiceItem): void {
    this.editingService.set(service);
    this.form.reset({
      name: service.name,
      duration_minutes: service.duration_minutes,
      price: service.price,
      offers_home_visit: service.offers_home_visit ?? false,
      requires_payment: service.requires_payment ?? false,
      payment_type: service.payment_type ?? 'percentage',
      payment_percentage: service.payment_percentage ?? 30,
      // El backend guarda centavos; el formulario trabaja en pesos, como price.
      payment_fixed_amount: service.payment_fixed_amount_cents ? Math.round(service.payment_fixed_amount_cents / 100) : 0,
      payment_description: service.payment_description ?? 'Abono requerido para confirmar la cita'
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

    const {
      name,
      duration_minutes,
      price,
      offers_home_visit,
      requires_payment,
      payment_type,
      payment_percentage,
      payment_fixed_amount,
      payment_description
    } = this.form.getRawValue();
    const trimmedName = name.trim();
    this.isSaving.set(true);

    const paymentFields = requires_payment
      ? {
          requires_payment: true,
          payment_type,
          payment_percentage: payment_type === 'percentage' ? payment_percentage : null,
          payment_fixed_amount_cents: payment_type === 'fixed' ? Math.round(payment_fixed_amount * 100) : null,
          payment_description: payment_description?.trim() || 'Abono requerido para confirmar la cita'
        }
      : { requires_payment: false };

    try {
      const editing = this.editingService();
      const payload = { name: trimmedName, duration_minutes, price, offers_home_visit, ...paymentFields };

      if (editing) {
        await firstValueFrom(this.apiService.updateService(editing.id, payload));
      } else {
        await firstValueFrom(this.apiService.createService({ business_id: businessId, ...payload }));
      }

      this.isModalOpen.set(false);
      await this.loadServices();
    } catch {
      this.error.set('No se pudo guardar el servicio.');
    } finally {
      this.isSaving.set(false);
    }
  }

  askDelete(service: ServiceItem): void {
    this.deleteTarget.set(service);
  }

  cancelDelete(): void {
    this.deleteTarget.set(null);
  }

  async confirmDelete(): Promise<void> {
    const service = this.deleteTarget();

    if (!service || this.isDeleting()) {
      return;
    }

    this.isDeleting.set(true);

    try {
      await firstValueFrom(this.apiService.deleteService(service.id));
      this.services.update((items) => items.filter((item) => item.id !== service.id));
      this.deleteTarget.set(null);
    } catch {
      this.error.set('No se pudo eliminar el servicio.');
    } finally {
      this.isDeleting.set(false);
    }
  }
}
