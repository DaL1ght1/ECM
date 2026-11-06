import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { ToastKind, ToastService } from '../shared/toast.service';

const ICONS: Record<ToastKind, string> = {
  info: 'lucideInfo',
  success: 'lucideCircleCheck',
  error: 'lucideCircleAlert',
  progress: 'lucideUpload',
};

@Component({
  selector: 'ecm-toasts',
  imports: [NgIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'pointer-events-none fixed right-3 top-10 z-[9500] flex w-80 flex-col gap-2' },
  template: `
    <div class="contents" aria-live="polite">
      @for (toast of toasts.toasts(); track toast.id) {
        <div class="glass-strong pointer-events-auto flex gap-3 rounded-xl border border-line p-3 shadow-[var(--shadow-float)] animate-toast-in"
             [attr.role]="toast.kind === 'error' ? 'alert' : 'status'">
          <ng-icon [name]="icon(toast.kind)" size="18" class="mt-0.5 shrink-0"
                   [class.text-success]="toast.kind === 'success'"
                   [class.text-danger]="toast.kind === 'error'"
                   [class.text-accent]="toast.kind === 'info' || toast.kind === 'progress'" />
          <div class="min-w-0 flex-1">
            <p class="truncate font-semibold">{{ toast.title }}</p>
            @if (toast.detail) {
              <p class="mt-0.5 line-clamp-2 text-[12px] text-ink-soft">{{ toast.detail }}</p>
            }
            @if (toast.kind === 'progress') {
              <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-hover">
                <div class="h-full rounded-full bg-accent transition-[width] duration-150" [style.width.%]="(toast.progress ?? 0) * 100"></div>
              </div>
            }
          </div>
          <button type="button" class="icon-btn -mr-1 -mt-1 size-6 shrink-0" aria-label="Dismiss notification" (click)="toasts.dismiss(toast.id)">
            <ng-icon name="lucideX" size="13" />
          </button>
        </div>
      }
    </div>
  `,
})
export class Toasts {
  protected readonly toasts = inject(ToastService);

  protected icon(kind: ToastKind): string {
    return ICONS[kind];
  }
}
