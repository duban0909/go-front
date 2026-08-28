import { Component, ElementRef, HostListener, computed, inject, signal } from '@angular/core';
import { AppointmentNotification, RealtimeEventType } from '../../../core/models/realtime.model';
import { RealtimeService } from '../../../core/services/realtime.service';
import { formatRelativeTime } from '../../utils/date-utils';
import { LucideIconComponent, LucideIconName } from '../lucide-icon/lucide-icon.component';

const TYPE_TITLES: Record<RealtimeEventType, string> = {
  'appointment.created': 'Nueva cita agendada',
  'appointment.updated': 'Cita actualizada',
  'appointment.cancelled': 'Cita cancelada'
};

const TYPE_ICONS: Record<RealtimeEventType, LucideIconName> = {
  'appointment.created': 'calendar-check',
  'appointment.updated': 'refresh-cw',
  'appointment.cancelled': 'calendar-x'
};

@Component({
  selector: 'app-notification-bell',
  imports: [LucideIconComponent],
  templateUrl: './notification-bell.component.html',
  styleUrl: './notification-bell.component.css'
})
export class NotificationBellComponent {
  private readonly realtimeService = inject(RealtimeService);
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  readonly isOpen = signal(false);
  readonly notifications = computed(() => this.realtimeService.notifications());
  readonly unreadCount = computed(() => this.realtimeService.unreadCount());

  toggle(): void {
    const next = !this.isOpen();
    this.isOpen.set(next);

    if (next) {
      this.realtimeService.requestNotificationPermission();
    }
  }

  selectNotification(notification: AppointmentNotification): void {
    this.realtimeService.markAsRead(notification.id);
  }

  markAllAsRead(): void {
    this.realtimeService.markAllAsRead();
  }

  badgeLabel(): string {
    const count = this.unreadCount();
    return count > 9 ? '9+' : String(count);
  }

  titleFor(type: RealtimeEventType): string {
    return TYPE_TITLES[type];
  }

  iconFor(type: RealtimeEventType): LucideIconName {
    return TYPE_ICONS[type];
  }

  relativeTime(date: Date): string {
    return formatRelativeTime(date);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.isOpen() && !this.elementRef.nativeElement.contains(event.target as Node)) {
      this.isOpen.set(false);
    }
  }
}
