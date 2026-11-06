import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { EcmApi } from '../../core/api/ecm-api';
import { errorMessage } from '../../core/api/errors';
import { DocumentDto } from '../../core/api/models';
import { WindowFrame } from '../../desktop/window-frame';
import { DesktopWindow } from '../../desktop/window-manager.service';
import { ContextMenuService } from '../../shared/context-menu.service';
import { DialogService } from '../../shared/dialog.service';
import { FileIcon } from '../../shared/file-icon';
import { formatBytes, formatWhen } from '../../shared/format';
import { ToastService } from '../../shared/toast.service';

@Component({
  selector: 'ecm-trash-app',
  imports: [WindowFrame, NgIcon, FileIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <ecm-window [window]="window()">
      <div toolbar class="flex items-center gap-1">
        <button type="button" class="icon-btn" aria-label="Refresh" title="Refresh" (click)="load()">
          <ng-icon name="lucideRefreshCw" size="16" />
        </button>
        <button type="button" class="btn h-7 text-[12px]" [disabled]="!items().length || busy()" (click)="emptyTrash()">Empty Trash</button>
      </div>
      <div class="flex min-h-0 flex-1 flex-col bg-pane">
        <p class="flex shrink-0 items-center gap-2 border-b border-line px-4 py-2 text-[12px] text-ink-soft">
          <ng-icon name="lucideInfo" size="13" /> Documents stay here until you restore them or delete them forever. Their full version history is kept.
        </p>
        <div class="min-h-0 flex-1 overflow-auto">
          @for (item of items(); track item.id) {
            <div class="group flex items-center gap-3 border-b border-line px-4 py-2.5 hover:bg-hover" (contextmenu)="menu(item, $event)">
              <ecm-file-icon [name]="item.name" [mimeType]="item.currentVersion?.mimeType" [size]="32" class="opacity-75" />
              <div class="min-w-0 flex-1">
                <p class="truncate font-medium">{{ item.name }}</p>
                <p class="truncate text-[11.5px] text-ink-faint">
                  Deleted {{ formatWhen(item.deletedAt) }} · {{ formatBytes(item.currentVersion?.size) }} · v{{ item.currentVersion?.versionNumber }} · {{ item.owner.name }}
                </p>
              </div>
              <button type="button" class="btn h-7 text-[12px]" [disabled]="busy()" (click)="restore(item)">
                <ng-icon name="lucideUndo2" size="13" /> Restore
              </button>
              <button type="button" class="icon-btn text-danger" [attr.aria-label]="'Delete ' + item.name + ' forever'" title="Delete forever"
                      [disabled]="busy()" (click)="purge(item)">
                <ng-icon name="lucideTrash" size="15" />
              </button>
            </div>
          } @empty {
            <div class="grid h-full place-items-center p-10 text-center">
              <div class="flex flex-col items-center gap-3">
                <span class="grid size-16 place-items-center rounded-2xl bg-hover text-ink-faint"><ng-icon name="lucideTrash2" size="30" /></span>
                <p class="font-semibold">{{ loading() ? 'Loading…' : 'Trash is empty' }}</p>
              </div>
            </div>
          }
        </div>
      </div>
    </ecm-window>
  `,
})
export class TrashApp {
  private readonly api = inject(EcmApi);
  private readonly dialogs = inject(DialogService);
  private readonly toasts = inject(ToastService);
  private readonly menus = inject(ContextMenuService);

  readonly window = input.required<DesktopWindow>();
  protected readonly items = signal<DocumentDto[]>([]);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected formatBytes = formatBytes;
  protected formatWhen = formatWhen;

  constructor() {
    void this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.items.set(await this.api.trash());
    } catch (error) {
      this.toasts.error('Could not load Trash', errorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  protected menu(item: DocumentDto, event: MouseEvent): void {
    this.menus.openAt(event, [
      { label: 'Restore', icon: 'lucideUndo2', action: () => void this.restore(item) },
      'separator',
      { label: 'Delete Forever…', icon: 'lucideTrash', danger: true, action: () => void this.purge(item) },
    ]);
  }

  protected async restore(item: DocumentDto): Promise<void> {
    await this.run(async () => {
      await this.api.restoreFromTrash(item.id);
      this.toasts.success(`Restored “${item.name}”`, item.folderId ? undefined : 'It is back in Home.');
    }, 'Could not restore');
  }

  protected async purge(item: DocumentDto): Promise<void> {
    const confirmed = await this.dialogs.confirm({
      title: `Delete “${item.name}” forever?`,
      message: 'The document and all of its versions are permanently removed. This cannot be undone.',
      confirmText: 'Delete Forever',
      danger: true,
    });
    if (confirmed) {
      await this.run(() => this.api.purge(item.id), 'Could not delete');
    }
  }

  protected async emptyTrash(): Promise<void> {
    const count = this.items().length;
    const confirmed = await this.dialogs.confirm({
      title: 'Empty Trash?',
      message: `${count} document${count === 1 ? '' : 's'} and all of their versions will be permanently removed.`,
      confirmText: 'Empty Trash',
      danger: true,
    });
    if (confirmed) {
      await this.run(async () => {
        for (const item of this.items()) {
          await this.api.purge(item.id);
        }
        this.toasts.info('Trash emptied');
      }, 'Could not empty Trash');
    }
  }

  private async run(action: () => Promise<unknown>, failure: string): Promise<void> {
    this.busy.set(true);
    try {
      await action();
    } catch (error) {
      this.toasts.error(failure, errorMessage(error));
    } finally {
      this.busy.set(false);
      await this.load();
    }
  }
}
