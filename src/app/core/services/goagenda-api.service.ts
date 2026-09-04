import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { GOAGENDA_API_URL } from '../config/goagenda-api.config';
import { AppointmentsListResponse, ListAppointmentsParams } from '../models/appointment.model';
import {
  AdminBusiness,
  AdminBusinessCreate,
  AdminBusinessCreateResponse,
  AdminBusinessesListResponse,
  AdminBusinessResponse,
  AiUsage,
  AvailableSlotsParams,
  AvailableSlotsResponse,
  BaileysStatus,
  BlockedUpdate,
  BusinessChatReplyInput,
  BusinessHoursListResponse,
  BusinessInfoUpdate,
  BusinessSettings,
  BusinessSettingsResponse,
  ChatConfig,
  ChatHistoryMessage,
  ChatHistoryResponse,
  ChatMessageResponse,
  CreateSessionResponse,
  DayHour,
  DayHourUpdate,
  Employee,
  EmployeeDeleteResponse,
  EmployeeHour,
  EmployeeHoursListResponse,
  EmployeeHourUpdate,
  EmployeeHourUpdateResponse,
  EmployeeInvitationCreate,
  EmployeeServicesResponse,
  EmployeeServicesUpdate,
  EmployeeServicesUpdateResponse,
  EmployeesListResponse,
  EmployeeUpdate,
  EmployeeUpdateResponse,
  ExcludedChat,
  ExcludedChatCreate,
  FcmTokenUpdate,
  InvitationCode,
  InvitationCodeResponse,
  ManualAppointmentInput,
  MeResponse,
  PairingCodeInput,
  PairingCodeResponse,
  QrCardInput,
  RedeemInput,
  RedeemResponse,
  ReminderConfigUpdate,
  ServiceCreate,
  ServiceItem,
  ServicesListResponse,
  ServiceUpdate
} from '../models/goagenda.models';

@Injectable({ providedIn: 'root' })
export class GoagendaApiService {
  constructor(private readonly http: HttpClient) {}

  // Sesion
  getMe(): Observable<MeResponse> {
    return this.http.get<MeResponse>(`${GOAGENDA_API_URL}/me`);
  }

  // Codigos de invitacion
  redeemInvitationCode(payload: RedeemInput): Observable<RedeemResponse> {
    return this.http.post<RedeemResponse>(`${GOAGENDA_API_URL}/invitation-codes/redeem`, payload);
  }

  createEmployeeInvitationCode(businessId: string, payload: EmployeeInvitationCreate): Observable<InvitationCode> {
    return this.http
      .post<InvitationCodeResponse>(`${GOAGENDA_API_URL}/businesses/${businessId}/invitation-codes`, payload)
      .pipe(map((response) => response.invitation_code));
  }

  // Super admin
  adminListBusinesses(): Observable<AdminBusiness[]> {
    return this.http
      .get<AdminBusinessesListResponse>(`${GOAGENDA_API_URL}/admin/businesses`)
      .pipe(map((response) => response.businesses));
  }

  adminCreateBusiness(payload: AdminBusinessCreate): Observable<AdminBusiness> {
    return this.http
      .post<AdminBusinessCreateResponse>(`${GOAGENDA_API_URL}/admin/businesses`, payload)
      .pipe(map((response) => response.business));
  }

  adminSetBusinessBlocked(businessId: string, blocked: boolean): Observable<AdminBusiness> {
    const payload: BlockedUpdate = { blocked };
    return this.http
      .put<AdminBusinessResponse>(`${GOAGENDA_API_URL}/admin/businesses/${businessId}/blocked`, payload)
      .pipe(map((response) => response.business));
  }

  adminCreateOwnerInvitationCode(businessId: string): Observable<InvitationCode> {
    return this.http
      .post<InvitationCodeResponse>(`${GOAGENDA_API_URL}/admin/businesses/${businessId}/invitation-codes`, {})
      .pipe(map((response) => response.invitation_code));
  }

  // Empleados
  listEmployees(businessId: string): Observable<Employee[]> {
    return this.http
      .get<EmployeesListResponse>(`${GOAGENDA_API_URL}/employees`, { params: { business_id: businessId } })
      .pipe(map((response) => response.employees));
  }

  updateEmployee(employeeId: string, payload: EmployeeUpdate): Observable<Employee> {
    return this.http
      .put<EmployeeUpdateResponse>(`${GOAGENDA_API_URL}/employees/${employeeId}`, payload)
      .pipe(map((response) => response.employee));
  }

