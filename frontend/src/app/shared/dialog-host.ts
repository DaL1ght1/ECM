import { ChangeDetectionStrategy, Component, ElementRef, effect, inject, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogService } from './dialog.service';

@Component({
  selector: 'ecm-dialog-host',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog #dialog aria-labelledby="ecm-dialog-title" (close)="onClose()"
            class="glass-strong m-auto w-[min(26rem,calc(100vw-2rem))] rounded-2xl p-0 text-ink shadow-[var(--shadow-window)] open:animate-pop-in">
      @if (dialogs.current(); as request) {
        <form method="dialog" class="flex flex-col gap-4 p-5" (submit)="onSubmit($event)">
          <div class="flex flex-col gap-1">
            <h2 id="ecm-dialog-title" class="text-[15px] font-semibold">{{ request.title }}</h2>
            @if (request.message) {
              <p class="text-ink-soft leading-relaxed">{{ request.message }}</p>
            }
          </div>
          @if (request.type === 'prompt') {
            <label class="flex flex-col gap-1.5">
              <span class="text-xs font-medium text-ink-soft">{{ request.label }}</span>
              <input #field class="field" name="value" autocomplete="off" required maxlength="255"
                     [ngModel]="value" (ngModelChange)="value = $event" />
            </label>
          }
          <div class="flex justify-end gap-2">
            <button type="button" class="btn" [attr.autofocus]="request.type === 'confirm' ? '' : null" (click)="dialogs.settle(null)">Cancel</button>
            <button type="submit" value="ok" [class]="request.type === 'confirm' && request.danger ? 'btn btn-danger' : 'btn btn-primary'">
              {{ request.confirmText ?? (request.type === 'prompt' ? 'Save' : 'OK') }}
            </button>
          </div>
        </form>
      }
    </dialog>
  `,
})
export class DialogHost {
  protected readonly dialogs = inject(DialogService);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly field = viewChild<ElementRef<HTMLInputElement>>('field');
  protected value = '';

  constructor() {
    effect(() => {
      const request = this.dialogs.current();
      const dialog = this.dialog().nativeElement;
      if (request && !dialog.open) {
        this.value = request.type === 'prompt' ? (request.value ?? '') : '';
        dialog.returnValue = '';
        dialog.showModal();
        queueMicrotask(() => this.focusField(request.type === 'prompt' && !!request.selectBaseName));
      } else if (!request && dialog.open) {
        dialog.close();
      }
    });
  }

  protected onSubmit(event: SubmitEvent): void {
    const submitter = event.submitter as HTMLButtonElement | null;
    const request = this.dialogs.current();
    if (!request) {
      return;
    }
    if (submitter?.value !== 'ok') {
      this.dialogs.settle(null);
      return;
    }
    if (request.type === 'prompt') {
      const trimmed = this.value.trim();
      if (!trimmed) {
        event.preventDefault();
        return;
      }
      this.dialogs.settle(trimmed);
    } else {
      this.dialogs.settle(true);
    }
  }

  protected onClose(): void {
    this.dialogs.settle(null);
  }

  private focusField(selectBaseName: boolean): void {
    const input = this.field()?.nativeElement;
    if (!input) {
      return;
    }
    input.focus();
    const dot = input.value.lastIndexOf('.');
    if (selectBaseName && dot > 0) {
      input.setSelectionRange(0, dot);
    } else {
      input.select();
    }
  }
}
