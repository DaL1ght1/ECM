import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import {Router} from '@angular/router';

@Component({
  selector: 'app-confirm-mail',
  templateUrl: './confirm-mail.component.html',
  styleUrls: ['./confirm-mail.component.scss']
})
export class ConfirmMailComponent {
  token: string = '';
  paragraph :boolean = false;

  constructor(private http: HttpClient, protected router: Router) {}

  onSubmit() {
    this.http.get(`${environment.apiUrl}/bfi/v1/auth/activate-account`, {
      params: { token: this.token }
    }).subscribe({
      next: () => {
        alert('Account activated successfully!');
        this.paragraph = true;
        setTimeout(() => {

          this.router.navigate(['/signin']);
        }, 5000);
      },
      error: (error) => {
        console.error('Activation failed', error);
        if (error.status === 401) {
          alert('The activation token has expired. Please request a new activation link.');
        } else {
          alert('Failed to activate account. Please try again.');
        }
      }
    });
  }

}
