import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom, Observable, finalize, map, shareReplay, tap } from 'rxjs';
import { API, AuthResponse, RegistrationRequest } from '../api/models';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  roles: string[];
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly token = signal<string | null>(null);
  private refreshInFlight: Observable<string> | null = null;

  readonly user = computed(() => decode(this.token()));
  readonly isAuthenticated = computed(() => this.user() !== null);
  readonly isAdmin = computed(() => this.user()?.roles.includes('ADMIN') ?? false);

  accessToken(): string | null {
    return this.token();
  }

  login(email: string, password: string): Promise<AuthResponse> {
    return firstValueFrom(
      this.http
        .post<AuthResponse>(`${API}/auth/authenticate`, { email, password }, { withCredentials: true })
        .pipe(tap((response) => this.token.set(response.token))),
    );
  }

  register(request: RegistrationRequest): Promise<void> {
    return firstValueFrom(this.http.post<void>(`${API}/auth/register`, request));
  }

  activate(code: string): Promise<void> {
    return firstValueFrom(this.http.get<void>(`${API}/auth/activate-account`, { params: { token: code } }));
  }

  refresh(): Observable<string> {
    if (!this.refreshInFlight) {
      this.refreshInFlight = this.http
        .post<AuthResponse>(`${API}/auth/refresh`, null, { withCredentials: true })
        .pipe(
          map((response) => response.token),
          tap((token) => this.token.set(token)),
          finalize(() => (this.refreshInFlight = null)),
          shareReplay(1),
        );
    }
    return this.refreshInFlight;
  }

  async restoreSession(): Promise<void> {
    try {
      await firstValueFrom(this.refresh());
    } catch {
      this.token.set(null);
    }
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.http.post<void>(`${API}/auth/logout`, null, { withCredentials: true }));
    } finally {
      this.endSession();
    }
  }

  endSession(): void {
    this.token.set(null);
    void this.router.navigate(['/login']);
  }
}

function decode(token: string | null): SessionUser | null {
  if (!token) {
    return null;
  }
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = new TextDecoder().decode(Uint8Array.from(atob(payload), (c) => c.charCodeAt(0)));
    const claims = JSON.parse(json);
    return { id: claims.sub, email: claims.email, name: claims.name ?? claims.email, roles: claims.roles ?? [] };
  } catch {
    return null;
  }
}
