import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SessionService } from '../../../core/services/session.service';
import { LucideIconComponent } from '../../../shared/components/lucide-icon/lucide-icon.component';

@Component({
  selector: 'app-business-shell-page',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LucideIconComponent],
  templateUrl: './business-shell.page.html',
  styleUrl: './business-shell.page.css'
})
export class BusinessShellPageComponent {
  private readonly sessionService = inject(SessionService);

  readonly isBlocked = computed(() => Boolean(this.sessionService.currentEmployment()?.business_blocked));
}
