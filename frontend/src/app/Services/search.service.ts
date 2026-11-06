import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SearchService {

  private apiUrl = 'http://localhost:8090/bfi/v1/search'; // Update with your actual backend URL

  constructor(private http: HttpClient) { }

  searchFiles(query: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}?mot=${query}`);
  }
}
