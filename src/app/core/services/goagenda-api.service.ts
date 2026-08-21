import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { GOAGENDA_API_URL } from '../config/goagenda-api.config';
import {
  AiUsage,
  BaileysStatus,
  Business,
  BusinessCreate,
  BusinessCreateResponse,
  BusinessHoursListResponse,
  BusinessInfoUpdate,
  BusinessSettings,
  BusinessSettingsResponse,
  DayHour,
  DayHourUpdate,
  ExcludedChat,
  ExcludedChatCreate,
  FcmTokenUpdate,
  ManualAppointmentInput,
  PairingCodeInput,
  PairingCodeResponse,
  ReminderConfigUpdate,
  ServiceCreate,
  ServiceItem,
  ServicesListResponse,
  ServiceUpdate
} from '../models/goagenda.models';

@Injectable({ providedIn: 'root' })
export class GoagendaApiService {
  constructor(private readonly http: HttpClient) {}

  // Negocio (self-service, idempotente: owner_id sale del token)
  crearNegocio(payload: BusinessCreate): Observable<Business> {
    return this.http
      .post<BusinessCreateResponse>(`${GOAGENDA_API_URL}/businesses`, payload)
      .pipe(map((response) => response.business));
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

  // Vinculacion de WhatsApp (Baileys)
  getBaileysStatus(businessId: string): Observable<BaileysStatus> {
    return this.http.get<BaileysStatus>(`${GOAGENDA_API_URL}/baileys/status`, {
      params: { business_id: businessId }
    });
  }

  requestPairingCode(payload: PairingCodeInput): Observable<PairingCodeResponse> {
    return this.http.post<PairingCodeResponse>(`${GOAGENDA_API_URL}/baileys/pairing-code`, payload);
  }
}
