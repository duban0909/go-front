import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LucideIconComponent } from '../../../shared/components/lucide-icon/lucide-icon.component';

@Component({
  selector: 'app-admin-shell-page',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LucideIconComponent],
  templateUrl: './admin-shell.page.html',
  styleUrl: './admin-shell.page.css'
})
export class AdminShellPageComponent {}
