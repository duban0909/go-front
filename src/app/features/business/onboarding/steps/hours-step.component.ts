import { Component, EventEmitter, Input, OnInit, Output, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { DayHour } from '../../../../core/models/goagenda.models';
import { GoagendaApiService } from '../../../../core/services/goagenda-api.service';
import { UiButtonComponent } from '../../../../shared/components/ui-button/ui-button.component';
import { DayRowView, WeeklyHoursEditorComponent } from '../../../../shared/components/weekly-hours-editor/weekly-hours-editor.component';
import { DAY_DEFS, toApiTime, toInputTime } from '../../../../shared/utils/day-hours';

type DayRow = DayRowView;

@Component({
  selector: 'app-onboarding-hours',
  imports: [UiButtonComponent, WeeklyHoursEditorComponent],
  templateUrl: './hours-step.component.html',
  styleUrl: './step.css'
})
export class HoursStepComponent implements OnInit {
  private readonly apiService = inject(GoagendaApiService);

  @Input({ required: true }) businessId!: string;
  @Output() readonly next = new EventEmitter<void>();
  @Output() readonly back = new EventEmitter<void>();

  readonly isLoading = signal(false);
  readonly error = signal('');
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
  readonly canContinue = computed(() => this.activeDaysCount() > 0);

  ngOnInit(): void {
    void this.loadHours();
  }

  private async loadHours(): Promise<void> {
    if (!this.businessId) {
      return;
    }

    this.isLoading.set(true);

    try {
      const dayHours = await firstValueFrom(this.apiService.getBusinessHours(this.businessId));
      const byKey = new Map<string, DayHour>(dayHours.map((item) => [item.day, item]));

      this.days.update((rows) =>
        rows.map((row) => {
          const saved = byKey.get(row.key);
          if (!saved) return row;

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
      this.error.set('No se pudo cargar el horario.');
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

  async applyToAllDays(): Promise<void> {
    const [first] = this.days();
    if (!first) {
      return;
    }

    const template = { openingTime: first.openingTime, closingTime: first.closingTime, lunchStart: first.lunchStart, lunchEnd: first.lunchEnd };
    this.days.update((rows) => rows.map((row) => ({ ...row, ...template, isOpen: true })));

    for (const day of this.days()) {
      await this.persistDay(day);
    }
  }

  private updateDay(key: string, patch: Partial<DayRow>): void {
    this.days.update((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  private async persistDay(day: DayRow): Promise<void> {
    if (!this.businessId) {
      return;
    }

    this.error.set('');

    try {
      await firstValueFrom(
        this.apiService.updateBusinessHours({
          business_id: this.businessId,
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
