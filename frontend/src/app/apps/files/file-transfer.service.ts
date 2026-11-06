import { inject, Injectable } from '@angular/core';
import { firstValueFrom, last, tap } from 'rxjs';
import { EcmApi } from '../../core/api/ecm-api';
import { errorMessage, httpStatus } from '../../core/api/errors';
import { DocumentDto } from '../../core/api/models';
import { DialogService } from '../../shared/dialog.service';
import { ToastService } from '../../shared/toast.service';

@Injectable({ providedIn: 'root' })
export class FileTransfer {
  private readonly api = inject(EcmApi);
  private readonly toasts = inject(ToastService);
  private readonly dialogs = inject(DialogService);

  async upload(files: File[], folderId: string | null, existing: DocumentDto[]): Promise<number> {
    if (!files.length) {
      return 0;
    }
    const total = files.reduce((sum, file) => sum + file.size, 0) || 1;
    const toast = this.toasts.progress(files.length === 1 ? `Uploading ${files[0].name}` : `Uploading ${files.length} files`);
    let done = 0;
    let uploaded = 0;
    const failures: string[] = [];

    for (const file of files) {
      try {
        await this.uploadOne(file, folderId, existing, (loaded) => {
          this.toasts.update(toast, { progress: Math.min(1, (done + loaded) / total) });
        });
        uploaded++;
      } catch (error) {
        if (error !== 'skipped') {
          failures.push(`${file.name}: ${errorMessage(error, 'upload failed')}`);
        }
      }
      done += file.size;
    }

    if (failures.length) {
      this.toasts.update(toast, { kind: 'error', title: `${failures.length} upload${failures.length > 1 ? 's' : ''} failed`, detail: failures.join('\n') });
    } else if (uploaded) {
      this.toasts.update(toast, { kind: 'success', progress: 1, title: uploaded === 1 ? `Uploaded ${files[0].name}` : `Uploaded ${uploaded} files` });
    } else {
      this.toasts.dismiss(toast);
    }
    return uploaded;
  }

  async download(documentId: string, name: string, versionNumber?: number): Promise<void> {
    try {
      const blob = await this.api.content(documentId, versionNumber);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (error) {
      this.toasts.error(`Could not download ${name}`, errorMessage(error));
    }
  }

  private async uploadOne(file: File, folderId: string | null, existing: DocumentDto[], onProgress: (loaded: number) => void): Promise<void> {
    try {
      await firstValueFrom(this.api.upload(file, folderId).pipe(tap((event) => onProgress(event.document ? file.size : event.loaded)), last()));
    } catch (error) {
      if (httpStatus(error) !== 409) {
        throw error;
      }
      const match = existing.find((document) => document.name.toLowerCase() === file.name.toLowerCase());
      if (!match) {
        throw error;
      }
      const replace = await this.dialogs.confirm({
        title: `“${file.name}” already exists`,
        message: 'Upload it as a new version? The current version stays in the history and can be restored at any time.',
        confirmText: 'Add New Version',
      });
      if (!replace) {
        throw 'skipped';
      }
      await firstValueFrom(
        this.api.uploadVersion(match.id, file, file.name, null).pipe(tap((event) => onProgress(event.document ? file.size : event.loaded)), last()),
      );
    }
  }
}
