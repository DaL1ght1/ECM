import { ChangeDetectionStrategy, Component, ElementRef, effect, inject, viewChild } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { ContextMenuService, MenuAction } from './context-menu.service';

@Component({
  selector: 'ecm-context-menu-host',
  imports: [NgIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div #panel popover="auto" class="fixed" (toggle)="onToggle($event)" (keydown)="onKeydown($event)">
      @if (menus.current(); as menu) {
        <div class="glass-strong menu-panel" role="presentation">
          @for (entry of menu.items; track $index) {
            @if (entry === 'separator') {
              <hr class="menu-separator" />
            } @else {
              <button type="button" class="menu-item" [class.danger]="entry.danger" [disabled]="entry.disabled"
                      (click)="run(entry)">
                <span class="grid w-4 place-items-center">
                  @if (entry.checked) {
                    <ng-icon name="lucideCheck" size="14" />
                  } @else if (entry.icon) {
                    <ng-icon [name]="entry.icon" size="14" />
                  }
                </span>
                <span class="flex-1 truncate">{{ entry.label }}</span>
                @if (entry.shortcut) {
                  <span class="text-[11px] opacity-60">{{ entry.shortcut }}</span>
                }
              </button>
            }
          }
        </div>
      }
    </div>
  `,
})
export class ContextMenuHost {
  protected readonly menus = inject(ContextMenuService);
  private readonly panel = viewChild.required<ElementRef<HTMLElement>>('panel');

  constructor() {
    effect(() => {
      const menu = this.menus.current();
      const panel = this.panel().nativeElement;
      if (!menu) {
        if (panel.matches(':popover-open')) {
          panel.hidePopover();
        }
        return;
      }
      panel.style.left = '0px';
      panel.style.top = '0px';
      if (!panel.matches(':popover-open')) {
        panel.showPopover();
      }
      requestAnimationFrame(() => {
        const width = panel.offsetWidth;
        const height = panel.offsetHeight;
        const x = Math.max(6, Math.min(menu.x, window.innerWidth - width - 6));
        const y = menu.y + height > window.innerHeight - 6 ? Math.max(6, menu.y - height) : menu.y;
        panel.style.left = `${x}px`;
        panel.style.top = `${y}px`;
        if (menu.fromKeyboard) {
          this.buttons()[0]?.focus();
        }
      });
    });
  }

  protected run(entry: MenuAction): void {
    this.menus.close();
    entry.action();
  }

  protected onToggle(event: Event): void {
    if ((event as ToggleEvent).newState === 'closed' && this.menus.current()) {
      this.menus.close();
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    const buttons = this.buttons();
    if (!buttons.length) {
      return;
    }
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    let next = -1;
    if (event.key === 'ArrowDown') next = (index + 1) % buttons.length;
    else if (event.key === 'ArrowUp') next = (index - 1 + buttons.length) % buttons.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = buttons.length - 1;
    if (next >= 0) {
      event.preventDefault();
      buttons[next].focus();
    }
  }

  private buttons(): HTMLButtonElement[] {
    return Array.from(this.panel().nativeElement.querySelectorAll<HTMLButtonElement>('button.menu-item:not(:disabled)'));
  }
}
