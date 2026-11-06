import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { EcmApi } from '../../core/api/ecm-api';
import { errorMessage } from '../../core/api/errors';
import { ASSIGNABLE_ROLES, UserDto } from '../../core/api/models';
import { AuthService } from '../../core/auth/auth.service';
import { WindowFrame } from '../../desktop/window-frame';
import { DesktopWindow } from '../../desktop/window-manager.service';
import { DialogService } from '../../shared/dialog.service';
import { initials } from '../../shared/format';
import { ToastService } from '../../shared/toast.service';

@Component({
  selector: 'ecm-admin-app',
  imports: [WindowFrame, NgIcon, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <ecm-window [window]="window()">
      <div toolbar class="flex items-center gap-1">
        <div class="flex rounded-lg bg-hover p-0.5" role="tablist" aria-label="User lists">
          <button type="button" role="tab" class="tab" [attr.aria-selected]="tab() === 'pending'" (click)="tab.set('pending')">
            Pending @if (pending().length) { <span class="badge badge-accent ml-1 h-4 px-1.5">{{ pending().length }}</span> }
          </button>
          <button type="button" role="tab" class="tab" [attr.aria-selected]="tab() === 'all'" (click)="tab.set('all')">All Users</button>
        </div>
        <button type="button" class="icon-btn" aria-label="Refresh" title="Refresh" (click)="load()"><ng-icon name="lucideRefreshCw" size="16" /></button>
        <button type="button" class="btn h-7 text-[12px]" title="Rebuild the search index from the database" (click)="reindex()">
          <ng-icon name="lucideDatabaseZap" size="13" /> Rebuild Search Index
        </button>
      </div>

      <div class="flex min-h-0 flex-1 flex-col bg-pane">
        <div class="flex shrink-0 items-center gap-2 border-b border-line px-4 py-2">
          <input class="field h-7 max-w-64 text-[12px]" type="search" placeholder="Filter by name or email" aria-label="Filter users"
                 [value]="query()" (input)="query.set($any($event.target).value)" />
          <span class="ml-auto text-[11.5px] text-ink-faint">{{ visible().length }} user{{ visible().length === 1 ? '' : 's' }}</span>
        </div>
        <div class="min-h-0 flex-1 overflow-auto">
          @for (user of visible(); track user.id) {
            <div class="flex items-center gap-3 border-b border-line px-4 py-2.5 hover:bg-hover">
              <span class="grid size-8 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white"
                    [style.background]="user.accountLocked && user.enabled ? '#7c8496' : 'var(--color-accent)'">{{ initialsOf(user) }}</span>
              <div class="min-w-0 flex-1">
                <p class="flex items-center gap-2 truncate font-medium">
                  {{ fullName(user) }}
                  @if (user.enabled && user.accountLocked) { <span class="badge bg-danger-soft text-danger">Banned</span> }
                  @if (!user.enabled && user.accountLocked) { <span class="badge">Email not verified</span> }
                  @if (user.uuid === me()) { <span class="badge badge-accent">You</span> }
                </p>
                <p class="truncate text-[11.5px] text-ink-faint">{{ user.email }}{{ user.phone ? ' · ' + user.phone : '' }}</p>
              </div>
              @if (tab() === 'pending') {
                <select class="field h-7 w-32 px-2 text-[12px]" aria-label="Role to assign" [(ngModel)]="roleFor[user.id]">
                  @for (role of roles; track role) { <option [value]="role">{{ role }}</option> }
                </select>
                <button type="button" class="btn btn-primary h-7 text-[12px]" (click)="approve(user)">Approve</button>
                <button type="button" class="btn h-7 text-[12px]" (click)="decline(user)">Decline</button>
              } @else {
                <select class="field h-7 w-32 px-2 text-[12px]" [attr.aria-label]="'Role for ' + user.email"
                        [disabled]="user.uuid === me()" [ngModel]="user.role" (ngModelChange)="changeRole(user, $event)">
                  @for (role of roles; track role) { <option [value]="role">{{ role }}</option> }
                </select>
                <button type="button" class="btn h-7 text-[12px]" [disabled]="user.uuid === me()" (click)="toggleBan(user)">
                  {{ user.accountLocked ? 'Unban' : 'Ban' }}
                </button>
                <button type="button" class="icon-btn text-danger" [attr.aria-label]="'Delete ' + user.email" [disabled]="user.uuid === me()" (click)="remove(user)">
                  <ng-icon name="lucideUserX" size="15" />
                </button>
              }
            </div>
          } @empty {
            <div class="grid h-full place-items-center p-10 text-center">
              <div class="flex flex-col items-center gap-3">
                <span class="grid size-16 place-items-center rounded-2xl bg-hover text-ink-faint"><ng-icon name="lucideUserCheck" size="30" /></span>
                <p class="font-semibold">{{ tab() === 'pending' ? 'No one is waiting for approval' : 'No users match' }}</p>
              </div>
            </div>
          }
        </div>
      </div>
    </ecm-window>
  `,
  styles: `
    .tab {
      display: inline-flex;
      align-items: center;
      height: 1.6rem;
      padding: 0 0.7rem;
      border-radius: 0.4rem;
      font-size: 12px;
      font-weight: 500;
      color: var(--color-ink-soft);
    }
    .tab[aria-selected="true"] {
      background: var(--color-glass-strong);
      color: var(--color-ink);
      box-shadow: 0 1px 2px rgb(0 0 0 / 0.12);
    }
  `,
})
export class AdminApp {
  private readonly api = inject(EcmApi);
  private readonly dialogs = inject(DialogService);
  private readonly toasts = inject(ToastService);
  private readonly auth = inject(AuthService);

  readonly window = input.required<DesktopWindow>();
  protected readonly roles = ASSIGNABLE_ROLES;
  protected readonly tab = signal<'pending' | 'all'>('pending');
  protected readonly query = signal('');
  protected readonly pending = signal<UserDto[]>([]);
  protected readonly users = signal<UserDto[]>([]);
  protected readonly me = computed(() => this.auth.user()?.id);
  protected roleFor: Record<number, string> = {};

  protected readonly visible = computed(() => {
    const query = this.query().trim().toLowerCase();
    const list = this.tab() === 'pending' ? this.pending() : this.users().filter((user) => user.enabled);
    return query ? list.filter((user) => `${this.fullName(user)} ${user.email}`.toLowerCase().includes(query)) : list;
  });

  constructor() {
    void this.load();
  }

  protected async load(): Promise<void> {
    try {
      const [pending, users] = await Promise.all([this.api.pendingUsers(), this.api.allUsers()]);
      this.pending.set(pending);
      this.users.set(users);
      for (const user of pending) {
        this.roleFor[user.id] ??= 'USER';
      }
      if (!pending.length && this.tab() === 'pending' && users.length) {
        this.tab.set('all');
      }
    } catch (error) {
      this.toasts.error('Could not load users', errorMessage(error));
    }
  }

  protected async approve(user: UserDto): Promise<void> {
    await this.run(() => this.api.approveUser(user.id, this.roleFor[user.id] ?? 'USER'), `Approved ${user.email}`);
  }

  protected async decline(user: UserDto): Promise<void> {
    if (await this.dialogs.confirm({ title: `Decline ${user.email}?`, message: 'The registration is deleted and the person is notified by email.', confirmText: 'Decline', danger: true })) {
      await this.run(() => this.api.declineUser(user.id), `Declined ${user.email}`);
    }
  }

  protected async changeRole(user: UserDto, role: string): Promise<void> {
    await this.run(() => this.api.updateRole(user.id, role), `${user.email} is now ${role}`);
  }

  protected async toggleBan(user: UserDto): Promise<void> {
    await this.run(() => this.api.toggleBan(user.id), user.accountLocked ? `Unbanned ${user.email}` : `Banned ${user.email}`);
  }

  protected async remove(user: UserDto): Promise<void> {
    if (await this.dialogs.confirm({ title: `Delete ${user.email}?`, message: 'The account is permanently removed.', confirmText: 'Delete', danger: true })) {
      await this.run(() => this.api.deleteUser(user.id), `Deleted ${user.email}`);
    }
  }

  protected async reindex(): Promise<void> {
    await this.run(() => this.api.rebuildSearchIndex(), 'Rebuilding the search index', 'It runs in the background and can take a few minutes.');
  }

  protected fullName(user: UserDto): string {
    return [user.name, user.lastName].filter(Boolean).join(' ') || user.email;
  }

  protected initialsOf(user: UserDto): string {
    return initials(this.fullName(user));
  }

  private async run(action: () => Promise<unknown>, success: string, detail?: string): Promise<void> {
    try {
      await action();
      this.toasts.success(success, detail);
    } catch (error) {
      this.toasts.error('Action failed', errorMessage(error));
    } finally {
      await this.load();
    }
  }
}
