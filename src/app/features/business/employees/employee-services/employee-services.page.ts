import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ServiceItem } from '../../../../core/models/goagenda.models';
import { GoagendaApiService } from '../../../../core/services/goagenda-api.service';
import { SessionService } from '../../../../core/services/session.service';
import { LucideIconComponent } from '../../../../shared/components/lucide-icon/lucide-icon.component';
import { UiButtonComponent } from '../../../../shared/components/ui-button/ui-button.component';

@Component({
  selector: 'app-employee-services-page',
  imports: [RouterLink, LucideIconComponent, UiButtonComponent],
  templateUrl: './employee-services.page.html',
  styleUrl: './employee-services.page.css'
})
export class EmployeeServicesPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly apiService = inject(GoagendaApiService);
  private readonly sessionService = inject(SessionService);

  private employeeId = '';

  readonly allServices = signal<ServiceItem[]>([]);
  readonly selectedIds = signal<Set<string>>(new Set());
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly error = signal('');
  readonly successMessage = signal('');

  ngOnInit(): void {
    this.employeeId = this.route.snapshot.paramMap.get('employeeId') ?? '';
    void this.loadData();
  }

  async loadData(): Promise<void> {
    const businessId = this.sessionService.businessId();

    if (!businessId || !this.employeeId) {
      return;
    }

    this.error.set('');
    this.isLoading.set(true);

    try {
      const [allServices, assignedServices] = await Promise.all([
        firstValueFrom(this.apiService.listServices(businessId)),
        firstValueFrom(this.apiService.getEmployeeServices(this.employeeId))
      ]);

      this.allServices.set(allServices);
      this.selectedIds.set(new Set(assignedServices.map((service) => service.id)));
    } catch {
      this.error.set('No se pudieron cargar los servicios.');
    } finally {
      this.isLoading.set(false);
    }
  }

  isSelected(service: ServiceItem): boolean {
    return this.selectedIds().has(service.id);
  }

  toggleService(service: ServiceItem): void {
    this.selectedIds.update((ids) => {
      const next = new Set(ids);
      if (next.has(service.id)) {
        next.delete(service.id);
      } else {
        next.add(service.id);
      }
      return next;
    });
  }

  async save(): Promise<void> {
    if (this.isSaving()) {
      return;
    }

    this.error.set('');
    this.successMessage.set('');
    this.isSaving.set(true);

    try {
      await firstValueFrom(
        this.apiService.updateEmployeeServices(this.employeeId, { service_ids: Array.from(this.selectedIds()) })
      );
      this.successMessage.set('Cambios guardados.');
    } catch {
      this.error.set('No se pudieron guardar los servicios.');
    } finally {
      this.isSaving.set(false);
    }
  }
}
