import { Component } from '@angular/core';
import { AuthService } from '../../Services/auth.service';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-sign-in',
  templateUrl: './sign-in.component.html',
  styleUrls: ['./sign-in.component.scss'],
  providers: [MessageService]
})
export class SignInComponent {
  email: string = '';
  password: string = '';

  constructor(private authService: AuthService, private router: Router, private messageService: MessageService) { }

  submitForm(): void {
    if (!this.validateInput()) {
      return;
    }

    this.authService.login(this.email, this.password).subscribe({
      next: (response) => {
        if (response && response.token) {
          if (response.approved) {
            this.messageService.add({ severity: 'success', summary: 'Login Success', detail: 'Logged in successfully.' });
            setTimeout(() => {
              if (response.role === 'ADMIN') {
                this.router.navigate(['/admin']);
              } else {
                this.router.navigate(['/filearchive']);
              }
            }, 1000);
          } else {
            this.messageService.add({ severity: 'warn', summary: 'Account Not Approved', detail: 'Your account is not approved yet. Please contact the administrator.' });
          }
        } else {
          this.messageService.add({ severity: 'error', summary: 'Login Error', detail: 'Invalid response from server.' });
        }
      },
      error: (error: HttpErrorResponse) => {
        console.error('Login error:', error);
        let errorMessage = 'An unexpected error occurred. Please try again later.';

        switch (error.status) {
          case 400:
            errorMessage = 'Invalid request. Please check your input and try again.';
            break;
          case 401:
            errorMessage = 'Invalid email or password.';
            break;
          case 403:
            errorMessage = 'Access forbidden. You do not have permission to log in.';
            break;
          case 404:
            errorMessage = 'Login service not found. Please contact support.';
            break;
          case 408:
            errorMessage = 'Request timeout. Please check your internet connection and try again.';
            break;
          case 429:
            errorMessage = 'Too many login attempts. Please try again later.';
            break;
          case 500:
            errorMessage = 'Server error. Please try again later or contact support.';
            break;
          case 502:
          case 503:
          case 504:
            errorMessage = 'Server is currently unavailable. Please try again later.';
            break;
        }

        if (error.error instanceof ErrorEvent) {
          // Client-side error
          errorMessage = `Client error: ${error.error.message}`;
        } else if (error.error && typeof error.error === 'object' && 'message' in error.error) {
          // Server-side error with a specific message
          errorMessage = error.error.message;
        }

        this.messageService.add({ severity: 'error', summary: 'Login Failed', detail: errorMessage });

        // Handle network errors
        if (!navigator.onLine) {
          this.messageService.add({ severity: 'error', summary: 'Network Error', detail: 'Please check your internet connection and try again.' });
        }
      }
    });
  }

  validateInput(): boolean {
    if (!this.email) {
      this.messageService.add({ severity: 'error', summary: 'Validation Error', detail: 'Email is required.' });
      return false;
    }

    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
    if (!emailRegex.test(this.email)) {
      this.messageService.add({ severity: 'error', summary: 'Validation Error', detail: 'Invalid email format.' });
      return false;
    }

    if (!this.password) {
      this.messageService.add({ severity: 'error', summary: 'Validation Error', detail: 'Password is required.' });
      return false;
    }

    if (this.password.length < 8) {
      this.messageService.add({ severity: 'error', summary: 'Validation Error', detail: 'Password must be at least 8 characters long.' });
      return false;
    }

    return true;
  }

  register(): void {
    this.router.navigate(['/signup']);
  }




}
