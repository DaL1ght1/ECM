import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { DesktopWindow, WindowBounds, WindowManager } from './window-manager.service';

type Edge = 'e' | 's' | 'w' | 'se' | 'sw';

const INTERACTIVE = 'button, input, select, textarea, a, [role="button"], [data-no-drag]';
const KEY_STEP = 15;

@Component({
  selector: 'ecm-window',
  imports: [NgIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="glass fixed flex flex-col overflow-hidden text-ink shadow-[var(--shadow-window)] transition-[opacity,transform,border-radius] duration-200 ease-out animate-window-in"
      [class.rounded-xl]="!window().maximized"
      [class.opacity-0]="window().minimized"
      [class.pointer-events-none]="window().minimized"
      [style.transform]="window().minimized ? 'translateY(60vh) scale(0.15)' : null"
      [style.left.px]="bounds().x"
      [style.top.px]="bounds().y"
      [style.width.px]="bounds().width"
      [style.height.px]="bounds().height"
      [style.z-index]="window().z"
      [attr.aria-labelledby]="window().id + '-title'"
      [attr.aria-hidden]="window().minimized"
      [attr.inert]="window().minimized ? '' : null"
      role="region"
      (pointerdown)="wm.focus(window().id)">
      <header
        class="relative flex h-11 shrink-0 select-none items-center gap-2 border-b border-line bg-chrome px-3 [-webkit-user-select:none] [touch-action:none]"
        [class.cursor-grabbing]="dragging"
        tabindex="0"
        [attr.aria-label]="window().title + ' window. Use arrow keys to move it.'"
        (pointerdown)="startDrag($event)"
        (pointermove)="drag($event)"
        (lostpointercapture)="endDrag()"
        (dblclick)="onTitleDoubleClick($event)"
        (keydown)="onKey($event)">
        <div class="group flex items-center gap-2 pr-2">
          <button type="button" class="traffic bg-[#ff5f57]" [class.inactive]="!active()" aria-label="Close window" (click)="wm.close(window().id)">
            <ng-icon name="lucideX" size="9" strokeWidth="3" />
          </button>
          <button type="button" class="traffic bg-[#febc2e]" [class.inactive]="!active()" aria-label="Minimize window" (click)="wm.minimize(window().id)">
            <ng-icon name="lucideMinus" size="9" strokeWidth="3" />
          </button>
          <button type="button" class="traffic bg-[#28c840]" [class.inactive]="!active()" [attr.aria-label]="window().maximized ? 'Restore window' : 'Maximize window'" (click)="wm.toggleMaximize(window().id)">
            <ng-icon [name]="window().maximized ? 'lucideMinimize2' : 'lucideMaximize2'" size="8" strokeWidth="3" />
          </button>
        </div>
        <h2 [id]="window().id + '-title'" class="pointer-events-none flex min-w-0 items-center gap-1.5 text-[13px] font-semibold"
            [class.text-ink-faint]="!active()">
          <ng-icon [name]="window().icon" size="15" class="shrink-0 opacity-70" />
          <span class="truncate">{{ window().title }}</span>
        </h2>
        <div class="ml-auto flex min-w-0 items-center gap-1">
          <ng-content select="[toolbar]" />
        </div>
      </header>
      <div class="relative flex min-h-0 flex-1 flex-col">
        <ng-content />
      </div>
      @if (!window().maximized) {
        <div class="absolute inset-y-3 right-0 w-1.5 cursor-ew-resize" (pointerdown)="startResize($event, 'e')" (pointermove)="resize($event)"></div>
        <div class="absolute inset-y-3 left-0 w-1.5 cursor-ew-resize" (pointerdown)="startResize($event, 'w')" (pointermove)="resize($event)"></div>
        <div class="absolute inset-x-3 bottom-0 h-1.5 cursor-ns-resize" (pointerdown)="startResize($event, 's')" (pointermove)="resize($event)"></div>
        <div class="absolute bottom-0 right-0 size-3.5 cursor-nwse-resize" (pointerdown)="startResize($event, 'se')" (pointermove)="resize($event)"></div>
        <div class="absolute bottom-0 left-0 size-3.5 cursor-nesw-resize" (pointerdown)="startResize($event, 'sw')" (pointermove)="resize($event)"></div>
      }
    </section>
  `,
  styles: `
    .traffic {
      display: grid;
      place-items: center;
      width: 12px;
      height: 12px;
      border-radius: 999px;
      color: rgb(0 0 0 / 0.55);
      box-shadow: inset 0 0 0 0.5px rgb(0 0 0 / 0.18);
    }
    .traffic ng-icon {
      opacity: 0;
      transition: opacity 100ms;
    }
    .group:hover .traffic ng-icon,
    .traffic:focus-visible ng-icon {
      opacity: 1;
    }
    .traffic.inactive:not(:hover) {
      background: light-dark(#d4d6dc, #4a4d59);
    }
    .group:hover .traffic.inactive {
      background: revert-layer;
    }
  `,
})
export class WindowFrame {
  protected readonly wm = inject(WindowManager);
  readonly window = input.required<DesktopWindow>();

  protected readonly active = computed(() => this.wm.focusedId() === this.window().id);
  protected readonly bounds = computed<WindowBounds>(() => (this.window().maximized ? this.wm.workArea() : this.window()));

  protected dragging = false;
  private offsetX = 0;
  private offsetY = 0;
  private resizing: { edge: Edge; start: WindowBounds; pointerX: number; pointerY: number } | null = null;

  protected startDrag(event: PointerEvent): void {
    if (event.button !== 0 || (event.target as HTMLElement).closest(INTERACTIVE)) {
      return;
    }
    const window = this.window();
    const bounds = this.bounds();
    if (window.maximized) {
      const ratio = (event.clientX - bounds.x) / bounds.width;
      const restoredX = event.clientX - window.width * ratio;
      this.wm.toggleMaximize(window.id);
      this.wm.moveTo(window.id, restoredX, bounds.y);
      this.offsetX = window.width * ratio;
    } else {
      this.offsetX = event.clientX - bounds.x;
    }
    this.offsetY = event.clientY - bounds.y;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  protected drag(event: PointerEvent): void {
    const handle = event.currentTarget as HTMLElement;
    if (!handle.hasPointerCapture(event.pointerId)) {
      return;
    }
    this.dragging = true;
    this.wm.moveTo(this.window().id, event.clientX - this.offsetX, event.clientY - this.offsetY);
  }

  protected endDrag(): void {
    this.dragging = false;
  }

  protected onTitleDoubleClick(event: MouseEvent): void {
    if (!(event.target as HTMLElement).closest(INTERACTIVE)) {
      this.wm.toggleMaximize(this.window().id);
    }
  }

  protected onKey(event: KeyboardEvent): void {
    if (event.target !== event.currentTarget || this.window().maximized) {
      return;
    }
    const step = event.shiftKey ? KEY_STEP * 4 : KEY_STEP;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const move = moves[event.key];
    if (move) {
      event.preventDefault();
      const { x, y } = this.window();
      this.wm.moveTo(this.window().id, x + move[0], y + move[1]);
    }
  }

  protected startResize(event: PointerEvent, edge: Edge): void {
    if (event.button !== 0) {
      return;
    }
    event.stopPropagation();
    const { x, y, width, height } = this.window();
    this.resizing = { edge, start: { x, y, width, height }, pointerX: event.clientX, pointerY: event.clientY };
    const handle = event.currentTarget as HTMLElement;
    handle.setPointerCapture(event.pointerId);
    handle.addEventListener('lostpointercapture', () => (this.resizing = null), { once: true });
  }

  protected resize(event: PointerEvent): void {
    if (!this.resizing || !(event.currentTarget as HTMLElement).hasPointerCapture(event.pointerId)) {
      return;
    }
    const { edge, start, pointerX, pointerY } = this.resizing;
    const dx = event.clientX - pointerX;
    const dy = event.clientY - pointerY;
    const next = { ...start };
    if (edge.includes('e')) {
      next.width = start.width + dx;
    }
    if (edge.includes('w')) {
      next.width = Math.max(360, start.width - dx);
      next.x = start.x + (start.width - next.width);
    }
    if (edge.includes('s')) {
      next.height = start.height + dy;
    }
    this.wm.resizeTo(this.window().id, next);
  }
}
