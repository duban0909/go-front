import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Employee } from '../../../../core/models/goagenda.models';
import { GoagendaApiService } from '../../../../core/services/goagenda-api.service';
import { UiButtonComponent } from '../../../../shared/components/ui-button/ui-button.component';
import { UiTextFieldComponent } from '../../../../shared/components/ui-text-field/ui-text-field.component';

@Component({
  selector: 'app-onboarding-employees',
  imports: [ReactiveFormsModule, UiButtonComponent, UiTextFieldComponent],
  templateUrl: './employees-step.component.html',
  styleUrl: './step.css'
})
export class EmployeesStepComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly apiService = inject(GoagendaApiService);

  @Input({ required: true }) businessId!: string;
  @Output() readonly next = new EventEmitter<void>();
  @Output() readonly back = new EventEmitter<void>();

  readonly employees = signal<Employee[]>([]);
  readonly isInviting = signal(false);
  readonly error = signal('');
  readonly generatedCode = signal('');
  readonly codeCopied = signal(false);

  readonly inviteForm = this.formBuilder.nonNullable.group({
    employee_name: ['']
  });

  ngOnInit(): void {
    void this.loadEmployees();
  }

  private async loadEmployees(): Promise<void> {
    if (!this.businessId) {
      return;
    }

    try {
      const employees = await firstValueFrom(this.apiService.listEmployees(this.businessId));
      this.employees.set(employees);
    } catch {
      // Sin bloquear el paso: el dueño siempre aparece como empleado principal de todas formas.
    }
  }

  async submitInvite(): Promise<void> {
    if (this.isInviting()) {
      return;
    }

    const { employee_name } = this.inviteForm.getRawValue();
    this.isInviting.set(true);
    this.error.set('');

    try {
      const invitationCode = await firstValueFrom(
        this.apiService.createEmployeeInvitationCode(this.businessId, { employee_name: employee_name || null })
      );
      this.generatedCode.set(invitationCode.code);
      this.codeCopied.set(false);
      this.inviteForm.reset({ employee_name: '' });
    } catch {
      this.error.set('No se pudo generar el codigo de invitacion.');
    } finally {
      this.isInviting.set(false);
    }
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
}
