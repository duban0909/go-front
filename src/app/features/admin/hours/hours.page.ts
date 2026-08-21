import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { GoagendaApiService } from '../../../core/services/goagenda-api.service';
import { SessionService } from '../../../core/services/session.service';
import { DayHour } from '../../../core/models/goagenda.models';
import { LucideIconComponent } from '../../../shared/components/lucide-icon/lucide-icon.component';

interface DayRow {
  key: string;
  label: string;
  isOpen: boolean;
  openingTime: string;
  closingTime: string;
  lunchStart: string;
  lunchEnd: string;
}

const DAY_DEFS = [
  { key: 'mon', label: 'Lunes' },
  { key: 'tue', label: 'Martes' },
  { key: 'wed', label: 'Miercoles' },
  { key: 'thu', label: 'Jueves' },
  { key: 'fri', label: 'Viernes' },
  { key: 'sat', label: 'Sabado' },
  { key: 'sun', label: 'Domingo' }
];

const REMINDER_OPTIONS = [1, 2, 3, 6, 12, 24, 48];

function toInputTime(value: string | null, fallback: string): string {
  return value ? value.slice(0, 5) : fallback;
}

function toApiTime(value: string): string {
  return value.length === 5 ? `${value}:00` : value;
}

@Component({
  selector: 'app-hours-page',
  imports: [FormsModule, LucideIconComponent],
  templateUrl: './hours.page.html',
  styleUrl: './hours.page.css'
})
export class HoursPageComponent implements OnInit {
  readonly isLoading = signal(false);
  readonly error = signal('');
  readonly reminderHoursBefore = signal(24);
  readonly reminderOptions = REMINDER_OPTIONS;
  readonly days = signal<DayRow[]>(
    DAY_DEFS.map((def) => ({
      key: def.key,
      label: def.label,
      isOpen: false,
      openingTime: '09:00',
      closingTime: '19:00',
      lunchStart: '12:00',
      lunchEnd: '13:00'
    }))
  );

  readonly activeDaysCount = computed(() => this.days().filter((day) => day.isOpen).length);

  constructor(
    private readonly apiService: GoagendaApiService,
    private readonly sessionService: SessionService
  ) {}

  ngOnInit(): void {
    void this.loadData();
  }

  async loadData(): Promise<void> {
    const businessId = this.sessionService.businessId();

    if (!businessId) {
      return;
    }

    this.error.set('');
    this.isLoading.set(true);

    try {
      const [dayHours, settings] = await Promise.all([
        firstValueFrom(this.apiService.getBusinessHours(businessId)),
        firstValueFrom(this.apiService.getBusinessSettings(businessId))
      ]);

      const byKey = new Map<string, DayHour>(dayHours.map((item) => [item.day, item]));

      this.days.update((rows) =>
        rows.map((row) => {
          const saved = byKey.get(row.key);

          if (!saved) {
            return row;
          }

          return {
            ...row,
            isOpen: saved.is_open,
            openingTime: toInputTime(saved.opening_time, row.openingTime),
            closingTime: toInputTime(saved.closing_time, row.closingTime),
            lunchStart: toInputTime(saved.lunch_start, row.lunchStart),
            lunchEnd: toInputTime(saved.lunch_end, row.lunchEnd)
          };
        })
      );

      this.reminderHoursBefore.set(settings.reminder_hours_before);
    } catch {
      this.error.set('No se pudo cargar el horario de atencion.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async toggleDay(day: DayRow): Promise<void> {
    const nextIsOpen = !day.isOpen;
    this.updateDay(day.key, { isOpen: nextIsOpen });
    await this.persistDay({ ...day, isOpen: nextIsOpen });
  }

  async onTimeChange(day: DayRow): Promise<void> {
    await this.persistDay(day);
  }

  private updateDay(key: string, patch: Partial<DayRow>): void {
    this.days.update((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  private async persistDay(day: DayRow): Promise<void> {
    const businessId = this.sessionService.businessId();

    if (!businessId) {
      return;
    }

    this.error.set('');

    try {
      await firstValueFrom(
        this.apiService.updateBusinessHours({
          business_id: businessId,
          day: day.key,
          is_open: day.isOpen,
          opening_time: toApiTime(day.openingTime),
          closing_time: toApiTime(day.closingTime),
          lunch_start: toApiTime(day.lunchStart),
          lunch_end: toApiTime(day.lunchEnd)
        })
      );
    } catch {
      this.error.set('No se pudo guardar el horario de ese dia.');
    }
  }

  async onReminderChange(value: string): Promise<void> {
    const businessId = this.sessionService.businessId();
    const hours = Number(value);
    this.reminderHoursBefore.set(hours);

    if (!businessId) {
      return;
    }

    try {
      await firstValueFrom(
        this.apiService.updateReminderConfig({ business_id: businessId, reminder_hours_before: hours })
      );
    } catch {
      this.error.set('No se pudo actualizar el recordatorio.');
    }
  }
}
