import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { AuthService } from '../core/auth/auth.service';
import { ContextMenuService, MenuEntry } from '../shared/context-menu.service';
import { initials } from '../shared/format';
import { Launcher } from './launcher.service';
import { AppKind, WindowManager } from './window-manager.service';

const APP_NAMES: Record<AppKind, string> = {
  files: 'Files',
  viewer: 'Viewer',
  trash: 'Trash',
  admin: 'Users',
  settings: 'Settings',
};

@Component({
  selector: 'ecm-menu-bar',
  imports: [NgIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'fixed inset-x-0 top-0 z-[9000] block' },
  template: `
    <nav class="glass flex h-[30px] items-center gap-0.5 border-b border-line px-2 text-[13px]" aria-label="Menu bar">
      <button type="button" class="bar-item gap-1.5 font-bold" aria-label="ECM menu" (click)="openApple($event)">
        <span class="grid size-[18px] place-items-center rounded-[5px] bg-gradient-to-br from-[#6f93ff] to-[#8e4ec6] text-[10px] font-black text-white">E</span>
      </button>
      <span class="bar-item pointer-events-none font-semibold">{{ appName() }}</span>
      <button type="button" class="bar-item" (click)="openFile($event)">File</button>
      <button type="button" class="bar-item" (click)="openGo($event)">Go</button>
      <button type="button" class="bar-item" (click)="openWindow($event)">Window</button>

      <div class="ml-auto flex items-center gap-0.5">
        <button type="button" class="bar-item" aria-label="Search (Ctrl+K)" title="Search  ⌘K" (click)="launcher.toggleSpotlight()">
          <ng-icon name="lucideSearch" size="14" />
        </button>
        <span class="bar-item pointer-events-none tabular-nums" aria-live="off">{{ clock() }}</span>
        <button type="button" class="bar-item gap-1.5" aria-label="Account menu" (click)="openAccount($event)">
          <span class="grid size-[18px] place-items-center rounded-full bg-accent text-[9px] font-bold text-white">{{ avatar() }}</span>
        </button>
      </div>
    </nav>
  `,
  styles: `
    .bar-item {
      display: inline-flex;
      align-items: center;
      height: 22px;
      padding: 0 0.55rem;
      border-radius: 5px;
      color: var(--color-ink);
      white-space: nowrap;
    }
    button.bar-item:hover,
    button.bar-item:focus-visible {
      outline: none;
      background: var(--color-pressed);
    }
  `,
})
export class MenuBar {
  private readonly wm = inject(WindowManager);
  protected readonly launcher = inject(Launcher);
  private readonly auth = inject(AuthService);
  private readonly menus = inject(ContextMenuService);

  private readonly now = signal(new Date());
  private readonly clockFormat = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  protected readonly clock = computed(() => this.clockFormat.format(this.now()));
  protected readonly appName = computed(() => APP_NAMES[this.wm.focused()?.kind ?? 'files'] ?? 'Files');
  protected readonly avatar = computed(() => initials(this.auth.user()?.name));

  constructor() {
    const timer = setInterval(() => this.now.set(new Date()), 10_000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  protected openApple(event: MouseEvent): void {
    this.show(event, [
      { label: 'About ECM', icon: 'lucideInfo', action: () => this.launcher.settings() },
      'separator',
      { label: 'Settings…', icon: 'lucideSettings2', shortcut: 'Ctrl ,', action: () => this.launcher.settings() },
      ...(this.auth.isAdmin() ? [{ label: 'Users…', icon: 'lucideUsers', action: () => this.launcher.admin() } as MenuEntry] : []),
      'separator',
      { label: 'Sign Out', icon: 'lucideLogOut', action: () => void this.auth.logout() },
    ]);
  }

  protected openFile(event: MouseEvent): void {
    this.show(event, [
      { label: 'New Window', icon: 'lucideAppWindow', action: () => this.launcher.files() },
      { label: 'New Folder', icon: 'lucideFolderPlus', action: () => this.sendToFiles('new-folder') },
      { label: 'Upload Files…', icon: 'lucideUpload', action: () => this.sendToFiles('upload') },
      'separator',
      { label: 'Close Window', icon: 'lucideX', disabled: !this.wm.focused(), action: () => this.closeFocused() },
    ]);
  }

  protected openGo(event: MouseEvent): void {
    this.show(event, [
      { label: 'Home', icon: 'lucideHouse', action: () => this.launcher.files() },
      { label: 'Shared with me', icon: 'lucideUsersRound', action: () => this.launcher.files({ type: 'shared' }) },
      { label: 'Trash', icon: 'lucideTrash2', action: () => this.launcher.trash() },
      'separator',
      { label: 'Search…', icon: 'lucideSearch', shortcut: 'Ctrl K', action: () => this.launcher.toggleSpotlight(true) },
    ]);
  }

  protected openWindow(event: MouseEvent): void {
    const windows = [...this.wm.windows()].sort((a, b) => a.title.localeCompare(b.title));
    this.show(event, [
      { label: 'Minimize All', icon: 'lucideMinimize2', disabled: !windows.length, action: () => this.wm.minimizeAll() },
      { label: 'Close All', icon: 'lucideX', disabled: !windows.length, action: () => this.wm.closeAll() },
      ...(windows.length ? ['separator' as const] : []),
      ...windows.map((window) => ({
        label: window.title,
        icon: window.icon,
        checked: window.id === this.wm.focusedId(),
        action: () => this.wm.focus(window.id),
      })),
    ]);
  }

  protected openAccount(event: MouseEvent): void {
    const user = this.auth.user();
    this.show(event, [
      { label: user?.name ?? 'Signed in', icon: 'lucideUserRound', disabled: true, action: () => undefined },
      { label: user?.email ?? '', icon: 'lucideMail', disabled: true, action: () => undefined },
      'separator',
      { label: 'Settings…', icon: 'lucideSettings2', action: () => this.launcher.settings() },
      { label: 'Sign Out', icon: 'lucideLogOut', danger: true, action: () => void this.auth.logout() },
    ]);
  }

  private sendToFiles(command: string): void {
    if (!this.wm.send(command)) {
      const id = this.launcher.files();
      setTimeout(() => this.wm.commands.next({ windowId: id, command }));
    }
  }

  private closeFocused(): void {
    const focused = this.wm.focused();
    if (focused) {
      this.wm.close(focused.id);
    }
  }

  private show(event: MouseEvent, items: MenuEntry[]): void {
    event.stopPropagation();
    this.menus.openBelow(event.currentTarget as HTMLElement, items, event.detail === 0);
  }
}
