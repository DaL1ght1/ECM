import { Injectable } from '@angular/core';
import {HttpClient, HttpErrorResponse, HttpHeaders} from '@angular/common/http';
import {catchError, Observable, of, throwError} from 'rxjs';
import {FilesAndDirectoriesResponse} from "../Models/directory.model";

@Injectable({
  providedIn: 'root'
})
export class FileUploadService {
  private apiUrl = 'http://localhost:8090/bfi/v1'; // Update to your backend URL

  constructor(private http: HttpClient) {}

  upload(file: File, id: number): Observable<any> {
    const formData: FormData = new FormData();
    formData.append('file', file, file.name);
    formData.append('id',id.toString());

    return this.http.post(`${this.apiUrl}/files/upload`, formData);
  }

  getAllFilesAndDirectories(): Observable<FilesAndDirectoriesResponse> {
    return this.http.get<FilesAndDirectoriesResponse>(`${this.apiUrl}/files/all`);
  }
  updateFile(id: number, file?: File, name?: string, parentId?: number): Observable<any> {
    const formData: FormData = new FormData();
    if (file) {
      formData.append('file', file, file.name);
    }
    if (name) {
      formData.append('newName', name);
    }
    if (parentId !== undefined && parentId !== null) {
      formData.append('newParentFileId', parentId.toString());
    }

    return this.http.put(`${this.apiUrl}/files/update/${id}`, formData, { responseType: 'text' });
  }

  createDirectory(directoryData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/directories/create`, directoryData, { responseType: 'text' })
      .pipe(
        catchError(error => {
          // Handle error response
          return throwError(error);
        })
      );}


  getFileContent(id: number): Observable<{ fileContent: string }> {
    return this.http.get<{ fileContent: string }>(`${this.apiUrl}/files/content/${id}`);
  }


  replaceFile(fileId: number, newFileContent: string): Observable<any> {
    const body = new URLSearchParams();
    body.set('content', newFileContent);

    return this.http.post<any>(`${this.apiUrl}/files/replace/${fileId}`, body.toString(), {
      headers: new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' }),
      responseType: 'json'
    });
  }
  deleteDirectory(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/directories/delete/${id}`, { responseType: 'text' });
  }

  moveFile(fileId: number, newParentDirectoryId: number): Observable<string | null> {
    return this.http.put(`${this.apiUrl}/files/${fileId}/move`, { newParentFileId: newParentDirectoryId }, { responseType: 'text' })
      .pipe(
        catchError((error: HttpErrorResponse) => {
          if (error.status === 204) {
            // No content to return, handle as a successful move without a message
            return of(null);
          } else {
            return throwError(error);
          }
        })
      );
  }

  downloadFile(fileId: number): Observable<Blob> {
    const url = `${this.apiUrl}/files/download/${fileId}`; // Replace '/api/files' with your actual endpoint
    return this.http.get(url, { responseType: 'blob' }); // Request blob data
  }


}
