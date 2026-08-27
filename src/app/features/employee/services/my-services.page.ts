import { Component, OnInit, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ServiceItem } from '../../../core/models/goagenda.models';
import { GoagendaApiService } from '../../../core/services/goagenda-api.service';
import { SessionService } from '../../../core/services/session.service';

@Component({
  selector: 'app-my-services-page',
  imports: [],
  templateUrl: './my-services.page.html',
  styleUrl: './my-services.page.css'
})
export class MyServicesPageComponent implements OnInit {
  private readonly apiService = inject(GoagendaApiService);
  private readonly sessionService = inject(SessionService);

  readonly services = signal<ServiceItem[]>([]);
  readonly isLoading = signal(false);
  readonly error = signal('');

  ngOnInit(): void {
    void this.loadServices();
  }

  async loadServices(): Promise<void> {
    const employeeId = this.sessionService.employeeId();

    if (!employeeId) {
      return;
    }

    this.error.set('');
    this.isLoading.set(true);

    try {
      const services = await firstValueFrom(this.apiService.getEmployeeServices(employeeId));
      this.services.set(services);
    } catch {
      this.error.set('No se pudieron cargar tus servicios.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