  deleteEmployee(employeeId: string): Observable<EmployeeDeleteResponse> {
    return this.http.delete<EmployeeDeleteResponse>(`${GOAGENDA_API_URL}/employees/${employeeId}`);
  }

  getEmployeeHours(employeeId: string): Observable<EmployeeHour[]> {
    return this.http
      .get<EmployeeHoursListResponse>(`${GOAGENDA_API_URL}/employees/${employeeId}/hours`)
      .pipe(map((response) => response.employee_hours));
  }

  updateEmployeeHours(employeeId: string, payload: EmployeeHourUpdate): Observable<EmployeeHour> {
    return this.http
      .put<EmployeeHourUpdateResponse>(`${GOAGENDA_API_URL}/employees/${employeeId}/hours`, payload)
      .pipe(map((response) => response.employee_hour));
  }

  getEmployeeServices(employeeId: string): Observable<ServiceItem[]> {
    return this.http
      .get<EmployeeServicesResponse>(`${GOAGENDA_API_URL}/employees/${employeeId}/services`)
      .pipe(map((response) => response.services));
  }

  updateEmployeeServices(employeeId: string, payload: EmployeeServicesUpdate): Observable<ServiceItem[]> {
    return this.http
      .put<EmployeeServicesUpdateResponse>(`${GOAGENDA_API_URL}/employees/${employeeId}/services`, payload)
      .pipe(map((response) => response.services));
  }

  // Servicios
  listServices(businessId: string): Observable<ServiceItem[]> {
    return this.http
      .get<ServicesListResponse>(`${GOAGENDA_API_URL}/services`, {
        params: { business_id: businessId }
      })
      .pipe(map((response) => response.services));
  }

  createService(payload: ServiceCreate): Observable<ServiceItem> {
    return this.http.post<ServiceItem>(`${GOAGENDA_API_URL}/services`, payload);
  }

  updateService(serviceId: string, payload: ServiceUpdate): Observable<ServiceItem> {
    return this.http.put<ServiceItem>(`${GOAGENDA_API_URL}/services/${serviceId}`, payload);
  }

  deleteService(serviceId: string): Observable<unknown> {
    return this.http.delete(`${GOAGENDA_API_URL}/services/${serviceId}`);
  }

  // Configuracion de negocio
  getBusinessSettings(businessId: string): Observable<BusinessSettings> {
    return this.http
      .get<BusinessSettingsResponse>(`${GOAGENDA_API_URL}/business-settings`, {
        params: { business_id: businessId }
      })
      .pipe(map((response) => response.business));
  }

  updateBusinessInfo(payload: BusinessInfoUpdate): Observable<BusinessSettings> {
    return this.http.put<BusinessSettings>(`${GOAGENDA_API_URL}/business-settings/info`, payload);
  }

  updateReminderConfig(payload: ReminderConfigUpdate): Observable<BusinessSettings> {
    return this.http.put<BusinessSettings>(`${GOAGENDA_API_URL}/business-settings/reminder`, payload);
  }

  updateFcmToken(payload: FcmTokenUpdate): Observable<unknown> {
    return this.http.put(`${GOAGENDA_API_URL}/business-settings/fcm-token`, payload);
  }

  // Horarios
  getBusinessHours(businessId: string): Observable<DayHour[]> {
    return this.http
      .get<BusinessHoursListResponse>(`${GOAGENDA_API_URL}/business-hours`, {
        params: { business_id: businessId }
      })
      .pipe(map((response) => response.business_hours));
  }

  updateBusinessHours(payload: DayHourUpdate): Observable<DayHour> {
    return this.http.put<DayHour>(`${GOAGENDA_API_URL}/business-hours`, payload);
  }

  // Uso de IA
  getAiUsage(businessId: string): Observable<AiUsage> {
    return this.http.get<AiUsage>(`${GOAGENDA_API_URL}/ai-usage`, {
      params: { business_id: businessId }
    });
  }

  // Chats excluidos
  listExcludedChats(businessId: string): Observable<ExcludedChat[]> {
    return this.http.get<ExcludedChat[]>(`${GOAGENDA_API_URL}/excluded-chats`, {
      params: { business_id: businessId }
    });
  }

  addExcludedChat(payload: ExcludedChatCreate): Observable<ExcludedChat> {
    return this.http.post<ExcludedChat>(`${GOAGENDA_API_URL}/excluded-chats`, payload);
  }

  removeExcludedChat(businessId: string, phoneNumber: string): Observable<unknown> {
    return this.http.delete(`${GOAGENDA_API_URL}/excluded-chats`, {
      params: { business_id: businessId, phone_number: phoneNumber }
    });
  }

