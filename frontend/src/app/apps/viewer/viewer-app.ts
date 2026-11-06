import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, computed, effect, inject, input, signal, untracked, viewChild } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { firstValueFrom, last } from 'rxjs';
import { EcmApi } from '../../core/api/ecm-api';
import { errorMessage, httpStatus } from '../../core/api/errors';
import { DocumentDto, DocumentVersionDto } from '../../core/api/models';
import { Launcher } from '../../desktop/launcher.service';
import { WindowFrame } from '../../desktop/window-frame';
import { DesktopWindow, WindowManager } from '../../desktop/window-manager.service';
import { DialogService } from '../../shared/dialog.service';
import { diffLines, DiffResult } from '../../shared/diff';
import { FileIcon } from '../../shared/file-icon';
import { fileType, formatBytes, formatDateTime, formatWhen, initials, isTextLike } from '../../shared/format';
import { ToastService } from '../../shared/toast.service';
import { FileTransfer } from '../files/file-transfer.service';

type PreviewState =
  | { kind: 'loading' }
  | { kind: 'pdf' | 'image'; url: SafeResourceUrl; rawUrl: string }
  | { kind: 'text'; text: string; truncated: boolean }
  | { kind: 'none'; reason: string };

const MAX_TEXT_PREVIEW = 2 * 1024 * 1024;

