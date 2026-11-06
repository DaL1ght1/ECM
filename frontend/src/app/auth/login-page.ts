import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { errorMessage, httpStatus } from '../core/api/errors';
import { AuthService } from '../core/auth/auth.service';
import { AuthShell } from './auth-shell';

@Component({
  selector: 'ecm-login-page',
  imports: [AuthShell, FormsModule, RouterLink, NgIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-full' },
  template: `
    <ecm-auth-shell>
      <form class="glass flex w-[min(22rem,100%)] flex-col items-center gap-4 rounded-3xl border border-white/20 px-7 pb-7 pt-8 shadow-[var(--shadow-window)]"
            (ngSubmit)="submit()" [class.shake]="shake()">
        <span class="grid size-16 place-items-center rounded-full bg-gradient-to-br from-[#6f93ff] to-[#8e4ec6] text-2xl font-black text-white shadow-lg">E</span>
        <div class="text-center">
          <h1 class="text-[17px] font-semibold">Sign in to ECM</h1>
          <p class="text-[12px] text-ink-soft">Your documents, versions and shared folders.</p>
        </div>
        <label class="w-full">
          <span class="sr-only">Email</span>
          <input class="field h-10 rounded-xl" type="email" name="email" placeholder="Email" autocomplete="username" required autofocus
                 [(ngModel)]="email" />
        </label>
        <label class="relative w-full">
          <span class="sr-only">Password</span>
          <input class="field h-10 rounded-xl pr-11" type="password" name="password" placeholder="Password" autocomplete="current-password" required minlength="8"
                 [(ngModel)]="password" />
          <button type="submit" class="absolute right-1.5 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full bg-accent text-white disabled:opacity-40"
                  aria-label="Sign in" [disabled]="busy()">
            @if (busy()) {
              <span class="size-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white"></span>
            } @else {
              <ng-icon name="lucideArrowRight" size="15" strokeWidth="2.5" />
            }
          </button>
        </label>
        @if (error()) {
          <p class="w-full rounded-lg bg-danger-soft px-3 py-2 text-center text-[12px] text-danger" role="alert">{{ error() }}</p>
        }
        <div class="flex w-full justify-between text-[12px]">
          <a routerLink="/signup" class="text-accent hover:underline">Create an account</a>
          <a routerLink="/activate" class="text-ink-soft hover:underline">I have a code</a>
        </div>
      </form>
    </ecm-auth-shell>
  `,
  styles: `
    .shake {
      animation: shake 360ms cubic-bezier(0.36, 0.07, 0.19, 0.97);
    }
    @keyframes shake {
      20%, 60% { transform: translateX(-8px); }
      40%, 80% { transform: translateX(8px); }
    }
  `,
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected email = '';
  protected password = '';
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly shake = signal(false);

  protected async submit(): Promise<void> {
    if (!this.email || this.password.length < 8) {
      this.fail('Enter your email and a password of at least 8 characters.');
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.auth.login(this.email.trim(), this.password);
      await this.router.navigate(['/']);
    } catch (error) {
      const status = httpStatus(error);
      this.fail(status === 401 ? 'Incorrect email or password.' : status === 403 ? `${errorMessage(error)}. An administrator must approve your account.` : errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  private fail(message: string): void {
    this.error.set(message);
    this.shake.set(false);
    requestAnimationFrame(() => this.shake.set(true));
  }
}
