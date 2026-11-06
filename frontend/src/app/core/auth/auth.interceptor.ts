import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { API } from '../api/models';
import { AuthService } from './auth.service';

const PUBLIC_ENDPOINTS = ['/auth/authenticate', '/auth/refresh', '/auth/register', '/auth/activate-account', '/auth/logout'];

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith(API) || PUBLIC_ENDPOINTS.some((path) => request.url.startsWith(API + path))) {
    return next(request);
  }
  const auth = inject(AuthService);
  return next(withToken(request, auth.accessToken())).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401) {
        return throwError(() => error);
      }
      return auth.refresh().pipe(
        switchMap((token) => next(withToken(request, token))),
        catchError((refreshError) => {
          auth.endSession();
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};

function withToken(request: HttpRequest<unknown>, token: string | null): HttpRequest<unknown> {
  return token ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request;
}
