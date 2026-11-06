import { HttpErrorResponse } from '@angular/common/http';

export function errorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return 'The server is unreachable';
    }
    const body = error.error;
    if (body && typeof body === 'object') {
      return body.detail ?? body.message ?? fallback;
    }
    if (typeof body === 'string' && body.length < 200) {
      return body;
    }
  }
  return fallback;
}

export function httpStatus(error: unknown): number | null {
  return error instanceof HttpErrorResponse ? error.status : null;
}
