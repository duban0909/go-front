import { Component, EventEmitter, Output } from '@angular/core';
import { UiButtonComponent } from '../../../../shared/components/ui-button/ui-button.component';

@Component({
  selector: 'app-onboarding-welcome',
  imports: [UiButtonComponent],
  template: `
    <div class="welcome-step">
      <span class="wave" aria-hidden="true">👋</span>
      <h1>¡Bienvenido a GoAgenda!</h1>
      <p class="lead">Vamos a dejar tu chat listo en {{ remainingSteps }} pasos</p>
      <p class="hint-text">Te toma menos de 3 minutos</p>

      <app-button type="button" (click)="next.emit()">Empezar</app-button>
    </div>
  `,
  styles: `
    .welcome-step {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      gap: 0.6rem;
    }

    .wave {
      font-size: 3rem;
      margin-bottom: 0.5rem;
    }

    h1 {
      margin: 0;
      color: var(--go-navy);
      font-size: 1.4rem;
    }

    .lead {
      margin: 0;
      color: var(--go-charcoal);
      font-size: 1.05rem;
      font-weight: 600;
      max-width: 20rem;
    }

    .hint-text {
      margin: 0 0 1.5rem;
      color: color-mix(in srgb, var(--go-dark) 60%, white);
      font-size: 0.92rem;
    }

    app-button {
      width: 100%;
    }
  `
})
export class WelcomeStepComponent {
  @Output() readonly next = new EventEmitter<void>();

  readonly remainingSteps = 5;
}
