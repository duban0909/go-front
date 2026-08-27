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
  employee_id: string;
  client_name: string;
  client_phone: string;
  service_id: string;
  fecha_hora: string;
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

/** Info publica que el widget de chat necesita antes de arrancar. */
export interface ChatConfig {
  business_id: string;
  name: string;
  business_type: string | null;
  enabled: boolean;
  employee_id: string | null;
  employee_name: string | null;
}

export interface CreateSessionResponse {
  session_id: string;
}

export interface ChatMessageInput {
  mensaje: string;
}

export interface ChatMessageResponse {
  respuesta: string;
}

export interface ChatHistoryMessage {
  role: string;
  content: string;
}

/** Respuesta cruda de GET .../messages: los mensajes vienen envueltos bajo la clave "mensajes". */
export interface ChatHistoryResponse {
  session_id: string;
  mensajes: ChatHistoryMessage[];
}

export interface QrCardInput {
  chat_link: string;
  business_name: string;
  whatsapp: string;
}

// --- Sesion / roles ---------------------------------------------------

export interface Employment {
  employee_id: string;
  business_id: string;
  business_name: string | null;
  business_blocked: boolean | null;
  name: string | null;
  role: 'owner' | 'staff';
  active: boolean;
}

/** Respuesta cruda de GET /me: bootstrap de sesion (rol, negocios en los que trabaja). */
export interface MeResponse {
  user_id: string;
  is_super_admin: boolean;
  employments: Employment[];
}

// --- Codigos de invitacion ----------------------------------------------

export interface RedeemInput {
  code: string;
}

export interface RedeemResponse {
  business_id: string;
  role: 'admin' | 'employee';
  employee: Employee;
}

export interface EmployeeInvitationCreate {
  employee_name?: string | null;
}

/** Fila cruda de la tabla invitation_codes. */
export interface InvitationCode {
  id: string;
  code: string;
  business_id: string;
  role: 'admin' | 'employee';
  employee_name: string | null;
  created_by: string;
  used_by: string | null;
  used_at: string | null;
  created_at: string;
}

/** Respuesta cruda de POST .../invitation-codes: el codigo viene envuelto bajo la clave "invitation_code". */
export interface InvitationCodeResponse {
  invitation_code: InvitationCode;
}

// --- Empleados ------------------------------------------------------------

export interface Employee {
  id: string;
  business_id: string;
  user_id: string;
  name: string | null;
  role: 'owner' | 'staff';
  active: boolean;
}

/** Respuesta cruda de GET /employees: la lista viene envuelta bajo la clave "employees". */
export interface EmployeesListResponse {
  employees: Employee[];
}

export interface EmployeeUpdate {
  name: string;
}

/** Respuesta cruda de PUT /employees/{id}: el empleado viene envuelto bajo la clave "employee". */
export interface EmployeeUpdateResponse {
  employee: Employee;
}

export interface EmployeeDeleteResponse {
  deleted: boolean;
  employee: Employee;
}

export interface EmployeeHour {
  id: string;
  employee_id: string;
  day: string;
  is_open: boolean;
  opening_time: string | null;
  closing_time: string | null;
  lunch_start: string | null;
  lunch_end: string | null;
}

/** Respuesta cruda de GET /employees/{id}/hours: la lista viene envuelta bajo la clave "employee_hours". */
export interface EmployeeHoursListResponse {
  employee_hours: EmployeeHour[];
}

export interface EmployeeHourUpdate {
  day: string;
  is_open: boolean;
  opening_time?: string | null;
  closing_time?: string | null;
  lunch_start?: string | null;
  lunch_end?: string | null;
}

/** Respuesta cruda de PUT /employees/{id}/hours: la fila viene envuelta bajo la clave "employee_hour". */
export interface EmployeeHourUpdateResponse {
  employee_hour: EmployeeHour;
}

/** Respuesta cruda de GET /employees/{id}/services: la lista viene envuelta bajo la clave "services". */
export interface EmployeeServicesResponse {
  services: ServiceItem[];
}

export interface EmployeeServicesUpdate {
  service_ids: string[];
}

export interface EmployeeServicesUpdateResponse {
  services: ServiceItem[];
  business_id: string;
}

// --- Super admin ------------------------------------------------------------

export interface AdminBusiness {
  id: string;
  name: string;
  business_type: string | null;
  owner_id: string | null;
  blocked: boolean;
  created_at: string;
}

/** Respuesta cruda de GET /admin/businesses: la lista viene envuelta bajo la clave "businesses". */
export interface AdminBusinessesListResponse {
  businesses: AdminBusiness[];
}

export interface AdminBusinessCreate {
  name: string;
  business_type?: string | null;
}

/** Respuesta cruda de POST /admin/businesses: el negocio viene envuelto bajo la clave "business". */
export interface AdminBusinessCreateResponse {
  business: AdminBusiness;
}

export interface BlockedUpdate {
  blocked: boolean;
}

/** Respuesta cruda de PUT /admin/businesses/{id}/blocked: el negocio viene envuelto bajo la clave "business". */
export interface AdminBusinessResponse {
  business: AdminBusiness;
}
