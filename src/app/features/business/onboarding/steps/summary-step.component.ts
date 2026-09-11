import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { GoagendaApiService } from '../../../../core/services/goagenda-api.service';
import { ChatLinkQrCardComponent } from '../../../../shared/components/chat-link-qr-card/chat-link-qr-card.component';
import { UiButtonComponent } from '../../../../shared/components/ui-button/ui-button.component';

@Component({
  selector: 'app-onboarding-summary',
  imports: [UiButtonComponent, ChatLinkQrCardComponent],
  templateUrl: './summary-step.component.html',
  styleUrl: './step.css'
})
export class SummaryStepComponent implements OnInit {
  private readonly apiService = inject(GoagendaApiService);

  @Input({ required: true }) businessId!: string;
  @Output() readonly completed = new EventEmitter<void>();
  @Output() readonly back = new EventEmitter<void>();

  readonly isLoading = signal(false);
  readonly isActivating = signal(false);
  readonly error = signal('');

  readonly businessName = signal('');
  readonly whatsapp = signal('');
  readonly serviceCount = signal(0);
  readonly activeDaysCount = signal(0);
  readonly employeeCount = signal(0);

  readonly chatLink = () => (this.businessId ? `${window.location.origin}/chat/${this.businessId}` : '');

  ngOnInit(): void {
    void this.loadSummary();
  }

  private async loadSummary(): Promise<void> {
    if (!this.businessId) {
      return;
    }

    this.isLoading.set(true);

    try {
      const [settings, services, hours, employees] = await Promise.all([
        firstValueFrom(this.apiService.getBusinessSettings(this.businessId)),
        firstValueFrom(this.apiService.listServices(this.businessId)),
        firstValueFrom(this.apiService.getBusinessHours(this.businessId)),
        firstValueFrom(this.apiService.listEmployees(this.businessId))
      ]);

      this.businessName.set(settings.name);
      this.whatsapp.set(settings.phone_number ?? '');
      this.serviceCount.set(services.length);
      this.activeDaysCount.set(hours.filter((day) => day.is_open).length);
      this.employeeCount.set(employees.length);
    } catch {
      this.error.set('No se pudo cargar el resumen.');
    } finally {
      this.isLoading.set(false);
    }
  }

  openChatPreview(): void {
    window.open(this.chatLink(), '_blank', 'noopener,noreferrer');
  }

  async onActivate(): Promise<void> {
    if (this.isActivating()) {
      return;
    }

    this.isActivating.set(true);
    this.error.set('');

    try {
      await firstValueFrom(this.apiService.completeOnboarding({ business_id: this.businessId }));
      this.completed.emit();
    } catch {
      this.error.set('No se pudo activar el negocio. Verifica que tengas al menos un servicio y un dia de horario activo.');
      this.isActivating.set(false);
    }
  }
}
