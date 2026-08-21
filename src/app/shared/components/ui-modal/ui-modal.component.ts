import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-modal',
  template: `
    <div class="backdrop" (click)="close.emit()">
      <div class="sheet" (click)="$event.stopPropagation()">
        <header class="sheet-header">
          <h2>{{ title }}</h2>
          <button type="button" class="close-btn" (click)="close.emit()" aria-label="Cerrar">×</button>
        </header>
        <ng-content />
      </div>
    </div>
  `,
  styles: `
    .backdrop {
      position: fixed;
      inset: 0;
      z-index: 50;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      background: rgb(14 24 44 / 45%);
      backdrop-filter: blur(2px);
      animation: fade-in 160ms ease-out;
    }

    .sheet {
      width: 100%;
      max-width: 30rem;
      max-height: 90dvh;
      overflow-y: auto;
      background: #fff;
      border-radius: 1.4rem 1.4rem 0 0;
      padding: 1.25rem 1.25rem 1.75rem;
      box-shadow: 0 -8px 30px rgb(14 24 44 / 18%);
      animation: slide-up 200ms ease-out;
    }

    .sheet-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1rem;
    }

    .sheet-header h2 {
      margin: 0;
      color: var(--go-navy);
      font-size: 1.25rem;
    }

    .close-btn {
      border: 0;
      background: var(--go-bg);
      width: 2.2rem;
      height: 2.2rem;
      border-radius: 0.7rem;
      font-size: 1.3rem;
      line-height: 1;
      color: var(--go-dark);
      display: grid;
      place-items: center;
    }

    @media (min-width: 640px) {
      .backdrop {
        align-items: center;
      }

      .sheet {
        border-radius: 1.4rem;
      }
    }

    @keyframes fade-in {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    @keyframes slide-up {
      from {
        transform: translateY(24px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }
  `
})
export class UiModalComponent {
  @Input({ required: true }) title!: string;
  @Output() readonly close = new EventEmitter<void>();
}