  // Citas
  createManualAppointment(payload: ManualAppointmentInput): Observable<unknown> {
    return this.http.post(`${GOAGENDA_API_URL}/appointments/manual`, payload);
  }

  listAppointments(params: ListAppointmentsParams): Observable<AppointmentsListResponse> {
    let httpParams = new HttpParams().set('business_id', params.business_id);

    if (params.employee_id) {
      httpParams = httpParams.set('employee_id', params.employee_id);
    }
    if (params.status) {
      httpParams = httpParams.set('status', params.status);
    }
    if (params.date_from) {
      httpParams = httpParams.set('date_from', params.date_from);
    }
    if (params.date_to) {
      httpParams = httpParams.set('date_to', params.date_to);
    }
    if (params.limit != null) {
      httpParams = httpParams.set('limit', params.limit);
    }
    if (params.offset != null) {
      httpParams = httpParams.set('offset', params.offset);
    }

    return this.http.get<AppointmentsListResponse>(`${GOAGENDA_API_URL}/appointments`, { params: httpParams });
  }

  getAvailableSlots(params: AvailableSlotsParams): Observable<AvailableSlotsResponse> {
    let httpParams = new HttpParams()
      .set('business_id', params.business_id)
      .set('employee_id', params.employee_id)
      .set('date', params.date);

    if (params.service_id) {
      httpParams = httpParams.set('service_id', params.service_id);
    }

    return this.http.get<AvailableSlotsResponse>(`${GOAGENDA_API_URL}/appointments/available-slots`, { params: httpParams });
  }

  // Vinculacion de WhatsApp (Baileys)
  getBaileysStatus(businessId: string): Observable<BaileysStatus> {
    return this.http.get<BaileysStatus>(`${GOAGENDA_API_URL}/baileys/status`, {
      params: { business_id: businessId }
    });
  }

  requestPairingCode(payload: PairingCodeInput): Observable<PairingCodeResponse> {
    return this.http.post<PairingCodeResponse>(`${GOAGENDA_API_URL}/baileys/pairing-code`, payload);
  }

  // Chat publico de agendamiento (variante general o por empleado, segun employeeId)
  private chatBasePath(businessId: string, employeeId?: string): string {
    return employeeId ? `${GOAGENDA_API_URL}/chat/${businessId}/${employeeId}` : `${GOAGENDA_API_URL}/chat/${businessId}`;
  }

  getChatConfig(businessId: string, employeeId?: string): Observable<ChatConfig> {
    return this.http.get<ChatConfig>(`${this.chatBasePath(businessId, employeeId)}/config`);
  }

  createChatSession(businessId: string, employeeId?: string): Observable<string> {
    return this.http
      .post<CreateSessionResponse>(`${this.chatBasePath(businessId, employeeId)}/sessions`, {})
      .pipe(map((response) => response.session_id));
  }

  sendChatMessage(businessId: string, sessionId: string, mensaje: string, employeeId?: string): Observable<ChatMessageResponse> {
    return this.http.post<ChatMessageResponse>(`${this.chatBasePath(businessId, employeeId)}/sessions/${sessionId}/messages`, {
      mensaje
    });
  }

  getChatHistory(businessId: string, sessionId: string, employeeId?: string): Observable<ChatHistoryMessage[]> {
    return this.http
      .get<ChatHistoryResponse>(`${this.chatBasePath(businessId, employeeId)}/sessions/${sessionId}/messages`)
      .pipe(map((response) => response.mensajes));
  }

  // Conversaciones escaladas (vista autenticada del negocio)
  getBusinessChatSession(businessId: string, sessionId: string): Observable<ChatHistoryMessage[]> {
    return this.http
      .get<ChatHistoryResponse>(`${GOAGENDA_API_URL}/business/${businessId}/chat-sessions/${sessionId}`)
      .pipe(map((response) => response.mensajes));
  }

  replyToBusinessChatSession(businessId: string, sessionId: string, mensaje: string): Observable<ChatHistoryMessage[]> {
    const payload: BusinessChatReplyInput = { mensaje };
    return this.http
      .post<ChatHistoryResponse>(`${GOAGENDA_API_URL}/business/${businessId}/chat-sessions/${sessionId}/reply`, payload)
      .pipe(map((response) => response.mensajes));
  }

  // Tarjeta QR para imprimir
  generateQrCard(payload: QrCardInput): Observable<Blob> {
    return this.http.post(`${GOAGENDA_API_URL}/qr-card`, payload, { responseType: 'blob' });
  }
}
