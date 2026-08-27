import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AppointmentStatus } from '../../../core/models/appointment.model';
import { GoagendaApiService } from '../../../core/services/goagenda-api.service';
import { SessionService } from '../../../core/services/session.service';
import { LucideIconComponent } from '../../../shared/components/lucide-icon/lucide-icon.component';
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
  selector: 'app-my-appointments-page',
  imports: [LucideIconComponent, CopCurrencyPipe],
  templateUrl: './my-appointments.page.html',
  styleUrl: './my-appointments.page.css'
})
export class MyAppointmentsPageComponent implements OnInit {
  private readonly apiService = inject(GoagendaApiService);
  private readonly sessionService = inject(SessionService);

  readonly today = new Date();
  readonly selectedDate = signal(new Date());
  readonly appointments = signal<AppointmentView[]>([]);
  readonly isLoading = signal(false);
  readonly error = signal('');

  readonly weekDays = computed(() => getWeekDays(this.selectedDate()));
  readonly monthLabel = computed(() => formatMonthYear(this.selectedDate()));
  readonly fullDateLabel = computed(() => formatFullDate(this.selectedDate()));
  readonly isToday = computed(() => isSameDay(this.selectedDate(), this.today));
  readonly appointmentsForSelectedDay = computed(() => {
    const dateKey = toDateKey(this.selectedDate());
    return this.appointments().filter((appointment) => appointment.dateKey === dateKey);
  });

  ngOnInit(): void {
    void this.loadAppointments();
  }

  async loadAppointments(): Promise<void> {
    const businessId = this.sessionService.businessId();
    const employeeId = this.sessionService.employeeId();

    if (!businessId || !employeeId) {
      return;
    }

    this.error.set('');
    this.isLoading.set(true);

    try {
      const response = await firstValueFrom(
        this.apiService.listAppointments({ business_id: businessId, employee_id: employeeId, limit: 200 })
      );

      this.appointments.set(
        response.appointments.map((record) => {
          const scheduledAt = new Date(record.scheduled_at);

          const view: AppointmentView = {
            id: record.id,
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
      this.error.set('No se pudieron cargar tus citas.');
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
}
