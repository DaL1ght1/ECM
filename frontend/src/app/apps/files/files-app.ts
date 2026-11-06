import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, computed, effect, inject, input, signal, untracked, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgIcon } from '@ng-icons/core';
import { filter } from 'rxjs';
import { EcmApi } from '../../core/api/ecm-api';
import { errorMessage } from '../../core/api/errors';
import { DocumentDto, FolderDto } from '../../core/api/models';
import { AuthService } from '../../core/auth/auth.service';
import { FilesLocation, Launcher } from '../../desktop/launcher.service';
import { WindowFrame } from '../../desktop/window-frame';
import { DesktopWindow, WindowManager } from '../../desktop/window-manager.service';
import { ContextMenuService, MenuEntry } from '../../shared/context-menu.service';
import { DialogService } from '../../shared/dialog.service';
import { FileIcon } from '../../shared/file-icon';
import { fileType, formatBytes, formatWhen } from '../../shared/format';
import { ToastService } from '../../shared/toast.service';
import { FileTransfer } from './file-transfer.service';
import { ShareDialog } from './share-dialog';

export interface FileItem {
  key: string;
  type: 'folder' | 'document';
  id: string;
  name: string;
  folder?: FolderDto;
  document?: DocumentDto;
  modified: string;
  size: number | null;
  owner: string;
  kindLabel: string;
  writable: boolean;
}

const DRAG_TYPE = 'application/x-ecm-item';
const VIEW_KEY = 'ecm.files.view';

