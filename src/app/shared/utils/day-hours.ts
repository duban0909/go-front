export const DAY_DEFS = [
  { key: 'mon', label: 'Lunes' },
  { key: 'tue', label: 'Martes' },
  { key: 'wed', label: 'Miercoles' },
  { key: 'thu', label: 'Jueves' },
  { key: 'fri', label: 'Viernes' },
  { key: 'sat', label: 'Sabado' },
  { key: 'sun', label: 'Domingo' }
];

export function toInputTime(value: string | null, fallback: string): string {
  return value ? value.slice(0, 5) : fallback;
}

export function toApiTime(value: string): string {
  return value.length === 5 ? `${value}:00` : value;
}

/** Compara horas 'HH:mm' del mismo dia: la de cierre debe ser posterior a la de apertura. */
export function isValidTimeRange(openingTime: string, closingTime: string): boolean {
  return openingTime < closingTime;
}
