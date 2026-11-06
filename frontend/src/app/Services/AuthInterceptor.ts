import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (request.url.includes('/bfi/v1/auth/')) {
      return next.handle(request);
    }
    return next.handle(this.withToken(request, this.authService.token)).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status !== 401) {
          return throwError(() => error);
        }
        // Access token expired: refresh once via the HttpOnly cookie, then retry the original request.
        return this.authService.refresh().pipe(
          switchMap(token => next.handle(this.withToken(request, token))),
          catchError(refreshError => {
            this.authService.logout();
            return throwError(() => refreshError);
          })
        );
      })
    );
  }

  private withToken(request: HttpRequest<any>, token: string | null): HttpRequest<any> {
    return token ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request;
  }
}
