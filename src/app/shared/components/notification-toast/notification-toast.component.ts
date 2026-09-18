import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { RealtimeEventType, RealtimeNotification } from '../../../core/models/realtime.model';
import { RealtimeService } from '../../../core/services/realtime.service';
import { toDateKey } from '../../utils/date-utils';
import { LucideIconComponent, LucideIconName } from '../lucide-icon/lucide-icon.component';

const TYPE_TITLES: Record<RealtimeEventType, string> = {
  'appointment.created': 'Nueva cita agendada',
  'appointment.updated': 'Cita actualizada',
  'appointment.cancelled': 'Cita cancelada',
  'chat.escalated': 'Un cliente necesita ayuda'
};

const TYPE_ICONS: Record<RealtimeEventType, LucideIconName> = {
  'appointment.created': 'calendar-check',
  'appointment.updated': 'refresh-cw',
  'appointment.cancelled': 'calendar-x',
  'chat.escalated': 'message-circle'
};

@Component({
  selector: 'app-notification-toast',
  imports: [LucideIconComponent],
  templateUrl: './notification-toast.component.html',
  styleUrl: './notification-toast.component.css'
})
export class NotificationToastComponent {
  private readonly realtimeService = inject(RealtimeService);
  private readonly router = inject(Router);

  readonly toasts = computed(() => this.realtimeService.toasts());

  titleFor(type: RealtimeEventType): string {
    return TYPE_TITLES[type];
  }

  iconFor(type: RealtimeEventType): LucideIconName {
    return TYPE_ICONS[type];
  }

  detailFor(notification: RealtimeNotification): string {
    return notification.type === 'chat.escalated'
      ? (notification.clientName ?? 'Un cliente') + ' esta esperando ayuda en el chat'
      : `${notification.appointment.client_name} · ${notification.appointment.services?.name ?? 'Servicio'}`;
  }

  open(notification: RealtimeNotification): void {
    this.realtimeService.markAsRead(notification.id);
    this.realtimeService.dismissToast(notification.id);

    if (notification.type === 'chat.escalated') {
      void this.router.navigate(['/business/chat', notification.sessionId]);
    } else {
      const dateKey = toDateKey(new Date(notification.appointment.scheduled_at));
      void this.router.navigate(['/business/appointments'], {
        queryParams: { date: dateKey, highlight: notification.appointment.id }
      });
    }
  }

  dismiss(event: Event, id: string): void {
    event.stopPropagation();
    this.realtimeService.dismissToast(id);
  }
}
