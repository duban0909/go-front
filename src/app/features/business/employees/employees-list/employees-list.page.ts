import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Employee } from '../../../../core/models/goagenda.models';
import { GoagendaApiService } from '../../../../core/services/goagenda-api.service';
import { SessionService } from '../../../../core/services/session.service';
import { ChatLinkQrCardComponent } from '../../../../shared/components/chat-link-qr-card/chat-link-qr-card.component';
import { LucideIconComponent } from '../../../../shared/components/lucide-icon/lucide-icon.component';
import { UiButtonComponent } from '../../../../shared/components/ui-button/ui-button.component';
import { UiModalComponent } from '../../../../shared/components/ui-modal/ui-modal.component';
import { UiTextFieldComponent } from '../../../../shared/components/ui-text-field/ui-text-field.component';

@Component({
  selector: 'app-employees-list-page',
  imports: [ReactiveFormsModule, RouterLink, LucideIconComponent, UiButtonComponent, UiModalComponent, UiTextFieldComponent, ChatLinkQrCardComponent],
  templateUrl: './employees-list.page.html',
  styleUrl: './employees-list.page.css'
})
export class EmployeesListPageComponent implements OnInit {
  private readonly apiService = inject(GoagendaApiService);
  private readonly sessionService = inject(SessionService);

  readonly employees = signal<Employee[]>([]);
  readonly isLoading = signal(false);
  readonly error = signal('');

  readonly isInviteModalOpen = signal(false);
  readonly isInviting = signal(false);

  readonly generatedCode = signal('');
  readonly codeCopied = signal(false);

  readonly deleteTarget = signal<Employee | null>(null);
  readonly isDeleting = signal(false);

  readonly expandedEmployeeId = signal('');

  readonly businessName = computed(() => this.sessionService.currentEmployment()?.business_name ?? '');
  readonly whatsapp = signal('');

  readonly inviteForm;

  constructor(private readonly formBuilder: FormBuilder) {
    this.inviteForm = this.formBuilder.nonNullable.group({
      employee_name: ['']
    });
  }

  ngOnInit(): void {
    void this.loadEmployees();
    void this.loadWhatsapp();
  }

  async loadEmployees(): Promise<void> {
    const businessId = this.sessionService.businessId();

    if (!businessId) {
      return;
    }

    this.error.set('');
    this.isLoading.set(true);

    try {
      const employees = await firstValueFrom(this.apiService.listEmployees(businessId));
      this.employees.set(employees);
    } catch {
      this.error.set('No se pudieron cargar los empleados.');
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadWhatsapp(): Promise<void> {
    const businessId = this.sessionService.businessId();

    if (!businessId) {
      return;
    }

    try {
      const settings = await firstValueFrom(this.apiService.getBusinessSettings(businessId));
      this.whatsapp.set(settings.phone_number ?? '');
    } catch {
      this.whatsapp.set('');
    }
  }

  chatLinkFor(employee: Employee): string {
    const businessId = this.sessionService.businessId();
    return businessId ? `${window.location.origin}/chat/${businessId}/${employee.id}` : '';
  }

  toggleExpanded(employee: Employee): void {
    this.expandedEmployeeId.set(this.expandedEmployeeId() === employee.id ? '' : employee.id);
  }

  openInviteModal(): void {
    this.inviteForm.reset({ employee_name: '' });
    this.isInviteModalOpen.set(true);
  }

  closeInviteModal(): void {
    this.isInviteModalOpen.set(false);
  }

  async submitInvite(): Promise<void> {
    const businessId = this.sessionService.businessId();

    if (!businessId || this.isInviting()) {
      return;
    }

    const { employee_name } = this.inviteForm.getRawValue();
    this.isInviting.set(true);

    try {
      const invitationCode = await firstValueFrom(
        this.apiService.createEmployeeInvitationCode(businessId, { employee_name: employee_name || null })
      );
      this.isInviteModalOpen.set(false);
      this.generatedCode.set(invitationCode.code);
      this.codeCopied.set(false);
    } catch {
      this.error.set('No se pudo generar el codigo de invitacion.');
    } finally {
      this.isInviting.set(false);
    }
  }

  closeCodeModal(): void {
    this.generatedCode.set('');
  }

  async copyCode(): Promise<void> {
    if (!this.generatedCode()) {
      return;
    }

    try {
      await navigator.clipboard.writeText(this.generatedCode());
      this.codeCopied.set(true);
      setTimeout(() => this.codeCopied.set(false), 2000);
    } catch {
      // El navegador puede bloquear el portapapeles sin interaccion previa; se ignora en silencio.
    }
  }

  askDelete(employee: Employee): void {
    this.deleteTarget.set(employee);
  }

  cancelDelete(): void {
    this.deleteTarget.set(null);
  }

  async confirmDelete(): Promise<void> {
    const employee = this.deleteTarget();

    if (!employee || this.isDeleting()) {
      return;
    }

    this.isDeleting.set(true);

    try {
      await firstValueFrom(this.apiService.deleteEmployee(employee.id));
      this.employees.update((rows) => rows.filter((row) => row.id !== employee.id));
      this.deleteTarget.set(null);
    } catch {
      this.error.set('No se pudo eliminar el empleado.');
    } finally {
      this.isDeleting.set(false);
    }
  }
}
