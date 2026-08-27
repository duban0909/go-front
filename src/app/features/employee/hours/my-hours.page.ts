import { Component, OnInit, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { EmployeeHour } from '../../../core/models/goagenda.models';
import { GoagendaApiService } from '../../../core/services/goagenda-api.service';
import { SessionService } from '../../../core/services/session.service';
import { DayRowView, WeeklyHoursEditorComponent } from '../../../shared/components/weekly-hours-editor/weekly-hours-editor.component';
import { DAY_DEFS, toApiTime, toInputTime } from '../../../shared/utils/day-hours';

@Component({
  selector: 'app-my-hours-page',
  imports: [WeeklyHoursEditorComponent],
  templateUrl: './my-hours.page.html',
  styleUrl: './my-hours.page.css'
})
export class MyHoursPageComponent implements OnInit {
  private readonly apiService = inject(GoagendaApiService);
  private readonly sessionService = inject(SessionService);

  readonly isLoading = signal(false);
  readonly error = signal('');
  readonly days = signal<DayRowView[]>(
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

  ngOnInit(): void {
    void this.loadData();
  }

  async loadData(): Promise<void> {
    const employeeId = this.sessionService.employeeId();

    if (!employeeId) {
      return;
    }

    this.error.set('');
    this.isLoading.set(true);

    try {
      const employeeHours = await firstValueFrom(this.apiService.getEmployeeHours(employeeId));
      const byKey = new Map<string, EmployeeHour>(employeeHours.map((item) => [item.day, item]));

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
    } catch {
      this.error.set('No se pudo cargar tu horario.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async toggleDay(day: DayRowView): Promise<void> {
    const nextIsOpen = !day.isOpen;
    this.updateDay(day.key, { isOpen: nextIsOpen });
    await this.persistDay({ ...day, isOpen: nextIsOpen });
  }

  async onTimeChange(day: DayRowView): Promise<void> {
    await this.persistDay(day);
  }

  private updateDay(key: string, patch: Partial<DayRowView>): void {
    this.days.update((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  private async persistDay(day: DayRowView): Promise<void> {
    const employeeId = this.sessionService.employeeId();

    if (!employeeId) {
      return;
    }

    this.error.set('');

    try {
      await firstValueFrom(
        this.apiService.updateEmployeeHours(employeeId, {
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
}
