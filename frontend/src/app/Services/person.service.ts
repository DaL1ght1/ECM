import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { Person } from '../Models/person.model';

@Injectable({
  providedIn: 'root'
})
export class PersonService {
  private apiUrl = `${environment.apiUrl}/bfi/v1`;

  constructor(private http: HttpClient) {}

  addPerson(person: Person): Observable<Person> {
    return this.http.post<Person>(`${this.apiUrl}/auth/register`, person);
  }


}
