import { inject, Injectable, signal } from '@angular/core';
import { DocumentDto } from '../core/api/models';
import { WindowManager } from './window-manager.service';

export type FilesLocation = { type: 'folder'; folderId: string | null } | { type: 'shared' };

@Injectable({ providedIn: 'root' })
export class Launcher {
  private readonly wm = inject(WindowManager);
  readonly spotlightOpen = signal(false);

  files(location: FilesLocation = { type: 'folder', folderId: null }): string {
    return this.wm.open({
      kind: 'files',
      title: location.type === 'shared' ? 'Shared with me' : 'Home',
      icon: 'lucideFolderOpen',
      data: { location },
      width: 940,
      height: 600,
    });
  }

  viewer(document: Pick<DocumentDto, 'id' | 'name'>, versionNumber?: number): string {
    return this.wm.open({
      kind: 'viewer',
      key: `viewer:${document.id}`,
      title: document.name,
      icon: 'lucideFileText',
      data: { documentId: document.id, versionNumber },
      width: 1040,
      height: 680,
    });
  }

  trash(): string {
    return this.wm.open({ kind: 'trash', key: 'trash', title: 'Trash', icon: 'lucideTrash2', width: 760, height: 480 });
  }

  admin(): string {
    return this.wm.open({ kind: 'admin', key: 'admin', title: 'Users', icon: 'lucideUsers', width: 900, height: 580 });
  }

  settings(): string {
    return this.wm.open({ kind: 'settings', key: 'settings', title: 'Settings', icon: 'lucideSettings2', width: 640, height: 520 });
  }

  toggleSpotlight(open = !this.spotlightOpen()): void {
    this.spotlightOpen.set(open);
  }
}
