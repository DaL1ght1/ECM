import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guards';

export const routes: Routes = [
  { path: '', canActivate: [authGuard], loadComponent: () => import('./desktop/desktop').then((m) => m.Desktop), title: 'ECM' },
  { path: 'login', canActivate: [guestGuard], loadComponent: () => import('./auth/login-page').then((m) => m.LoginPage), title: 'Sign In · ECM' },
  { path: 'signup', canActivate: [guestGuard], loadComponent: () => import('./auth/signup-page').then((m) => m.SignupPage), title: 'Create Account · ECM' },
  { path: 'activate', loadComponent: () => import('./auth/activate-page').then((m) => m.ActivatePage), title: 'Activate · ECM' },
  { path: 'activate-account', redirectTo: 'activate' },
  { path: '**', redirectTo: '' },
];
