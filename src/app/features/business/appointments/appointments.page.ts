import { Component, OnInit, computed, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { GoagendaApiService } from '../../../core/services/goagenda-api.service';
import { SessionService } from '../../../core/services/session.service';
import { SupabaseAppointmentsService } from '../../../core/services/supabase-appointments.service';
import { AppointmentStatus } from '../../../core/models/appointment.model';
import { Employee, ServiceItem } from '../../../core/models/goagenda.models';
import { LucideIconComponent } from '../../../shared/components/lucide-icon/lucide-icon.component';
import { UiButtonComponent } from '../../../shared/components/ui-button/ui-button.component';
import { UiModalComponent } from '../../../shared/components/ui-modal/ui-modal.component';
import { UiTextFieldComponent } from '../../../shared/components/ui-text-field/ui-text-field.component';
import { CopCurrencyPipe } from '../../../shared/pipes/cop-currency.pipe';
import {
  formatFullDate,
  formatMonthYear,
  formatTime12h,
  getWeekDays,
  isSameDay,
  toDateKey,
  weekdayShortLabel
} from '../../../shared/utils/date-utils';

interface AppointmentView {
  id: string;
  clientName: string;
  clientPhone: string;
  serviceName: string;
  price: number;
  time: string;
  status: AppointmentStatus;
  dateKey: string;
}

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  completed: 'Completada',
  cancelled: 'Cancelada'
};

@Component({
  selector: 'app-appointments-page',
  imports: [ReactiveFormsModule, LucideIconComponent, UiButtonComponent, UiModalComponent, UiTextFieldComponent, CopCurrencyPipe],
  templateUrl: './appointments.page.html',
  styleUrl: './appointments.page.css'
})
export class AppointmentsPageComponent implements OnInit {
  readonly today = new Date();
  readonly selectedDate = signal(new Date());
  readonly services = signal<ServiceItem[]>([]);
  readonly employees = signal<Employee[]>([]);
  readonly appointments = signal<AppointmentView[]>([]);
  readonly isLoading = signal(false);
  readonly isModalOpen = signal(false);
  readonly isSaving = signal(false);
  readonly error = signal('');

  readonly weekDays = computed(() => getWeekDays(this.selectedDate()));
  readonly monthLabel = computed(() => formatMonthYear(this.selectedDate()));
  readonly fullDateLabel = computed(() => formatFullDate(this.selectedDate()));
  readonly isToday = computed(() => isSameDay(this.selectedDate(), this.today));
  readonly appointmentsForSelectedDay = computed(() => {
    const dateKey = toDateKey(this.selectedDate());
    return this.appointments().filter((appointment) => appointment.dateKey === dateKey);
  });

  readonly form;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly apiService: GoagendaApiService,
    private readonly appointmentsService: SupabaseAppointmentsService,
    private readonly sessionService: SessionService
  ) {
    this.form = this.formBuilder.nonNullable.group({
      client_name: ['', [Validators.required]],
      client_phone: ['', [Validators.required]],
      service_id: ['', [Validators.required]],
      employee_id: ['', [Validators.required]],
      time: ['10:00', [Validators.required]]
    });
  }

  ngOnInit(): void {
    void Promise.all([this.loadServices(), this.loadEmployees()]).then(() => this.loadAppointments());
  }

  async loadServices(): Promise<void> {
    const businessId = this.sessionService.businessId();

    if (!businessId) {
      return;
    }

    try {
      const services = await firstValueFrom(this.apiService.listServices(businessId));
      this.services.set(services);
    } catch {
      this.error.set('No se pudo cargar el catalogo de servicios.');
    }
  }

  async loadEmployees(): Promise<void> {
    const businessId = this.sessionService.businessId();

    if (!businessId) {
      return;
    }

    try {
      const employees = await firstValueFrom(this.apiService.listEmployees(businessId));
      this.employees.set(employees);
    } catch {
      this.error.set('No se pudo cargar la lista de empleados.');
    }
  }

  async loadAppointments(): Promise<void> {
    const businessId = this.sessionService.businessId();

    if (!businessId) {
      return;
    }

    this.error.set('');
    this.isLoading.set(true);

    try {
      const records = await this.appointmentsService.listByBusiness(businessId);
      const servicesById = new Map(this.services().map((service) => [service.id, service]));

      this.appointments.set(
        records.map((record) => {
          const scheduledAt = new Date(record.scheduled_at);
          const service = servicesById.get(record.service_id);

          const view: AppointmentView = {
            id: record.id,
            clientName: record.client_name,
            clientPhone: record.client_phone,
            serviceName: service?.name ?? 'Servicio',
            price: service?.price ?? 0,
            time: formatTime12h(scheduledAt),
            status: record.status,
            dateKey: toDateKey(scheduledAt)
          };

          return view;
        })
      );
    } catch {
      this.error.set('No se pudieron cargar las citas.');
    } finally {
      this.isLoading.set(false);
    }
  }

  statusLabel(status: AppointmentStatus): string {
    return STATUS_LABELS[status];
  }

  weekdayLabel(date: Date): string {
    return weekdayShortLabel(date);
  }

  isSelected(date: Date): boolean {
    return isSameDay(date, this.selectedDate());
  }

  isTodayDate(date: Date): boolean {
    return isSameDay(date, this.today);
  }

  selectDate(date: Date): void {
    this.selectedDate.set(date);
  }

  shiftWeek(days: number): void {
    const current = this.selectedDate();
    this.selectedDate.set(new Date(current.getFullYear(), current.getMonth(), current.getDate() + days));
  }

  openAgendarModal(): void {
    const defaultEmployeeId = this.sessionService.currentEmployment()?.employee_id ?? '';
    this.form.reset({ client_name: '', client_phone: '', service_id: '', employee_id: defaultEmployeeId, time: '10:00' });
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

    const { client_name, client_phone, service_id, employee_id, time } = this.form.getRawValue();
    const dateKey = toDateKey(this.selectedDate());
    const fecha_hora = `${dateKey}T${time}:00`;

    this.isSaving.set(true);
    this.error.set('');

    try {
      await firstValueFrom(
        this.apiService.createManualAppointment({
          business_id: businessId,
          employee_id,
          client_name,
          client_phone,
          service_id,
          fecha_hora
        })
      );

      this.isModalOpen.set(false);
      await this.loadAppointments();
    } catch {
      this.error.set('No se pudo agendar la cita.');
    } finally {
      this.isSaving.set(false);
    }
  }
}
