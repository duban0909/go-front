import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Rechaza un valor vacio o compuesto unicamente por espacios en blanco. */
export const notBlankValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = control.value;
  return typeof value === 'string' && value.trim().length === 0 ? { blank: true } : null;
};

/** Numero en formato E.164-like: '+' opcional seguido de 7 a 15 digitos, sin letras ni simbolos. */
export const WHATSAPP_PHONE_PATTERN = /^\+?[0-9]{7,15}$/;
