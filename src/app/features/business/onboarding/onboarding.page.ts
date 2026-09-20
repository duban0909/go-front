import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { GoagendaApiService } from '../../../core/services/goagenda-api.service';
import { SessionService } from '../../../core/services/session.service';
import { BusinessInfoStepComponent } from './steps/business-info-step.component';
import { EmployeesStepComponent } from './steps/employees-step.component';
import { FirstServiceStepComponent } from './steps/first-service-step.component';
import { HomeVisitsStepComponent } from './steps/home-visits-step.component';
import { HoursStepComponent } from './steps/hours-step.component';
import { SummaryStepComponent } from './steps/summary-step.component';
import { WelcomeStepComponent } from './steps/welcome-step.component';

const STEP_COUNT = 7;

@Component({
  selector: 'app-onboarding-page',
  imports: [
    WelcomeStepComponent,
    BusinessInfoStepComponent,
    FirstServiceStepComponent,
    HoursStepComponent,
    EmployeesStepComponent,
    HomeVisitsStepComponent,
    SummaryStepComponent
  ],
  templateUrl: './onboarding.page.html',
  styleUrl: './onboarding.page.css'
})
export class OnboardingPageComponent implements OnInit {
  private readonly apiService = inject(GoagendaApiService);
  private readonly sessionService = inject(SessionService);
  private readonly router = inject(Router);

  readonly stepCount = STEP_COUNT;
  readonly currentStep = signal(1);
  readonly progressPercent = computed(() => (this.currentStep() / STEP_COUNT) * 100);
  readonly businessId = computed(() => this.sessionService.businessId());

  ngOnInit(): void {
    const savedStep = this.sessionService.onboardingStep();
    this.currentStep.set(Math.min(Math.max(savedStep, 1), STEP_COUNT));
  }

  async goNext(): Promise<void> {
    await this.goToStep(Math.min(this.currentStep() + 1, STEP_COUNT));
  }

  async goBack(): Promise<void> {
    await this.goToStep(Math.max(this.currentStep() - 1, 1));
  }

  private async goToStep(step: number): Promise<void> {
    const businessId = this.businessId();
    this.currentStep.set(step);

    if (!businessId) {
      return;
    }

    try {
      await firstValueFrom(this.apiService.updateOnboardingStep({ business_id: businessId, step }));
    } catch {
      // El paso ya avanzo en pantalla; si falla el guardado del progreso, en el peor
      // caso el usuario retoma un paso antes si cierra sesion, no bloquea el flujo actual.
    }
  }

  /** El paso de resumen ya llamo a completeOnboarding(); aqui solo se refresca la sesion y se navega. */
  async onOnboardingCompleted(): Promise<void> {
    await this.sessionService.refresh();
    await this.router.navigateByUrl('/business/appointments', { replaceUrl: true });
  }
}
