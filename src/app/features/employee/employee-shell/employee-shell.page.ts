import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SessionService } from '../../../core/services/session.service';
import { LucideIconComponent } from '../../../shared/components/lucide-icon/lucide-icon.component';
import { NotificationBellComponent } from '../../../shared/components/notification-bell/notification-bell.component';

@Component({
  selector: 'app-employee-shell-page',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LucideIconComponent, NotificationBellComponent],
  templateUrl: './employee-shell.page.html',
  styleUrl: './employee-shell.page.css'
})
export class EmployeeShellPageComponent {
  private readonly sessionService = inject(SessionService);

  readonly isBlocked = computed(() => Boolean(this.sessionService.currentEmployment()?.business_blocked));
}
