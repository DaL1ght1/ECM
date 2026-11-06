import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, input, signal, viewChildren } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { errorMessage } from '../core/api/errors';
import { AuthService } from '../core/auth/auth.service';
import { AuthShell } from './auth-shell';

const LENGTH = 6;

@Component({
  selector: 'ecm-activate-page',
  imports: [AuthShell, RouterLink, NgIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-full' },
  template: `
    <ecm-auth-shell>
      <form class="glass flex w-[min(24rem,100%)] flex-col items-center gap-4 rounded-3xl border border-white/20 p-7 text-center shadow-[var(--shadow-window)]"
            (submit)="$event.preventDefault(); submit()">
        @if (done()) {
          <span class="grid size-14 place-items-center rounded-full bg-success text-white"><ng-icon name="lucideCheck" size="28" strokeWidth="3" /></span>
          <h1 class="text-[17px] font-semibold">Email verified</h1>
          <p class="text-[12.5px] text-ink-soft">An administrator has been notified. You can sign in as soon as your account is approved.</p>
          <a routerLink="/login" class="btn btn-primary h-10 w-full justify-center rounded-xl">Back to Sign In</a>
        } @else {
          <span class="grid size-14 place-items-center rounded-full bg-accent-soft text-accent"><ng-icon name="lucideMailCheck" size="26" /></span>
          <div>
            <h1 class="text-[17px] font-semibold">Enter your activation code</h1>
            <p class="text-[12.5px] text-ink-soft">
              We sent a 6-digit code{{ email() ? ' to ' + email() : '' }}. It expires after 30 minutes.
            </p>
          </div>
          <div class="flex gap-2" role="group" aria-label="Activation code">
            @for (slot of slots; track slot) {
              <input #digit class="field h-12 w-10 rounded-xl px-0 text-center text-[20px] font-semibold tabular-nums"
                     inputmode="numeric" maxlength="1" autocomplete="one-time-code" [attr.aria-label]="'Digit ' + (slot + 1)"
                     [attr.autofocus]="slot === 0 ? '' : null" [value]="digits()[slot] ?? ''"
                     (input)="onDigit(slot, $event)" (keydown)="onKey(slot, $event)" (paste)="onPaste($event)" />
            }
          </div>
          @if (error()) {
            <p class="w-full rounded-lg bg-danger-soft px-3 py-2 text-[12px] text-danger" role="alert">{{ error() }}</p>
          }
          <button type="submit" class="btn btn-primary h-10 w-full justify-center rounded-xl" [disabled]="busy() || code().length < 6">
            {{ busy() ? 'Verifying…' : 'Verify' }}
          </button>
          <a routerLink="/login" class="text-[12px] text-ink-soft hover:underline">Back to Sign In</a>
        }
      </form>
    </ecm-auth-shell>
  `,
})
export class ActivatePage {
  private readonly auth = inject(AuthService);
  readonly email = input<string>();

  protected readonly slots = Array.from({ length: LENGTH }, (_, index) => index);
  protected readonly digits = signal<string[]>([]);
  protected readonly code = computed(() => this.digits().join(''));
  protected readonly busy = signal(false);
  protected readonly done = signal(false);
  protected readonly error = signal<string | null>(null);
  private readonly inputs = viewChildren<ElementRef<HTMLInputElement>>('digit');

  protected onDigit(slot: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, '').slice(-1);
    input.value = value;
    this.digits.update((digits) => {
      const next = [...digits];
      next[slot] = value;
      return next;
    });
    if (value && slot < LENGTH - 1) {
      this.inputs()[slot + 1].nativeElement.focus();
    }
    if (this.code().length === LENGTH) {
      void this.submit();
    }
  }

  protected onKey(slot: number, event: KeyboardEvent): void {
    if (event.key === 'Backspace' && !(event.target as HTMLInputElement).value && slot > 0) {
      this.inputs()[slot - 1].nativeElement.focus();
    }
  }

  protected onPaste(event: ClipboardEvent): void {
    const pasted = (event.clipboardData?.getData('text') ?? '').replace(/\D/g, '').slice(0, LENGTH);
    if (pasted) {
      event.preventDefault();
      this.digits.set(pasted.split(''));
      this.inputs()[Math.min(pasted.length, LENGTH) - 1].nativeElement.focus();
      if (pasted.length === LENGTH) {
        void this.submit();
      }
    }
  }

  protected async submit(): Promise<void> {
    if (this.code().length !== LENGTH || this.busy()) {
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.auth.activate(this.code());
      this.done.set(true);
    } catch (error) {
      this.error.set(errorMessage(error, 'That code is invalid or has expired. A new code has been sent if it expired.'));
    } finally {
      this.busy.set(false);
    }
  }
}
