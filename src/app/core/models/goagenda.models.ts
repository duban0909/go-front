export interface ServiceItem {
  id: string;
  business_id: string;
  name: string;
  duration_minutes: number;
  price: number;
  active: boolean;
}

/** Respuesta cruda de GET /services: la lista viene envuelta bajo la clave "services". */
export interface ServicesListResponse {
  services: ServiceItem[];
}

export interface ServiceCreate {
  business_id: string;
  name: string;
  duration_minutes?: number;
  price?: number;
}

export interface ServiceUpdate {
  name?: string;
  duration_minutes?: number;
  price?: number;
}

export interface BusinessSettings {
  name: string;
  phone_number: string | null;
  reminder_hours_before: number;
}

/** Respuesta cruda de GET /business-settings: el negocio viene envuelto bajo la clave "business". */
export interface BusinessSettingsResponse {
  business: BusinessSettings;
}

export interface BusinessInfoUpdate {
  business_id: string;
  name: string;
  phone_number?: string | null;
}

export interface ReminderConfigUpdate {
  business_id: string;
  reminder_hours_before: number;
}

export interface FcmTokenUpdate {
  business_id: string;
  fcm_token: string;
}

export interface DayHour {
  day: string;
  is_open: boolean;
  opening_time: string | null;
  closing_time: string | null;
  lunch_start: string | null;
  lunch_end: string | null;
}

/** Respuesta cruda de GET /business-hours: la lista viene envuelta bajo la clave "business_hours". */
export interface BusinessHoursListResponse {
  business_hours: DayHour[];
}

export interface DayHourUpdate {
  business_id: string;
  day: string;
  is_open: boolean;
  opening_time?: string | null;
  closing_time?: string | null;
  lunch_start?: string | null;
  lunch_end?: string | null;
}

export interface AiUsage {
  business_id: string;
  month: string;
  estimated_spend_usd: number;
}

export interface ExcludedChat {
  business_id: string;
  phone_number: string;
}

export interface ExcludedChatCreate {
  business_id: string;
  phone_number: string;
}

export interface ManualAppointmentInput {
  business_id: string;
  client_name: string;
  client_phone: string;
  service_id: string;
  fecha_hora: string;
}

/** Negocio del usuario autenticado. Creado/recuperado de forma idempotente vía POST /businesses. */
export interface Business {
  id: string;
  owner_id: string;
  name: string;
  business_type: string | null;
  phone_number: string | null;
}

/** Respuesta cruda de POST /businesses: el negocio viene envuelto junto con un flag de idempotencia. */
export interface BusinessCreateResponse {
  business: Business;
  ya_existia: boolean;
}

export interface BusinessCreate {
  name: string;
  business_type?: string | null;
  phone_number?: string | null;
}

export interface PairingCodeInput {
  business_id: string;
  phone: string;
}

export interface PairingCodeResponse {
  pairing_code: string;
}

export interface BaileysStatus {
  business_id: string;
  connected: boolean;
}