@Component({
  selector: 'ecm-files-app',
  imports: [WindowFrame, NgIcon, FileIcon, ShareDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './files-app.html',
  styleUrl: './files-app.css',
})
export class FilesApp {
  private readonly api = inject(EcmApi);
  private readonly wm = inject(WindowManager);
  private readonly launcher = inject(Launcher);
  private readonly menus = inject(ContextMenuService);
  private readonly dialogs = inject(DialogService);
  private readonly toasts = inject(ToastService);
  private readonly transfer = inject(FileTransfer);
  private readonly auth = inject(AuthService);

  readonly window = input.required<DesktopWindow>();
  private readonly fileInput = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');
  private readonly content = viewChild<ElementRef<HTMLElement>>('content');

  protected readonly history = signal<FilesLocation[]>([]);
  protected readonly historyIndex = signal(-1);
  protected readonly location = computed(() => this.history()[this.historyIndex()] ?? { type: 'folder', folderId: null });

  protected readonly current = signal<FolderDto | null>(null);
  protected readonly breadcrumbs = signal<FolderDto[]>([]);
  protected readonly folders = signal<FolderDto[]>([]);
  protected readonly documents = signal<DocumentDto[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly view = signal<'grid' | 'list'>(readView());
  protected readonly filterText = signal('');
  protected readonly selection = signal<ReadonlySet<string>>(new Set());
  protected readonly dropActive = signal(false);
  protected readonly dropTarget = signal<string | null>(null);
  protected readonly sharing = signal<FolderDto | null>(null);
  private dragDepth = 0;

  protected readonly isShared = computed(() => this.location().type === 'shared');
  protected readonly canWrite = computed(() => !this.isShared() && (this.current()?.access ?? 'WRITE') === 'WRITE');

  protected readonly items = computed<FileItem[]>(() => {
    const me = this.auth.user()?.id;
    const query = this.filterText().trim().toLowerCase();
    const folders = this.folders().map<FileItem>((folder) => ({
      key: 'f:' + folder.id,
      type: 'folder',
      id: folder.id,
      name: folder.name,
      folder,
      modified: folder.updatedAt,
      size: null,
      owner: folder.owner.id === me ? 'Me' : folder.owner.name,
      kindLabel: 'Folder',
      writable: folder.access === 'WRITE',
    }));
    const documents = this.documents().map<FileItem>((document) => ({
      key: 'd:' + document.id,
      type: 'document',
      id: document.id,
      name: document.name,
      document,
      modified: document.updatedAt,
      size: document.currentVersion?.size ?? null,
      owner: document.owner.id === me ? 'Me' : document.owner.name,
      kindLabel: fileType(document.name, document.currentVersion?.mimeType).label,
      writable: document.access === 'WRITE',
    }));
    const all = [...folders, ...documents];
    return query ? all.filter((item) => item.name.toLowerCase().includes(query)) : all;
  });

  protected readonly selectedItems = computed(() => this.items().filter((item) => this.selection().has(item.key)));
  protected readonly status = computed(() => {
    const count = this.items().length;
    const selected = this.selectedItems();
    if (selected.length === 1 && selected[0].size !== null) {
      return `1 of ${count} selected · ${formatBytes(selected[0].size)}`;
    }
    return selected.length ? `${selected.length} of ${count} selected` : `${count} item${count === 1 ? '' : 's'}`;
  });

  constructor() {
    effect(() => {
      const initial = this.window().data['location'] as FilesLocation | undefined;
      untracked(() => {
        if (this.historyIndex() < 0) {
          this.history.set([initial ?? { type: 'folder', folderId: null }]);
          this.historyIndex.set(0);
        }
      });
    });

    effect(() => {
      const location = this.location();
      untracked(() => void this.load(location));
    });

    this.wm.commands
      .pipe(filter((command) => command.windowId === this.window().id), takeUntilDestroyed(inject(DestroyRef)))
      .subscribe(({ command }) => {
        if (command === 'new-folder') void this.newFolder();
        if (command === 'upload') this.pickFiles();
        if (command === 'refresh') void this.reload();
      });
  }

  protected formatBytes = formatBytes;
  protected formatWhen = formatWhen;

  protected navigate(location: FilesLocation): void {
    const here = this.location();
    if (JSON.stringify(here) === JSON.stringify(location)) {
      void this.reload();
      return;
    }
    this.history.update((history) => [...history.slice(0, this.historyIndex() + 1), location]);
    this.historyIndex.update((index) => index + 1);
  }

  protected openFolder(folderId: string | null): void {
    this.navigate({ type: 'folder', folderId });
  }

  protected back(): void {
    if (this.historyIndex() > 0) {
      this.historyIndex.update((index) => index - 1);
    }
  }

  protected forward(): void {
    if (this.historyIndex() < this.history().length - 1) {
      this.historyIndex.update((index) => index + 1);
    }
  }

  protected up(): void {
    const current = this.current();
    if (current) {
      this.openFolder(current.parentId);
    }
  }

  protected setView(view: 'grid' | 'list'): void {
    this.view.set(view);
    try {
      localStorage.setItem(VIEW_KEY, view);
    } catch {}
  }

  protected reload(): Promise<void> {
    return this.load(this.location());
  }

  protected select(item: FileItem, event: MouseEvent | KeyboardEvent): void {
    const additive = event.ctrlKey || event.metaKey;
    this.selection.update((selection) => {
      if (!additive) {
        return new Set([item.key]);
      }
      const next = new Set(selection);
      next.has(item.key) ? next.delete(item.key) : next.add(item.key);
      return next;
    });
  }

  protected clearSelection(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.selection.set(new Set());
    }
  }

  protected open(item: FileItem): void {
    if (item.type === 'folder') {
      this.openFolder(item.id);
    } else {
      this.launcher.viewer(item.document!);
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    if ((event.target as HTMLElement).closest('input, textarea, select')) {
      return;
    }
    const items = this.items();
    const selected = this.selectedItems();
    const index = selected.length ? items.findIndex((item) => item.key === selected[selected.length - 1].key) : -1;
    const columns = this.view() === 'grid' ? this.gridColumns() : 1;
    const moves: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: columns, ArrowUp: -columns };

    if (event.key in moves && items.length) {
      event.preventDefault();
      const next = Math.max(0, Math.min(items.length - 1, index < 0 ? 0 : index + moves[event.key]));
      this.selection.set(new Set([items[next].key]));
      this.content()?.nativeElement.querySelector<HTMLElement>(`[data-key="${items[next].key}"]`)?.focus();
    } else if (event.key === 'Enter' && selected.length === 1) {
      event.preventDefault();
      this.open(selected[0]);
    } else if ((event.key === 'Delete' || (event.key === 'Backspace' && (event.metaKey || event.ctrlKey))) && selected.length) {
      event.preventDefault();
      void this.delete(selected);
    } else if (event.key === 'F2' && selected.length === 1) {
      event.preventDefault();
      void this.rename(selected[0]);
    } else if (event.key === 'a' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      this.selection.set(new Set(items.map((item) => item.key)));
    } else if (event.key === 'Backspace' && !event.metaKey && !event.ctrlKey) {
      event.preventDefault();
      this.up();
    }
  }

  protected itemMenu(item: FileItem, event: MouseEvent): void {
    if (!this.selection().has(item.key)) {
      this.selection.set(new Set([item.key]));
    }
    const selected = this.selectedItems();
    const multiple = selected.length > 1;
    const writable = selected.every((entry) => entry.writable);
    const parentId = this.current()?.parentId ?? null;
    const entries: MenuEntry[] = [
      { label: 'Open', icon: item.type === 'folder' ? 'lucideFolderOpen' : 'lucideEye', disabled: multiple, action: () => this.open(item) },
      ...(item.type === 'folder'
        ? [{ label: 'Open in New Window', icon: 'lucideAppWindow', disabled: multiple, action: () => this.launcher.files({ type: 'folder', folderId: item.id }) }]
        : [
            { label: 'Download', icon: 'lucideDownload', disabled: multiple, action: () => void this.transfer.download(item.id, item.name) },
            { label: 'Version History', icon: 'lucideHistory', disabled: multiple, action: () => this.launcher.viewer(item.document!) },
          ]),
      'separator',
      { label: 'Rename…', icon: 'lucidePencil', shortcut: 'F2', disabled: multiple || !item.writable, action: () => void this.rename(item) },
      ...(this.current()
        ? [{ label: parentId ? 'Move to Parent Folder' : 'Move to Home', icon: 'lucideCornerLeftUp', disabled: !writable, action: () => void this.move(selected, parentId) }]
        : []),
      ...(item.type === 'folder' && this.canManage(item.folder!)
        ? [{ label: 'Share…', icon: 'lucideUserPlus', disabled: multiple, action: () => this.sharing.set(item.folder!) }]
        : []),
      'separator',
      { label: multiple ? `Move ${selected.length} Items to Trash` : 'Move to Trash', icon: 'lucideTrash2', shortcut: 'Del', danger: true, disabled: !writable, action: () => void this.delete(selected) },
    ];
    this.menus.openAt(event, entries);
  }

  protected backgroundMenu(event: MouseEvent): void {
    if ((event.target as HTMLElement).closest('[data-key]')) {
      return;
    }
    this.selection.set(new Set());
    const current = this.current();
    this.menus.openAt(event, [
      { label: 'New Folder', icon: 'lucideFolderPlus', disabled: !this.canWrite(), action: () => void this.newFolder() },
      { label: 'Upload Files…', icon: 'lucideUpload', disabled: !this.canWrite(), action: () => this.pickFiles() },
      'separator',
      ...(current && this.canManage(current) ? [{ label: 'Share This Folder…', icon: 'lucideUserPlus', action: () => this.sharing.set(current) }, 'separator' as const] : []),
      { label: 'View as Icons', icon: 'lucideLayoutGrid', checked: this.view() === 'grid', action: () => this.setView('grid') },
      { label: 'View as List', icon: 'lucideList', checked: this.view() === 'list', action: () => this.setView('list') },
      'separator',
      { label: 'Refresh', icon: 'lucideRefreshCw', action: () => void this.reload() },
    ]);
  }

  protected pickFiles(): void {
    if (this.canWrite()) {
      this.fileInput().nativeElement.click();
    }
  }

  protected async onFilesPicked(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    await this.uploadFiles(files);
  }

  protected async newFolder(): Promise<void> {
    if (!this.canWrite()) {
      return;
    }
    const name = await this.dialogs.prompt({ title: 'New Folder', label: 'Name', value: 'Untitled Folder', confirmText: 'Create' });
    if (!name) {
      return;
    }
    try {
      const folder = await this.api.createFolder(name, this.current()?.id ?? null);
      await this.reload();
      this.selection.set(new Set(['f:' + folder.id]));
    } catch (error) {
      this.toasts.error('Could not create folder', errorMessage(error));
    }
  }

  protected async rename(item: FileItem): Promise<void> {
    const name = await this.dialogs.prompt({
      title: `Rename ${item.type === 'folder' ? 'Folder' : 'Document'}`,
      label: 'Name',
      value: item.name,
      confirmText: 'Rename',
      selectBaseName: item.type === 'document',
    });
    if (!name || name === item.name) {
      return;
    }
    try {
      if (item.type === 'folder') {
        await this.api.renameFolder(item.id, name);
      } else {
        await this.api.renameDocument(item.id, name);
      }
      await this.reload();
    } catch (error) {
      this.toasts.error('Could not rename', errorMessage(error));
    }
  }

  protected async delete(items: FileItem[]): Promise<void> {
    const folders = items.filter((item) => item.type === 'folder');
    if (folders.length) {
      const confirmed = await this.dialogs.confirm({
        title: folders.length === 1 ? `Delete “${folders[0].name}”?` : `Delete ${folders.length} folders?`,
        message: 'The folder is removed and every document inside it moves to its owner’s Trash.',
        confirmText: 'Delete',
        danger: true,
      });
      if (!confirmed) {
        return;
      }
    }
    try {
      for (const item of items) {
        if (item.type === 'folder') {
          await this.api.deleteFolder(item.id);
        } else {
          await this.api.deleteDocument(item.id);
        }
      }
      this.selection.set(new Set());
      this.toasts.info(items.length === 1 ? `Moved “${items[0].name}” to Trash` : `Moved ${items.length} items to Trash`);
    } catch (error) {
      this.toasts.error('Could not delete', errorMessage(error));
    } finally {
      await this.reload();
    }
  }

  protected onItemDragStart(item: FileItem, event: DragEvent): void {
    if (!this.selection().has(item.key)) {
      this.selection.set(new Set([item.key]));
    }
    const payload = this.selectedItems().map(({ type, id }) => ({ type, id }));
    event.dataTransfer?.setData(DRAG_TYPE, JSON.stringify(payload));
    event.dataTransfer!.effectAllowed = 'move';
  }

  protected onTargetDragOver(targetKey: string, event: DragEvent): void {
    if (event.dataTransfer?.types.includes(DRAG_TYPE) && !this.selection().has(targetKey)) {
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = 'move';
      this.dropTarget.set(targetKey);
    }
  }

  protected onTargetDragLeave(targetKey: string): void {
    if (this.dropTarget() === targetKey) {
      this.dropTarget.set(null);
    }
  }

  protected async onTargetDrop(targetFolderId: string | null, event: DragEvent): Promise<void> {
    const raw = event.dataTransfer?.getData(DRAG_TYPE);
    this.dropTarget.set(null);
    if (!raw) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const moved = (JSON.parse(raw) as { type: string; id: string }[])
      .map((entry) => this.items().find((item) => item.type === entry.type && item.id === entry.id))
      .filter((item): item is FileItem => !!item && item.id !== targetFolderId);
    await this.move(moved, targetFolderId);
  }

  protected onPaneDragEnter(event: DragEvent): void {
    if (event.dataTransfer?.types.includes('Files') && this.canWrite()) {
      this.dragDepth++;
      this.dropActive.set(true);
    }
  }

  protected onPaneDragOver(event: DragEvent): void {
    if (event.dataTransfer?.types.includes('Files') && this.canWrite()) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
    }
  }

  protected onPaneDragLeave(): void {
    if (this.dragDepth > 0 && --this.dragDepth === 0) {
      this.dropActive.set(false);
    }
  }

  protected async onPaneDrop(event: DragEvent): Promise<void> {
    this.dragDepth = 0;
    this.dropActive.set(false);
    const files = Array.from(event.dataTransfer?.files ?? []);
    if (!files.length || !this.canWrite()) {
      return;
    }
    event.preventDefault();
    await this.uploadFiles(files);
  }

  protected canManage(folder: FolderDto): boolean {
    return this.auth.isAdmin() || folder.owner.id === this.auth.user()?.id;
  }

  private async move(items: FileItem[], targetFolderId: string | null): Promise<void> {
    if (!items.length) {
      return;
    }
    try {
      for (const item of items) {
        if (item.type === 'folder') {
          await this.api.moveFolder(item.id, targetFolderId);
        } else {
          await this.api.moveDocument(item.id, targetFolderId);
        }
      }
      this.toasts.success(items.length === 1 ? `Moved “${items[0].name}”` : `Moved ${items.length} items`);
    } catch (error) {
      this.toasts.error('Could not move', errorMessage(error));
    } finally {
      await this.reload();
    }
  }

  private async uploadFiles(files: File[]): Promise<void> {
    const uploaded = await this.transfer.upload(files, this.current()?.id ?? null, this.documents());
    if (uploaded) {
      await this.reload();
    }
  }

  private async load(location: FilesLocation): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      if (location.type === 'shared') {
        const shared = await this.api.sharedFolders();
        this.current.set(null);
        this.breadcrumbs.set([]);
        this.folders.set(shared);
        this.documents.set([]);
        this.wm.setTitle(this.window().id, 'Shared with me');
      } else {
        const contents = await this.api.folder(location.folderId);
        this.current.set(contents.folder);
        this.breadcrumbs.set(contents.breadcrumbs);
        this.folders.set(contents.folders);
        this.documents.set(contents.documents);
        this.wm.setTitle(this.window().id, contents.folder?.name ?? 'Home');
      }
      const keys = new Set(this.items().map((item) => item.key));
      this.selection.update((selection) => new Set([...selection].filter((key) => keys.has(key))));
    } catch (error) {
      this.error.set(errorMessage(error, 'This folder could not be opened'));
      this.folders.set([]);
      this.documents.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  private gridColumns(): number {
    const element = this.content()?.nativeElement.querySelector<HTMLElement>('.grid-view');
    if (!element) {
      return 1;
    }
    return Math.max(1, getComputedStyle(element).gridTemplateColumns.split(' ').length);
  }
}

function readView(): 'grid' | 'list' {
  try {
    return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'grid';
  } catch {
    return 'grid';
  }
}
