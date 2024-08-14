import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {Observable, BehaviorSubject, tap, throwError, catchError} from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../environments/environment';
import { MessageService } from 'primeng/api';
import { JwtHelperService } from '@auth0/angular-jwt';

interface User {
  email: string;
  role: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser: Observable<User | null>;

  private isAuthenticatedSubject: BehaviorSubject<boolean>;
  public isAuthenticated$: Observable<boolean>;

  private jwtHelper: JwtHelperService = new JwtHelperService();
  private closeTabTimeout: any;

  constructor(
    private http: HttpClient,
    private router: Router,
    private messageService: MessageService
  ) {
    const user = this.loadUserFromToken();
    this.currentUserSubject = new BehaviorSubject<User | null>(user);
    this.currentUser = this.currentUserSubject.asObservable();

    this.isAuthenticatedSubject = new BehaviorSubject<boolean>(!!user);
    this.isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
    window.addEventListener('beforeunload', () => {
      // Set a timeout to detect tab closure
      this.closeTabTimeout = setTimeout(() => {
        this.removeToken(); // Remove token after timeout if no 'load' event occurred
      }, 1000); // Adjust timeout as needed (1 second in this example)
    });
  }

  private loadUserFromToken(): User | null {
    const token = localStorage.getItem('token');
    if (token && !this.jwtHelper.isTokenExpired(token)) {
      const decodedToken = this.jwtHelper.decodeToken(token);
      return {
        email: decodedToken.sub,
        role: decodedToken.role || ''
      };
    }
    return null;
  }

  private saveToken(token: string,role:string): void {
    localStorage.setItem('token', token);
    localStorage.setItem('role', role);

  }

  private removeToken(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('role');

  }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  public get token(): string | null {
    return localStorage.getItem('token');
  }

  login(email: string, password: string): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/bfi/v1/auth/authenticate`, { email, password }).pipe(
      tap(response => {
        if (response && response.token) {
          this.saveToken(response.token,response.role);
          const user = this.loadUserFromToken();
          if (user) {
            this.setCurrentUser(user);
            this.messageService.add({ severity: 'success', summary: 'Login Success', detail: 'Logged in successfully.' });
          } else {
            throw new Error('Failed to load user from token');
          }
        } else {
          throw new Error('No token received in response');
        }
      }),
      catchError(error => {
        console.error('Login error', error);
        this.messageService.add({ severity: 'error', summary: 'Login Failed', detail: error.message || 'An error occurred during login' });
        return throwError(() => error);
      })
    );
  }

  logout(): void {
    this.messageService.add({ severity: 'success', summary: 'Logout Success', detail: 'Logged out successfully.' });
    setTimeout(() => {
      this.removeToken();
      this.currentUserSubject.next(null);
      this.isAuthenticatedSubject.next(false);
      this.router.navigate(['/signin']);
    }, 1000);
  }

  setCurrentUser(user: User): void {
    this.currentUserSubject.next(user);
    console.log("user :",this.currentUserSubject.value);
    this.isAuthenticatedSubject.next(true);
  }

  isAdmin(): boolean {
    const user = this.currentUserValue;
    return user ? user.role === 'ADMIN' : false;
  }

  isAuthenticated(): boolean {
    const token = this.token;
    return !!token && !this.jwtHelper.isTokenExpired(token);
  }
}
