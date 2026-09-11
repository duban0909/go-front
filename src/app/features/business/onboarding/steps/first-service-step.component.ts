import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ServiceItem } from '../../../../core/models/goagenda.models';
import { GoagendaApiService } from '../../../../core/services/goagenda-api.service';
import { UiButtonComponent } from '../../../../shared/components/ui-button/ui-button.component';
import { UiTextFieldComponent } from '../../../../shared/components/ui-text-field/ui-text-field.component';
import { CopCurrencyPipe } from '../../../../shared/pipes/cop-currency.pipe';

// Mismo patron de validacion que services.page.ts: nada de < > { } ni
// comillas, porque este nombre se le muestra tal cual al cliente en el chat.
const NOMBRE_SERVICIO_PATTERN = /^[a-zA-Z0-9À-ÿñÑ\s.,'&%/!¡¿()-]+$/;

@Component({
  selector: 'app-onboarding-first-service',
  imports: [ReactiveFormsModule, UiButtonComponent, UiTextFieldComponent, CopCurrencyPipe],
  templateUrl: './first-service-step.component.html',
  styleUrl: './step.css'
})
export class FirstServiceStepComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly apiService = inject(GoagendaApiService);

  @Input({ required: true }) businessId!: string;
  @Output() readonly next = new EventEmitter<void>();
  @Output() readonly back = new EventEmitter<void>();

  readonly savedServices = signal<ServiceItem[]>([]);
  readonly isSaving = signal(false);
  readonly error = signal('');

  readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.pattern(NOMBRE_SERVICIO_PATTERN)]],
    duration_minutes: [30, [Validators.required, Validators.min(5)]],
    price: [0, [Validators.required, Validators.min(0)]]
  });

  get nameError(): string | null {
    const control = this.form.controls.name;
    if (!control.touched) return null;
    if (control.hasError('required')) return 'El nombre del servicio es obligatorio.';
    if (control.hasError('pattern')) return 'Usa solo letras, numeros, espacios y signos basicos.';
    return null;
  }

  get durationError(): string | null {
    const control = this.form.controls.duration_minutes;
    if (!control.touched) return null;
    if (control.hasError('required')) return 'La duracion es obligatoria.';
    if (control.hasError('min')) return 'La duracion debe ser de al menos 5 minutos.';
    return null;
  }

  get priceError(): string | null {
    const control = this.form.controls.price;
    if (!control.touched) return null;
    if (control.hasError('required')) return 'El precio es obligatorio.';
    if (control.hasError('min')) return 'El precio no puede ser negativo.';
    return null;
  }

  ngOnInit(): void {
    void this.loadExistingServices();
  }

  private async loadExistingServices(): Promise<void> {
    if (!this.businessId) {
      return;
    }

    try {
      const services = await firstValueFrom(this.apiService.listServices(this.businessId));
      this.savedServices.set(services);
    } catch {
      // Si falla la carga, el usuario simplemente ve la lista vacia y puede crear de nuevo.
    }
  }

  async addAnother(): Promise<void> {
    await this.saveCurrentService();
  }

  async saveAndContinue(): Promise<void> {
    const hasInput = this.form.controls.name.value.trim().length > 0;

    if (hasInput || this.savedServices().length === 0) {
      const saved = await this.saveCurrentService();
      if (!saved) {
        return;
      }
    }

    this.next.emit();
  }

  private async saveCurrentService(): Promise<boolean> {
    if (this.form.invalid || this.isSaving()) {
      this.form.markAllAsTouched();
      return false;
    }

    const { name, duration_minutes, price } = this.form.getRawValue();
    this.isSaving.set(true);
    this.error.set('');

    try {
      const service = await firstValueFrom(
        this.apiService.createService({ business_id: this.businessId, name: name.trim(), duration_minutes, price })
      );
      this.savedServices.update((items) => [...items, service]);
      this.form.reset({ name: '', duration_minutes: 30, price: 0 });
      return true;
    } catch {
      this.error.set('No se pudo guardar el servicio.');
      return false;
    } finally {
      this.isSaving.set(false);
    }
  }
}
