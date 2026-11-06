import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { AdminApp } from '../apps/admin/admin-app';
import { FilesApp } from '../apps/files/files-app';
import { Spotlight } from '../apps/search/spotlight';
import { SettingsApp } from '../apps/settings/settings-app';
import { TrashApp } from '../apps/trash/trash-app';
import { ViewerApp } from '../apps/viewer/viewer-app';
import { AuthService } from '../core/auth/auth.service';
import { AppearanceService } from '../shared/appearance.service';
import { ContextMenuHost } from '../shared/context-menu-host';
import { ContextMenuService } from '../shared/context-menu.service';
import { DialogHost } from '../shared/dialog-host';
import { FileIcon } from '../shared/file-icon';
import { Dock } from './dock';
import { Launcher } from './launcher.service';
import { MenuBar } from './menu-bar';
import { Toasts } from './toasts';
import { WindowManager } from './window-manager.service';

interface DesktopIcon {
  id: string;
  label: string;
  open: () => void;
}

@Component({
  selector: 'ecm-desktop',
  imports: [MenuBar, Dock, Toasts, Spotlight, ContextMenuHost, DialogHost, FilesApp, ViewerApp, TrashApp, AdminApp, SettingsApp, FileIcon, NgIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="wallpaper fixed inset-0" [attr.data-wallpaper]="appearance.wallpaper()"
         (contextmenu)="desktopMenu($event)" (pointerdown)="selectedIcon.set(null)"></div>

    <ul class="fixed right-4 top-12 flex flex-col items-center gap-3" aria-label="Desktop">
      @for (icon of icons; track icon.id) {
        <li>
          <button type="button" class="desktop-icon" [class.selected]="selectedIcon() === icon.id"
                  (click)="selectedIcon.set(icon.id)" (dblclick)="icon.open()" (keydown.enter)="icon.open()">
            @if (icon.id === 'trash') {
              <span class="grid size-14 place-items-center rounded-2xl bg-gradient-to-b from-[#c4cad6] to-[#7f8899] text-white shadow-lg">
                <ng-icon name="lucideTrash2" size="28" />
              </span>
            } @else {
              <ecm-file-icon [folder]="true" [shared]="icon.id === 'shared'" [size]="58" />
            }
            <span class="desktop-label">{{ icon.label }}</span>
          </button>
        </li>
      }
    </ul>

    @for (window of wm.windows(); track window.id) {
      @switch (window.kind) {
        @case ('files') { <ecm-files-app [window]="window" /> }
        @case ('viewer') { <ecm-viewer-app [window]="window" /> }
        @case ('trash') { <ecm-trash-app [window]="window" /> }
        @case ('admin') { <ecm-admin-app [window]="window" /> }
        @case ('settings') { <ecm-settings-app [window]="window" /> }
      }
    }

    <ecm-menu-bar />
    <ecm-dock />
    <ecm-toasts />
    <ecm-spotlight />
    <ecm-context-menu-host />
    <ecm-dialog-host />
  `,
  styles: `
    .desktop-icon {
      display: flex;
      width: 6rem;
      flex-direction: column;
      align-items: center;
      gap: 0.3rem;
      padding: 0.4rem;
      border-radius: 0.6rem;
    }
    .desktop-icon.selected {
      background: rgb(255 255 255 / 0.18);
    }
    .desktop-label {
      padding: 0.05rem 0.4rem;
      border-radius: 0.3rem;
      font-size: 12px;
      font-weight: 600;
      color: white;
      text-shadow: 0 1px 3px rgb(0 0 0 / 0.6);
    }
    .desktop-icon.selected .desktop-label {
      background: var(--color-accent);
      text-shadow: none;
    }
  `,
})
export class Desktop {
  protected readonly wm = inject(WindowManager);
  protected readonly appearance = inject(AppearanceService);
  private readonly launcher = inject(Launcher);
  private readonly menus = inject(ContextMenuService);
  private readonly auth = inject(AuthService);

  protected readonly selectedIcon = signal<string | null>(null);
  protected readonly icons: DesktopIcon[] = [
    { id: 'home', label: 'Home', open: () => this.launcher.files() },
    { id: 'shared', label: 'Shared', open: () => this.launcher.files({ type: 'shared' }) },
    { id: 'trash', label: 'Trash', open: () => this.launcher.trash() },
  ];

  constructor() {
    this.onResize();
    if (!this.wm.windows().length) {
      this.launcher.files();
    }
  }

  @HostListener('window:resize')
  protected onResize(): void {
    this.wm.setViewport(window.innerWidth, window.innerHeight);
  }

  @HostListener('document:keydown', ['$event'])
  protected onKeydown(event: KeyboardEvent): void {
    const modifier = event.ctrlKey || event.metaKey;
    if (modifier && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.launcher.toggleSpotlight();
    } else if (modifier && event.key === ',') {
      event.preventDefault();
      this.launcher.settings();
    }
  }

  protected desktopMenu(event: MouseEvent): void {
    this.menus.openAt(event, [
      { label: 'New Files Window', icon: 'lucideAppWindow', action: () => this.launcher.files() },
      { label: 'Search…', icon: 'lucideSearch', shortcut: 'Ctrl K', action: () => this.launcher.toggleSpotlight(true) },
      'separator',
      { label: 'Change Wallpaper…', icon: 'lucideImage', action: () => this.launcher.settings() },
      ...(this.auth.isAdmin() ? [{ label: 'Manage Users…', icon: 'lucideUsers', action: () => this.launcher.admin() }] : []),
    ]);
  }
}
