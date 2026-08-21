import { Component, EventEmitter, Input, Output, forwardRef, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { LucideIconComponent, LucideIconName } from '../lucide-icon/lucide-icon.component';

export type UiTextFieldType = 'text' | 'email' | 'password' | 'tel' | 'number';

let nextFieldId = 0;

@Component({
  selector: 'app-text-field',
  imports: [LucideIconComponent],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => UiTextFieldComponent),
      multi: true
    }
  ],
  template: `
    <div class="field">
      <label [for]="fieldId" [class.sr-only]="!showLabel" [class.visible-label]="showLabel">{{ label }}</label>

      <label [for]="fieldId" class="input-shell" [class.has-error]="error">
        @if (icon) {
          <span class="field-icon" aria-hidden="true">
            <app-lucide-icon [name]="icon" [size]="24" [strokeWidth]="1.8" />
          </span>
        }

        <input
          [id]="fieldId"
          [type]="resolvedType()"
          [inputMode]="inputmode"
          [autocomplete]="autocomplete"
          [placeholder]="placeholder || label"
          [disabled]="disabled()"
          [value]="value()"
          (input)="onInput($event)"
          (blur)="onTouched()"
        />

        @if (type === 'password') {
          <button
            type="button"
            class="password-toggle"
            (click)="togglePasswordVisibility()"
            [attr.aria-label]="showPassword() ? 'Ocultar contrasena' : 'Mostrar contrasena'"
          >
            <app-lucide-icon [name]="showPassword() ? 'eye-off' : 'eye'" [size]="24" [strokeWidth]="1.8" />
          </button>
        }
      </label>

      @if (error) {
        <p class="field-error">{{ error }}</p>
      }
    </div>
  `,
  styles: `
    .field {
      display: grid;
      gap: 0.3rem;
    }

    .visible-label {
      padding: 0 0.35rem;
      color: color-mix(in srgb, var(--go-dark) 62%, white);
      font-size: 0.82rem;
      font-weight: 600;
    }

    .input-shell {
      display: grid;
      grid-template-columns: auto 1fr auto;
      align-items: center;
      column-gap: 0.8rem;
      width: 100%;
      min-height: 3.9rem;
      border-radius: 1.1rem;
      padding: 0.2rem 0.5rem 0.2rem 0.88rem;
      background: #ffffff;
      box-shadow: 0 4px 10px rgb(16 32 64 / 4%);
      border: 1px solid transparent;
    }

    .input-shell.has-error {
      border-color: color-mix(in srgb, #bd2e2e 45%, white);
    }

    .field-icon {
      width: 2rem;
      height: 2rem;
      display: grid;
      place-items: center;
      color: var(--go-dark);
    }

    .input-shell input {
      width: 100%;
      min-height: 2.75rem;
      border: 0;
      padding: 0;
      background: transparent;
      color: var(--go-charcoal);
      font-size: 1.05rem;
      letter-spacing: -0.01em;
      outline: none;
      font-family: inherit;
    }

    .input-shell input::placeholder {
      color: color-mix(in srgb, var(--go-dark) 55%, white);
      opacity: 1;
      font-weight: 500;
    }

    .input-shell input:disabled {
      opacity: 0.6;
    }

    .password-toggle {
      border: 0;
      background: transparent;
      width: 2.4rem;
      height: 2.4rem;
      border-radius: 0.6rem;
      color: var(--go-dark);
      display: grid;
      place-items: center;
    }

    .field-error {
      margin: 0;
      color: #b83333;
      font-size: 0.87rem;
      padding: 0 0.35rem;
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      border: 0;
    }

    .input-shell:focus-within,
    .password-toggle:focus-visible {
      outline: 3px solid color-mix(in srgb, var(--go-teal) 36%, white);
      outline-offset: 2px;
    }
  `
})
export class UiTextFieldComponent implements ControlValueAccessor {
  @Input({ required: true }) label!: string;
  @Input() icon?: LucideIconName;
  @Input() type: UiTextFieldType = 'text';
  @Input() placeholder = '';
  @Input() autocomplete = 'off';
  @Input() inputmode: 'text' | 'email' | 'tel' | 'numeric' | 'none' = 'text';
  @Input() error: string | null = null;
  @Input() showLabel = false;
  @Output() readonly valueChange = new EventEmitter<string>();

  readonly fieldId = `text-field-${nextFieldId++}`;
  readonly value = signal('');
  readonly disabled = signal(false);
  readonly showPassword = signal(false);

  readonly resolvedType = () => (this.type === 'password' && this.showPassword() ? 'text' : this.type);

  private onChange: (value: string) => void = () => {};
  onTouched: () => void = () => {};

  writeValue(value: string): void {
    this.value.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.value.set(value);
    this.onChange(value);
    this.valueChange.emit(value);
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((value) => !value);
  }
}
