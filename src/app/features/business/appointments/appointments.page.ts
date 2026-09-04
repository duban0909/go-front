import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { GoagendaApiService } from '../../../core/services/goagenda-api.service';
import { RealtimeService } from '../../../core/services/realtime.service';
import { SessionService } from '../../../core/services/session.service';
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
  employeeId: string | null;
  employeeName: string;
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
  readonly agendaFilter = signal('');
  readonly availableSlots = signal<string[]>([]);
  readonly isLoadingSlots = signal(false);

  readonly isAvailabilityModalOpen = signal(false);
  readonly availabilitySlots = signal<string[]>([]);
  readonly isLoadingAvailability = signal(false);

  readonly weekDays = computed(() => getWeekDays(this.selectedDate()));
  readonly monthLabel = computed(() => formatMonthYear(this.selectedDate()));
  readonly fullDateLabel = computed(() => formatFullDate(this.selectedDate()));
  readonly isToday = computed(() => isSameDay(this.selectedDate(), this.today));
  readonly appointmentsForSelectedDay = computed(() => {
    const dateKey = toDateKey(this.selectedDate());
    const filter = this.agendaFilter();
    return this.appointments().filter(
      (appointment) => appointment.dateKey === dateKey && (!filter || appointment.employeeId === filter)
    );
  });

  private readonly realtimeService = inject(RealtimeService);

  readonly form;
  readonly availabilityForm;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly apiService: GoagendaApiService,
    private readonly sessionService: SessionService
  ) {
    this.form = this.formBuilder.nonNullable.group({
      client_name: ['', [Validators.required]],
      client_phone: ['', [Validators.required]],
      service_id: ['', [Validators.required]],
      employee_id: ['', [Validators.required]],
      time: ['', [Validators.required]]
    });

    this.availabilityForm = this.formBuilder.nonNullable.group({
      employee_id: [''],
      service_id: [''],
      date: [toDateKey(this.selectedDate())]
    });

    // Recalcula los turnos libres cada vez que cambia el empleado o el servicio elegido.
    this.form.controls.employee_id.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => void this.refreshAvailableSlots());
    this.form.controls.service_id.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => void this.refreshAvailableSlots());

    // Recarga el calendario cuando llega un evento de cita (no de chat) del negocio activo por WebSocket.
    effect(() => {
      const event = this.realtimeService.lastEvent();

      if (event && event.type !== 'chat.escalated' && event.business_id === this.sessionService.businessId()) {
        void this.loadAppointments();
      }
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
      const response = await firstValueFrom(this.apiService.listAppointments({ business_id: businessId, limit: 200 }));

      this.appointments.set(
        response.appointments.map((record) => {
          const scheduledAt = new Date(record.scheduled_at);

          const view: AppointmentView = {
            id: record.id,
            employeeId: record.employee_id,
            employeeName: record.employees?.name || 'Sin nombre',
            clientName: record.client_name,
            clientPhone: record.client_phone,
            serviceName: record.services?.name ?? 'Servicio',
            price: record.services?.price ?? 0,
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

  setAgendaFilter(employeeId: string): void {
    this.agendaFilter.set(employeeId);
  }

  openAgendarModal(): void {
    const defaultEmployeeId = this.sessionService.currentEmployment()?.employee_id ?? '';
    this.form.reset({ client_name: '', client_phone: '', service_id: '', employee_id: defaultEmployeeId, time: '' });
    this.isModalOpen.set(true);
    void this.refreshAvailableSlots();
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  async refreshAvailableSlots(): Promise<void> {
    const businessId = this.sessionService.businessId();
    const { employee_id, service_id } = this.form.getRawValue();

    if (!businessId || !employee_id || !service_id) {
      this.availableSlots.set([]);
      return;
    }

    this.isLoadingSlots.set(true);

    try {
      const response = await firstValueFrom(
        this.apiService.getAvailableSlots({
          business_id: businessId,
          employee_id,
          service_id,
          date: toDateKey(this.selectedDate())
        })
      );
      this.availableSlots.set(response.available_slots);

      const currentTime = this.form.controls.time.value;
      if (currentTime && !response.available_slots.includes(currentTime)) {
        this.form.controls.time.setValue('');
      }
    } catch {
      this.availableSlots.set([]);
    } finally {
      this.isLoadingSlots.set(false);
    }
  }

  openAvailabilityModal(): void {
    const defaultEmployeeId = this.sessionService.currentEmployment()?.employee_id ?? '';
    this.availabilityForm.reset({ employee_id: defaultEmployeeId, service_id: '', date: toDateKey(this.selectedDate()) });
    this.availabilitySlots.set([]);
    this.isAvailabilityModalOpen.set(true);
  }

  closeAvailabilityModal(): void {
    this.isAvailabilityModalOpen.set(false);
  }

  async searchAvailability(): Promise<void> {
    const businessId = this.sessionService.businessId();
    const { employee_id, service_id, date } = this.availabilityForm.getRawValue();

    if (!businessId || !employee_id || !date) {
      return;
    }

    this.isLoadingAvailability.set(true);

    try {
      const response = await firstValueFrom(
        this.apiService.getAvailableSlots({
          business_id: businessId,
          employee_id,
          date,
          service_id: service_id || undefined
        })
      );
      this.availabilitySlots.set(response.available_slots);
    } catch {
      this.availabilitySlots.set([]);
    } finally {
      this.isLoadingAvailability.set(false);
    }
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
