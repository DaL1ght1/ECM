import { ChangeDetectionStrategy, Component, ElementRef, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { EcmApi } from '../../core/api/ecm-api';
import { errorMessage } from '../../core/api/errors';
import { AccessLevel, ASSIGNABLE_ROLES, FolderDto, Permission, UserSummary } from '../../core/api/models';
import { initials } from '../../shared/format';
import { ToastService } from '../../shared/toast.service';

@Component({
  selector: 'ecm-share-dialog',
  imports: [FormsModule, NgIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog #dialog closedby="any" aria-labelledby="share-title" (close)="closed.emit()"
            class="glass-strong m-auto w-[min(30rem,calc(100vw-2rem))] rounded-2xl p-0 text-ink shadow-[var(--shadow-window)] open:animate-pop-in">
      <div class="flex flex-col gap-4 p-5">
        <header class="flex items-start gap-3">
          <span class="grid size-9 place-items-center rounded-xl bg-accent-soft text-accent"><ng-icon name="lucideUsersRound" size="18" /></span>
          <div class="min-w-0">
            <h2 id="share-title" class="text-[15px] font-semibold">Share “{{ folder().name }}”</h2>
            <p class="text-[12px] text-ink-soft">People and roles listed here can open everything inside this folder.</p>
          </div>
        </header>

        <form class="flex gap-2" (ngSubmit)="add()">
          <select class="field w-24 shrink-0 px-2" name="type" [(ngModel)]="newType" aria-label="Share with">
            <option value="ROLE">Role</option>
            <option value="USER">Person</option>
          </select>
          @if (newType === 'ROLE') {
            <select class="field flex-1 px-2" name="role" [(ngModel)]="newRole" aria-label="Role">
              @for (role of roles; track role) {
                <option [value]="role">{{ role }}</option>
              }
            </select>
          } @else {
            <div class="relative flex-1">
              <input class="field" name="person" placeholder="Name or email" autocomplete="off" aria-label="Person"
                     [ngModel]="personQuery()" (ngModelChange)="searchPeople($event)" />
              @if (people().length) {
                <ul class="glass-strong absolute inset-x-0 top-full z-10 mt-1 max-h-48 overflow-auto rounded-lg p-1 shadow-[var(--shadow-float)]">
                  @for (person of people(); track person.id) {
                    <li>
                      <button type="button" class="menu-item h-auto py-1.5" (click)="pick(person)">
                        <span class="avatar">{{ initialsOf(person.name) }}</span>
                        <span class="min-w-0 flex-1">
                          <span class="block truncate">{{ person.name }}</span>
                          <span class="block truncate text-[11px] opacity-70">{{ person.email }}</span>
                        </span>
                      </button>
                    </li>
                  }
                </ul>
              }
            </div>
          }
          <select class="field w-24 shrink-0 px-2" name="access" [(ngModel)]="newAccess" aria-label="Access">
            <option value="READ">Can view</option>
            <option value="WRITE">Can edit</option>
          </select>
          <button type="submit" class="btn btn-primary" [disabled]="newType === 'USER' && !picked()">Add</button>
        </form>

        <ul class="flex max-h-64 flex-col gap-1 overflow-auto">
          <li class="flex items-center gap-3 rounded-lg px-2 py-1.5">
            <span class="avatar">{{ initialsOf(folder().owner.name) }}</span>
            <span class="min-w-0 flex-1">
              <span class="block truncate font-medium">{{ folder().owner.name }}</span>
              <span class="block truncate text-[11px] text-ink-faint">{{ folder().owner.email }}</span>
            </span>
            <span class="badge">Owner</span>
          </li>
          @for (permission of permissions(); track permission.principalType + permission.principal; let i = $index) {
            <li class="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-hover">
              @if (permission.principalType === 'ROLE') {
                <span class="avatar bg-[#8e4ec6]"><ng-icon name="lucideShield" size="13" /></span>
              } @else {
                <span class="avatar">{{ initialsOf(permission.displayName) }}</span>
              }
              <span class="min-w-0 flex-1 truncate">
                {{ permission.principalType === 'ROLE' ? 'Everyone with role ' + permission.principal : permission.displayName }}
              </span>
              <select class="field h-7 w-24 px-2 text-[12px]" [ngModel]="permission.access" (ngModelChange)="setAccess(i, $event)"
                      [attr.aria-label]="'Access for ' + (permission.displayName ?? permission.principal)">
                <option value="READ">Can view</option>
                <option value="WRITE">Can edit</option>
              </select>
              <button type="button" class="icon-btn" [attr.aria-label]="'Remove ' + (permission.displayName ?? permission.principal)" (click)="remove(i)">
                <ng-icon name="lucideX" size="14" />
              </button>
            </li>
          }
        </ul>

        <footer class="flex justify-end gap-2">
          <button type="button" class="btn" (click)="dialog.close()">Cancel</button>
          <button type="button" class="btn btn-primary" [disabled]="saving()" (click)="save()">Save</button>
        </footer>
      </div>
    </dialog>
  `,
  styles: `
    .avatar {
      display: grid;
      place-items: center;
      flex-shrink: 0;
      width: 28px;
      height: 28px;
      border-radius: 999px;
      font-size: 10px;
      font-weight: 700;
      color: white;
      background: var(--color-accent);
    }
  `,
})
export class ShareDialog {
  private readonly api = inject(EcmApi);
  private readonly toasts = inject(ToastService);

  readonly folder = input.required<FolderDto>();
  readonly closed = output<void>();
  protected readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  protected readonly roles = ASSIGNABLE_ROLES;
  protected readonly permissions = signal<Permission[]>([]);
  protected readonly people = signal<UserSummary[]>([]);
  protected readonly personQuery = signal('');
  protected readonly picked = signal<UserSummary | null>(null);
  protected readonly saving = signal(false);
  protected newType: 'ROLE' | 'USER' = 'ROLE';
  protected newRole: string = 'USER';
  protected newAccess: AccessLevel = 'READ';
  private searchTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    effect(() => {
      const folder = this.folder();
      queueMicrotask(() => this.dialog().nativeElement.showModal());
      this.api.permissions(folder.id).then(
        (permissions) => this.permissions.set(permissions),
        (error) => {
          this.toasts.error('Could not load sharing settings', errorMessage(error));
          this.dialog().nativeElement.close();
        },
      );
    });
  }

  protected searchPeople(query: string): void {
    this.personQuery.set(query);
    this.picked.set(null);
    clearTimeout(this.searchTimer);
    if (query.trim().length < 2) {
      this.people.set([]);
      return;
    }
    this.searchTimer = setTimeout(async () => {
      try {
        this.people.set(await this.api.userDirectory(query.trim()));
      } catch {
        this.people.set([]);
      }
    }, 200);
  }

  protected pick(person: UserSummary): void {
    this.picked.set(person);
    this.personQuery.set(person.name);
    this.people.set([]);
  }

  protected add(): void {
    const entry: Permission = this.newType === 'ROLE'
      ? { principalType: 'ROLE', principal: this.newRole, access: this.newAccess, displayName: this.newRole }
      : { principalType: 'USER', principal: this.picked()!.id, access: this.newAccess, displayName: this.picked()!.name };
    this.permissions.update((permissions) => [
      ...permissions.filter((p) => !(p.principalType === entry.principalType && p.principal === entry.principal)),
      entry,
    ]);
    this.picked.set(null);
    this.personQuery.set('');
  }

  protected setAccess(index: number, access: AccessLevel): void {
    this.permissions.update((permissions) => permissions.map((p, i) => (i === index ? { ...p, access } : p)));
  }

  protected remove(index: number): void {
    this.permissions.update((permissions) => permissions.filter((_, i) => i !== index));
  }

  protected async save(): Promise<void> {
    this.saving.set(true);
    try {
      const payload = this.permissions().map(({ principalType, principal, access }) => ({ principalType, principal, access }));
      await this.api.replacePermissions(this.folder().id, payload);
      this.toasts.success('Sharing updated', `“${this.folder().name}”`);
      this.dialog().nativeElement.close();
    } catch (error) {
      this.toasts.error('Could not update sharing', errorMessage(error));
    } finally {
      this.saving.set(false);
    }
  }

  protected initialsOf(name: string | undefined): string {
    return initials(name);
  }
}
