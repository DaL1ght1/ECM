import { Injectable } from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import { Observable } from 'rxjs';
import { Person } from '../Models/person.model';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiUrl = 'http://localhost:8090/bfi/v1/admin'; // Adjust based on your backend URL

  constructor(private http: HttpClient) {}

  getPendingUsers(): Observable<Person[]> {
    return this.http.get<Person[]>(`${this.apiUrl}/pending-users`);
  }


  approveUser(id: number, role: string): Observable<void> {
    const params = new HttpParams().set('role', role);
    return this.http.put<void>(`${this.apiUrl}/approve/${id}`, null, { params });
  }

  getAllUsers(): Observable<Person[]> {
    return this.http.get<Person[]>(`${this.apiUrl}/all-users`);
  }

  updateUserRole(userId: number, role: string): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/update-role/${userId}`, null, { params: { role } });
  }

  UserBanStatus(userId: number): Observable<boolean> {
    return this.http.put<boolean>(`${this.apiUrl}/ban-user/${userId}`, null);
  }

  deleteUser(userId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${userId}`);
  }

}
