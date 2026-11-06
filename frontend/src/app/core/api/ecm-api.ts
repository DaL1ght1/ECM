import { HttpClient, HttpEvent, HttpEventType, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { filter, firstValueFrom, map, Observable } from 'rxjs';
import {
  API,
  DocumentDto,
  DocumentVersionDto,
  FolderContents,
  FolderDto,
  Permission,
  SearchResults,
  UserDto,
  UserSummary,
} from './models';

export interface UploadProgress {
  loaded: number;
  total: number;
  document?: DocumentDto;
}

@Injectable({ providedIn: 'root' })
export class EcmApi {
  private readonly http = inject(HttpClient);

  folder(folderId: string | null): Promise<FolderContents> {
    return firstValueFrom(this.http.get<FolderContents>(folderId ? `${API}/folders/${folderId}` : `${API}/folders`));
  }

  sharedFolders(): Promise<FolderDto[]> {
    return firstValueFrom(this.http.get<FolderDto[]>(`${API}/folders/shared`));
  }

  createFolder(name: string, parentId: string | null): Promise<FolderDto> {
    return firstValueFrom(this.http.post<FolderDto>(`${API}/folders`, { name, parentId }));
  }

  renameFolder(folderId: string, name: string): Promise<FolderDto> {
    return firstValueFrom(this.http.patch<FolderDto>(`${API}/folders/${folderId}`, { name }));
  }

  moveFolder(folderId: string, targetFolderId: string | null): Promise<FolderDto> {
    return firstValueFrom(this.http.post<FolderDto>(`${API}/folders/${folderId}/move`, { targetFolderId }));
  }

  deleteFolder(folderId: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${API}/folders/${folderId}`));
  }

  permissions(folderId: string): Promise<Permission[]> {
    return firstValueFrom(this.http.get<Permission[]>(`${API}/folders/${folderId}/permissions`));
  }

  replacePermissions(folderId: string, permissions: Permission[]): Promise<Permission[]> {
    return firstValueFrom(this.http.put<Permission[]>(`${API}/folders/${folderId}/permissions`, { permissions }));
  }

  document(documentId: string): Promise<DocumentDto> {
    return firstValueFrom(this.http.get<DocumentDto>(`${API}/documents/${documentId}`));
  }

  upload(file: File, folderId: string | null): Observable<UploadProgress> {
    const form = new FormData();
    form.append('file', file, file.name);
    if (folderId) {
      form.append('folderId', folderId);
    }
    return this.withProgress(this.http.post<DocumentDto>(`${API}/documents`, form, { reportProgress: true, observe: 'events' }));
  }

  uploadVersion(documentId: string, file: Blob, fileName: string, comment: string | null, lockVersion?: number): Observable<UploadProgress> {
    const form = new FormData();
    form.append('file', file, fileName);
    if (comment) {
      form.append('comment', comment);
    }
    const headers = lockVersion === undefined ? undefined : new HttpHeaders({ 'If-Match': `"${lockVersion}"` });
    return this.withProgress(
      this.http.post<DocumentDto>(`${API}/documents/${documentId}/versions`, form, { headers, reportProgress: true, observe: 'events' }),
    );
  }

  versions(documentId: string): Promise<DocumentVersionDto[]> {
    return firstValueFrom(this.http.get<DocumentVersionDto[]>(`${API}/documents/${documentId}/versions`));
  }

  restoreVersion(documentId: string, versionNumber: number): Promise<DocumentDto> {
    return firstValueFrom(this.http.post<DocumentDto>(`${API}/documents/${documentId}/versions/${versionNumber}/restore`, null));
  }

  content(documentId: string, versionNumber?: number): Promise<Blob> {
    const url = versionNumber === undefined
      ? `${API}/documents/${documentId}/content`
      : `${API}/documents/${documentId}/versions/${versionNumber}/content`;
    return firstValueFrom(this.http.get(url, { responseType: 'blob' }));
  }

  renameDocument(documentId: string, name: string): Promise<DocumentDto> {
    return firstValueFrom(this.http.patch<DocumentDto>(`${API}/documents/${documentId}`, { name }));
  }

  moveDocument(documentId: string, targetFolderId: string | null): Promise<DocumentDto> {
    return firstValueFrom(this.http.post<DocumentDto>(`${API}/documents/${documentId}/move`, { targetFolderId }));
  }

  deleteDocument(documentId: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${API}/documents/${documentId}`));
  }

  trash(): Promise<DocumentDto[]> {
    return firstValueFrom(this.http.get<DocumentDto[]>(`${API}/trash`));
  }

  restoreFromTrash(documentId: string): Promise<DocumentDto> {
    return firstValueFrom(this.http.post<DocumentDto>(`${API}/trash/${documentId}/restore`, null));
  }

  purge(documentId: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${API}/trash/${documentId}`));
  }

  search(query: string, filters: { folderId?: string; type?: string; page?: number; size?: number } = {}): Promise<SearchResults> {
    let params = new HttpParams().set('q', query);
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return firstValueFrom(this.http.get<SearchResults>(`${API}/search`, { params }));
  }

  me(): Promise<UserDto> {
    return firstValueFrom(this.http.get<UserDto>(`${API}/user/me`));
  }

  userDirectory(query: string): Promise<UserSummary[]> {
    return firstValueFrom(this.http.get<UserSummary[]>(`${API}/user/directory`, { params: { q: query } }));
  }

  pendingUsers(): Promise<UserDto[]> {
    return firstValueFrom(this.http.get<UserDto[]>(`${API}/admin/pending-users`));
  }

  allUsers(): Promise<UserDto[]> {
    return firstValueFrom(this.http.get<UserDto[]>(`${API}/admin/all-users`));
  }

  approveUser(userId: number, role: string): Promise<void> {
    return firstValueFrom(this.http.put<void>(`${API}/admin/approve/${userId}`, null, { params: { role } }));
  }

  declineUser(userId: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${API}/admin/${userId}`));
  }

  updateRole(userId: number, role: string): Promise<void> {
    return firstValueFrom(this.http.put<void>(`${API}/admin/update-role/${userId}`, null, { params: { role } }));
  }

  toggleBan(userId: number): Promise<boolean> {
    return firstValueFrom(this.http.put<boolean>(`${API}/admin/ban-user/${userId}`, null));
  }

  deleteUser(userId: number): Promise<void> {
    return firstValueFrom(this.http.delete(`${API}/admin/users/${userId}`, { responseType: 'text' }).pipe(map(() => undefined)));
  }

  rebuildSearchIndex(): Promise<void> {
    return firstValueFrom(this.http.post<void>(`${API}/admin/search/reindex`, null));
  }

  private withProgress(events: Observable<HttpEvent<DocumentDto>>): Observable<UploadProgress> {
    return events.pipe(
      filter((event) => event.type === HttpEventType.UploadProgress || event.type === HttpEventType.Response),
      map((event) => {
        if (event.type === HttpEventType.UploadProgress) {
          return { loaded: event.loaded, total: event.total ?? event.loaded };
        }
        const response = event as { body: DocumentDto };
        return { loaded: 1, total: 1, document: response.body };
      }),
    );
  }
}
