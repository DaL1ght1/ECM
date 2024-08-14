import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {catchError, Observable, throwError} from 'rxjs';
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
      );





  }}
