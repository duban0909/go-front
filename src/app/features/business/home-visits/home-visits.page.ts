import { Component, OnInit, effect, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AppointmentApiRecord } from '../../../core/models/appointment.model';
import { GoagendaApiService } from '../../../core/services/goagenda-api.service';
import { RealtimeService } from '../../../core/services/realtime.service';
import { SessionService } from '../../../core/services/session.service';
import { LucideIconComponent } from '../../../shared/components/lucide-icon/lucide-icon.component';
import { CopCurrencyPipe } from '../../../shared/pipes/cop-currency.pipe';

@Component({
  selector: 'app-home-visits-page',
  imports: [LucideIconComponent, CopCurrencyPipe],
  templateUrl: './home-visits.page.html',
  styleUrl: './home-visits.page.css'
})
export class HomeVisitsPageComponent implements OnInit {
  private readonly apiService = inject(GoagendaApiService);
  private readonly sessionService = inject(SessionService);
  private readonly realtimeService = inject(RealtimeService);

  readonly visits = signal<AppointmentApiRecord[]>([]);
  readonly skeletonRows = [0, 1, 2];
  readonly isLoading = signal(false);
  readonly error = signal('');

  constructor() {
    // Recarga la lista cuando llega una cita nueva/cambiada/cancelada por WebSocket.
    effect(() => {
      const event = this.realtimeService.lastEvent();

      if (event && event.type !== 'chat.escalated' && event.business_id === this.sessionService.businessId()) {
        void this.loadVisits(false);
      }
    });
  }

  ngOnInit(): void {
    void this.loadVisits(true);
  }

  async loadVisits(showSkeleton: boolean): Promise<void> {
    const businessId = this.sessionService.businessId();

    if (!businessId) {
      return;
    }

    this.error.set('');
    if (showSkeleton) {
      this.isLoading.set(true);
    }

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const response = await firstValueFrom(
        this.apiService.listAppointments({
          business_id: businessId,
          home_visit: true,
          status: 'confirmed',
          date_from: this.toLocalIso(today),
          limit: 200
        })
      );
      this.visits.set(response.appointments);
    } catch {
      this.error.set('No se pudieron cargar los domicilios.');
    } finally {
      this.isLoading.set(false);
    }
  }

  formatWhen(visit: AppointmentApiRecord): string {
    const date = new Date(visit.scheduled_at);
    const day = date.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
    const time = date.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${day.charAt(0).toUpperCase()}${day.slice(1)} · ${time}`;
  }

  /** Solo digitos; un celular colombiano de 10 digitos se completa con el indicativo 57. */
  private internationalPhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    return digits.length === 10 && digits.startsWith('3') ? `57${digits}` : digits;
  }

  whatsappUrl(phone: string): string {
    return `https://wa.me/${this.internationalPhone(phone)}`;
  }

  callUrl(phone: string): string {
    return `tel:+${this.internationalPhone(phone)}`;
  }

  displayPhone(phone: string): string {
    const digits = this.internationalPhone(phone);
    return digits.startsWith('57') && digits.length === 12 ? digits.slice(2) : phone;
  }

  mapsUrl(address: string): string {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  }

  private toLocalIso(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
  }
}
