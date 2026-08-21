import { Component, Input } from '@angular/core';

export type UiButtonVariant = 'primary' | 'ghost';

@Component({
  selector: 'app-button',
  template: `
    <button
      class="ui-button"
      [class.variant-ghost]="variant === 'ghost'"
      [class.fit]="fit"
      [type]="type"
      [disabled]="disabled || loading"
    >
      @if (loading) {
        <span class="spinner" aria-hidden="true"></span>
      }
      <ng-content />
    </button>
  `,
  styles: `
    :host {
      display: block;
    }

    .ui-button {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      border: 0;
      border-radius: 1rem;
      min-height: 3.5rem;
      width: 100%;
      background: var(--go-teal);
      color: #fff;
      font-size: 1.05rem;
      font-weight: 700;
      letter-spacing: -0.01em;
      box-shadow: 0 5px 12px rgb(3 165 128 / 25%);
      transition: transform 130ms ease, box-shadow 130ms ease, opacity 130ms ease;
    }

    .ui-button.fit {
      width: auto;
      min-height: 2.75rem;
      padding: 0 1.15rem;
      font-size: 0.95rem;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .ui-button.variant-ghost {
      background: transparent;
      color: var(--go-dark);
      box-shadow: none;
      border: 1px solid color-mix(in srgb, var(--go-dark) 35%, white);
    }

    .ui-button:not(:disabled):active {
      transform: translateY(1px);
    }

    .ui-button:disabled {
      opacity: 0.7;
      box-shadow: none;
    }

    .ui-button:focus-visible {
      outline: 3px solid color-mix(in srgb, var(--go-teal) 36%, white);
      outline-offset: 2px;
    }

    .spinner {
      width: 1.1rem;
      height: 1.1rem;
      border-radius: 50%;
      border: 2px solid rgb(255 255 255 / 40%);
      border-top-color: #fff;
      animation: spin 700ms linear infinite;
    }

    .variant-ghost .spinner {
      border-color: color-mix(in srgb, var(--go-dark) 30%, white);
      border-top-color: var(--go-dark);
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  `
})
export class UiButtonComponent {
  @Input() type: 'button' | 'submit' = 'button';
  @Input() variant: UiButtonVariant = 'primary';
  @Input() disabled = false;
  @Input() loading = false;
  @Input() fit = false;
}
