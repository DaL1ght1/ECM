import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { errorMessage } from '../core/api/errors';
import { AuthService } from '../core/auth/auth.service';
import { AuthShell } from './auth-shell';

@Component({
  selector: 'ecm-signup-page',
  imports: [AuthShell, FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-full' },
  template: `
    <ecm-auth-shell>
      <form #form="ngForm" class="glass flex w-[min(26rem,100%)] flex-col gap-3 rounded-3xl border border-white/20 p-7 shadow-[var(--shadow-window)]"
            (ngSubmit)="form.valid && submit()">
        <div class="mb-1 text-center">
          <h1 class="text-[17px] font-semibold">Create your account</h1>
          <p class="text-[12px] text-ink-soft">We’ll email you a code, then an administrator approves your access.</p>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <input class="field h-10 rounded-xl" name="name" placeholder="First name" aria-label="First name" autocomplete="given-name" required [(ngModel)]="name" />
          <input class="field h-10 rounded-xl" name="lastName" placeholder="Last name" aria-label="Last name" autocomplete="family-name" required [(ngModel)]="lastName" />
        </div>
        <input class="field h-10 rounded-xl" type="email" name="email" placeholder="Work email" aria-label="Email" autocomplete="email" required email [(ngModel)]="email" />
        <input class="field h-10 rounded-xl" type="tel" name="phone" placeholder="Phone (optional)" aria-label="Phone" autocomplete="tel" [(ngModel)]="phone" />
        <input class="field h-10 rounded-xl" type="password" name="password" placeholder="Password (8+ characters)" aria-label="Password"
               autocomplete="new-password" required minlength="8" [(ngModel)]="password" />
        <input class="field h-10 rounded-xl" type="password" name="confirm" placeholder="Confirm password" aria-label="Confirm password"
               autocomplete="new-password" required [(ngModel)]="confirm" />
        @if (error()) {
          <p class="rounded-lg bg-danger-soft px-3 py-2 text-center text-[12px] text-danger" role="alert">{{ error() }}</p>
        }
        <button type="submit" class="btn btn-primary mt-1 h-10 justify-center rounded-xl" [disabled]="busy() || form.invalid">
          {{ busy() ? 'Creating account…' : 'Create Account' }}
        </button>
        <p class="text-center text-[12px] text-ink-soft">Already registered? <a routerLink="/login" class="text-accent hover:underline">Sign in</a></p>
      </form>
    </ecm-auth-shell>
  `,
})
export class SignupPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected name = '';
  protected lastName = '';
  protected email = '';
  protected phone = '';
  protected password = '';
  protected confirm = '';
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected async submit(): Promise<void> {
    if (this.password !== this.confirm) {
      this.error.set('The passwords don’t match.');
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.auth.register({
        name: this.name.trim(),
        lastName: this.lastName.trim(),
        email: this.email.trim(),
        password: this.password,
        phone: this.phone.trim() || undefined,
      });
      await this.router.navigate(['/activate'], { queryParams: { email: this.email.trim() } });
    } catch (error) {
      this.error.set(errorMessage(error, 'Registration failed. Please try again.'));
    } finally {
      this.busy.set(false);
    }
  }
}