@Component({
  selector: 'ecm-viewer-app',
  imports: [WindowFrame, NgIcon, FileIcon, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './viewer-app.html',
  styleUrl: './viewer-app.css',
})
export class ViewerApp {
  private readonly api = inject(EcmApi);
  private readonly wm = inject(WindowManager);
  protected readonly launcher = inject(Launcher);
  private readonly dialogs = inject(DialogService);
  private readonly toasts = inject(ToastService);
  private readonly transfer = inject(FileTransfer);
  private readonly sanitizer = inject(DomSanitizer);

  readonly window = input.required<DesktopWindow>();
  private readonly versionInput = viewChild.required<ElementRef<HTMLInputElement>>('versionInput');

  protected readonly document = signal<DocumentDto | null>(null);
  protected readonly versions = signal<DocumentVersionDto[]>([]);
  protected readonly selectedVersion = signal<number | null>(null);
  protected readonly preview = signal<PreviewState>({ kind: 'loading' });
  protected readonly error = signal<string | null>(null);
  protected readonly showHistory = signal(true);
  protected readonly compareWith = signal<number | null>(null);
  protected readonly diff = signal<DiffResult | null>(null);
  protected readonly editing = signal(false);
  protected readonly saving = signal(false);
  protected draft = '';
  private blobUrl: string | null = null;

  protected readonly documentId = computed(() => this.window().data['documentId'] as string);
  private readonly requestedVersion = computed(() => this.window().data['versionNumber'] as number | undefined);
  protected readonly type = computed(() => {
    const document = this.document();
    return document ? fileType(document.name, this.activeVersion()?.mimeType) : null;
  });
  protected readonly activeVersion = computed(() => {
    const number = this.selectedVersion();
    return this.versions().find((version) => version.versionNumber === number) ?? this.document()?.currentVersion ?? null;
  });
  protected readonly isCurrent = computed(() => this.activeVersion()?.versionNumber === this.document()?.currentVersion?.versionNumber);
  protected readonly writable = computed(() => this.document()?.access === 'WRITE');
  protected readonly textLike = computed(() => {
    const document = this.document();
    return !!document && isTextLike(this.activeVersion()?.mimeType, document.name);
  });

  protected formatBytes = formatBytes;
  protected formatWhen = formatWhen;
  protected formatDateTime = formatDateTime;
  protected initials = initials;

  constructor() {
    effect(() => {
      const id = this.documentId();
      const requested = this.requestedVersion();
      untracked(() => void this.load(id, requested));
    });
    inject(DestroyRef).onDestroy(() => this.revokeBlob());
  }

  protected async selectVersion(versionNumber: number): Promise<void> {
    if (this.editing()) {
      return;
    }
    this.selectedVersion.set(versionNumber);
    this.compareWith.set(null);
    this.diff.set(null);
    await this.loadPreview();
  }

  protected async toggleCompare(versionNumber: number): Promise<void> {
    if (this.compareWith() === versionNumber) {
      this.compareWith.set(null);
      this.diff.set(null);
      return;
    }
    const active = this.activeVersion();
    if (!active || active.versionNumber === versionNumber) {
      return;
    }
    this.compareWith.set(versionNumber);
    try {
      const [olderNumber, newerNumber] = [versionNumber, active.versionNumber].sort((a, b) => a - b);
      const [older, newer] = await Promise.all([this.text(olderNumber), this.text(newerNumber)]);
      this.diff.set(diffLines(older, newer));
    } catch (error) {
      this.toasts.error('Could not compare versions', errorMessage(error));
      this.compareWith.set(null);
    }
  }

  protected async restore(version: DocumentVersionDto): Promise<void> {
    const confirmed = await this.dialogs.confirm({
      title: `Restore version ${version.versionNumber}?`,
      message: 'A new version is created with this content. Nothing in the history is lost.',
      confirmText: 'Restore',
    });
    if (!confirmed) {
      return;
    }
    try {
      const document = await this.api.restoreVersion(this.documentId(), version.versionNumber);
      this.toasts.success(`Restored version ${version.versionNumber}`, `Now version ${document.currentVersion?.versionNumber}`);
      await this.load(this.documentId());
    } catch (error) {
      this.toasts.error('Could not restore version', errorMessage(error));
    }
  }

  protected download(version?: DocumentVersionDto): void {
    const document = this.document();
    if (document) {
      void this.transfer.download(document.id, document.name, version?.versionNumber);
    }
  }

  protected pickNewVersion(): void {
    this.versionInput().nativeElement.click();
  }

  protected async onVersionPicked(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    const document = this.document();
    if (!file || !document) {
      return;
    }
    const comment = await this.dialogs.prompt({ title: 'Upload New Version', message: file.name, label: 'What changed? (optional)', value: '', confirmText: 'Upload' });
    if (comment === null) {
      return;
    }
    await this.saveVersion(file, comment);
  }

  protected startEditing(): void {
    const preview = this.preview();
    if (preview.kind === 'text' && !preview.truncated) {
      this.draft = preview.text;
      this.editing.set(true);
      this.diff.set(null);
      this.compareWith.set(null);
    }
  }

  protected cancelEditing(): void {
    this.editing.set(false);
  }

  protected async saveEdit(): Promise<void> {
    const document = this.document();
    if (!document) {
      return;
    }
    const comment = await this.dialogs.prompt({ title: 'Save as New Version', label: 'What changed? (optional)', value: '', confirmText: 'Save' });
    if (comment === null) {
      return;
    }
    const blob = new Blob([this.draft], { type: this.activeVersion()?.mimeType ?? 'text/plain' });
    if (await this.saveVersion(blob, comment)) {
      this.editing.set(false);
    }
  }

  protected openFolder(): void {
    const document = this.document();
    if (document) {
      this.launcher.files({ type: 'folder', folderId: document.folderId });
    }
  }

  private async saveVersion(content: Blob, comment: string): Promise<boolean> {
    const document = this.document()!;
    this.saving.set(true);
    try {
      const result = await firstValueFrom(
        this.api.uploadVersion(document.id, content, document.name, comment || null, document.lockVersion).pipe(last()),
      );
      const before = document.currentVersion?.versionNumber;
      const after = result.document?.currentVersion?.versionNumber;
      if (before === after) {
        this.toasts.info('No changes', 'The content is identical to the current version.');
      } else {
        this.toasts.success(`Saved version ${after}`, document.name);
      }
      await this.load(document.id);
      return true;
    } catch (error) {
      if (httpStatus(error) === 412) {
        this.toasts.error('Someone else changed this document', 'Your copy was out of date. The latest version has been loaded.');
        await this.load(document.id);
      } else {
        this.toasts.error('Could not save version', errorMessage(error));
      }
      return false;
    } finally {
      this.saving.set(false);
    }
  }

  private async load(documentId: string, versionNumber?: number): Promise<void> {
    this.error.set(null);
    try {
      const [document, versions] = await Promise.all([this.api.document(documentId), this.api.versions(documentId)]);
      this.document.set(document);
      this.versions.set(versions);
      this.wm.setTitle(this.window().id, document.name);
      this.selectedVersion.set(versionNumber ?? document.currentVersion?.versionNumber ?? null);
      this.compareWith.set(null);
      this.diff.set(null);
      await this.loadPreview();
    } catch (error) {
      this.error.set(errorMessage(error, 'This document could not be opened'));
      this.preview.set({ kind: 'none', reason: '' });
    }
  }

  private async loadPreview(): Promise<void> {
    const document = this.document();
    const version = this.activeVersion();
    this.revokeBlob();
    if (!document || !version) {
      this.preview.set({ kind: 'none', reason: 'This document has no content yet.' });
      return;
    }
    const kind = fileType(document.name, version.mimeType).kind;
    const previewable = kind === 'pdf' || (kind === 'image' && version.mimeType !== 'image/svg+xml') || this.textLike();
    if (!previewable) {
      this.preview.set({ kind: 'none', reason: `Preview isn’t available for ${fileType(document.name, version.mimeType).label.toLowerCase()}s.` });
      return;
    }
    this.preview.set({ kind: 'loading' });
    try {
      if (this.textLike()) {
        const blob = await this.api.content(document.id, version.versionNumber);
        const truncated = blob.size > MAX_TEXT_PREVIEW;
        const text = await (truncated ? blob.slice(0, MAX_TEXT_PREVIEW) : blob).text();
        this.preview.set({ kind: 'text', text, truncated });
      } else {
        const blob = await this.api.content(document.id, version.versionNumber);
        const typed = blob.type ? blob : new Blob([blob], { type: version.mimeType });
        this.blobUrl = URL.createObjectURL(typed);
        this.preview.set({
          kind: kind === 'pdf' ? 'pdf' : 'image',
          url: this.sanitizer.bypassSecurityTrustResourceUrl(this.blobUrl),
          rawUrl: this.blobUrl,
        });
      }
    } catch (error) {
      this.preview.set({ kind: 'none', reason: errorMessage(error, 'The preview could not be loaded.') });
    }
  }

  private async text(versionNumber: number): Promise<string> {
    const blob = await this.api.content(this.documentId(), versionNumber);
    return (blob.size > MAX_TEXT_PREVIEW ? blob.slice(0, MAX_TEXT_PREVIEW) : blob).text();
  }

  private revokeBlob(): void {
    if (this.blobUrl) {
      URL.revokeObjectURL(this.blobUrl);
      this.blobUrl = null;
    }
  }
}
