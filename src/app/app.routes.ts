import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { AdminShellPageComponent } from './features/admin/admin-shell/admin-shell.page';
import { AppointmentsPageComponent } from './features/admin/appointments/appointments.page';
import { HoursPageComponent } from './features/admin/hours/hours.page';
import { ServicesPageComponent } from './features/admin/services/services.page';
import { SettingsPageComponent } from './features/admin/settings/settings.page';
import { LoginPageComponent } from './features/auth/login/login.page';
import { ChatPageComponent } from './features/chat/chat.page';

export const routes: Routes = [
	{
		path: '',
		pathMatch: 'full',
		redirectTo: 'auth/login'
	},
	{
		path: 'auth',
		children: [
			{
				path: 'login',
				component: LoginPageComponent
			}
		]
	},
	{
		path: 'chat/:businessId',
		component: ChatPageComponent
	},
	{
		path: 'admin',
		canActivate: [authGuard],
		component: AdminShellPageComponent,
		children: [
			{
				path: '',
				pathMatch: 'full',
				redirectTo: 'appointments'
			},
			{
				path: 'appointments',
				component: AppointmentsPageComponent
			},
			{
				path: 'services',
				component: ServicesPageComponent
			},
			{
				path: 'hours',
				component: HoursPageComponent
			},
			{
				path: 'settings',
				component: SettingsPageComponent
			}
		]
	},
	{
		path: '**',
		redirectTo: 'auth/login'
	}
];
