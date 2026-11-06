import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { AuthService } from '../core/auth/auth.service';
import { Launcher } from './launcher.service';
import { AppKind, DesktopWindow, WindowManager } from './window-manager.service';

interface DockApp {
  kind: AppKind | 'search';
  label: string;
  icon: string;
  gradient: string;
  launch: () => void;
}

@Component({
  selector: 'ecm-dock',
  imports: [NgIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'pointer-events-none fixed inset-x-0 bottom-3 z-[8000] flex justify-center' },
  template: `
    <nav class="glass pointer-events-auto flex items-end gap-1.5 rounded-[22px] border border-line px-2.5 pb-2 pt-2 shadow-[var(--shadow-float)]"
         aria-label="Dock">
      @for (app of apps(); track app.kind) {
        <button type="button" class="dock-item" [attr.aria-label]="app.label" (click)="activate(app)">
          <span class="dock-tile" [style.background]="app.gradient">
            <ng-icon [name]="app.icon" size="26" strokeWidth="1.75" />
          </span>
          <span class="dock-label">{{ app.label }}</span>
          <span class="dock-dot" [class.running]="isRunning(app)"></span>
        </button>
      }
      @if (wm.minimized().length) {
        <span class="mx-1 mb-2 h-10 w-px self-center bg-line-strong"></span>
        @for (window of wm.minimized(); track window.id) {
          <button type="button" class="dock-item" [attr.aria-label]="'Restore ' + window.title" (click)="wm.focus(window.id)">
            <span class="dock-tile glass-strong border border-line text-ink-soft">
              <ng-icon [name]="window.icon" size="22" />
            </span>
            <span class="dock-label">{{ window.title }}</span>
            <span class="dock-dot"></span>
          </button>
        }
      }
    </nav>
  `,
  styles: `
    .dock-item {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
      transition: transform 160ms cubic-bezier(0.2, 0.8, 0.3, 1.3);
      transform-origin: bottom center;
    }
    .dock-item:hover,
    .dock-item:focus-visible {
      outline: none;
      transform: translateY(-8px) scale(1.22);
    }
    .dock-item:hover + .dock-item,
    .dock-item:has(+ .dock-item:hover) {
      transform: translateY(-3px) scale(1.08);
    }
    .dock-tile {
      display: grid;
      place-items: center;
      width: 46px;
      height: 46px;
      border-radius: 13px;
      color: white;
      box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.25), 0 4px 10px -2px rgb(0 0 0 / 0.3);
    }
    .dock-dot {
      width: 4px;
      height: 4px;
      border-radius: 999px;
      background: var(--color-ink);
      opacity: 0;
    }
    .dock-dot.running {
      opacity: 0.7;
    }
    .dock-label {
      position: absolute;
      bottom: calc(100% + 10px);
      padding: 3px 9px;
      border-radius: 7px;
      font-size: 11.5px;
      white-space: nowrap;
      color: var(--color-ink);
      background: var(--color-glass-strong);
      box-shadow: var(--shadow-float);
      opacity: 0;
      pointer-events: none;
      transition: opacity 120ms;
      transform: scale(0.82);
    }
    .dock-item:hover .dock-label,
    .dock-item:focus-visible .dock-label {
      opacity: 1;
    }
  `,
})
export class Dock {
  protected readonly wm = inject(WindowManager);
  private readonly launcher = inject(Launcher);
  private readonly auth = inject(AuthService);

  protected readonly apps = computed<DockApp[]>(() => [
    { kind: 'files', label: 'Files', icon: 'lucideFolderOpen', gradient: 'linear-gradient(160deg, #6fa2ff, #3c63e8)', launch: () => this.launcher.files() },
    { kind: 'search', label: 'Search', icon: 'lucideSearch', gradient: 'linear-gradient(160deg, #b388ff, #6d3fd8)', launch: () => this.launcher.toggleSpotlight(true) },
    { kind: 'trash', label: 'Trash', icon: 'lucideTrash2', gradient: 'linear-gradient(160deg, #9aa3b5, #5d6577)', launch: () => this.launcher.trash() },
    ...(this.auth.isAdmin()
      ? [{ kind: 'admin' as const, label: 'Users', icon: 'lucideUsers', gradient: 'linear-gradient(160deg, #52d6a4, #11906a)', launch: () => this.launcher.admin() }]
      : []),
    { kind: 'settings', label: 'Settings', icon: 'lucideSettings2', gradient: 'linear-gradient(160deg, #ffb86b, #e0711c)', launch: () => this.launcher.settings() },
  ]);

  protected isRunning(app: DockApp): boolean {
    return app.kind === 'search' ? this.launcher.spotlightOpen() : this.wm.ofKind(app.kind).length > 0;
  }

  protected activate(app: DockApp): void {
    if (app.kind === 'search') {
      app.launch();
      return;
    }
    const windows: DesktopWindow[] = this.wm.ofKind(app.kind).sort((a, b) => b.z - a.z);
    if (windows.length) {
      this.wm.focus(windows[0].id);
    } else {
      app.launch();
    }
  }
}
