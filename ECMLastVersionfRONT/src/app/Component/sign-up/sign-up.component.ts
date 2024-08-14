import {Component, OnInit, ViewChild} from '@angular/core';
import { Person } from '../../Models/person.model';
import { PersonService } from '../../Services/person.service';
import { MenuItem, MessageService } from 'primeng/api';
import { AuthService } from '../../Services/auth.service';
import { Router } from '@angular/router';
import {Stepper} from "primeng/stepper";
import {environment} from "../../environments/environment";
import {HttpClient} from "@angular/common/http";

@Component({
  selector: 'app-person-form',
  templateUrl: './sign-up.component.html',
  styleUrls: ['./sign-up.component.scss'],
  providers: [MessageService]
})
export class SignUpComponent implements OnInit {
  @ViewChild('stepper') stepper: Stepper | undefined;
  activeIndex: number = 0;

  date: Date;
  person: Person = new Person();
  rePassword: string = '';

  loading: boolean = false;
  pass:boolean = false;

  RequiredNameError: boolean = false;
  RequiredLastNameError: boolean = false;
  RequiredPhoneError: boolean = false;
  RequiredDateOfBirthError: boolean = false;
  RequiredAddressError: boolean = false;
  RequiredPasswordError: boolean = false;
  RequiredRePasswordError: boolean = false;
  passwordMismatchError: boolean = false;
  RequiredEmailError: boolean = false;
  showSuccessModal: boolean = false;
  passwordLengthError: boolean = false;
  emailFormatError: boolean = false;
  tokens: string = '';
  paragraph :boolean = false;

  step: number = 1;

  constructor(private personService: PersonService,
              private authService: AuthService,
              private router: Router,
              private messageService: MessageService,
              private  http: HttpClient) {
    this.date = new Date();
  }
  items: MenuItem[] | undefined;

  ngOnInit() {
    this.items = [
      {
        label: 'Personal',
        routerLink: 'personal'
      },
      {
        label: 'Security',
        routerLink: 'security'
      }
    ];
  }

  nextStep(): void {
    this.RequiredNameError = !this.person.name;
    this.RequiredLastNameError = !this.person.lastName;
    this.RequiredPhoneError = !this.person.phone;

    if (this.RequiredNameError || this.RequiredLastNameError || this.RequiredPhoneError) {
      this.showError('Please fill out all required fields.');
      return;
    }

    this.activeIndex++;
  }

  previousStep(): void {
    this.activeIndex--;
  }

  submitForm(): void {
    this.RequiredAddressError = !this.person.address;
    this.RequiredDateOfBirthError = !this.date;
    this.RequiredEmailError = !this.person.email;
    this.RequiredPasswordError = !this.person.password;
    this.RequiredRePasswordError = !this.rePassword;
    this.passwordMismatchError = this.person.password !== this.rePassword;
    this.passwordLengthError = this.person.password.length < 8;
    this.emailFormatError = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.person.email);

    if (
      this.RequiredAddressError ||
      this.RequiredDateOfBirthError ||
      this.RequiredPasswordError ||
      this.RequiredRePasswordError ||
      this.RequiredEmailError ||
      this.passwordLengthError ||
      this.emailFormatError
    ) {
      this.showError('Please fill out all required fields correctly.');
      return;
    }
    if (this.passwordMismatchError){
      this.showError('Passwords do not match');
      return;
    }


    this.loading = true;

    this.person.birthDate = this.date;

    this.personService.addPerson(this.person).subscribe({
      next: response => {
        this.loading = false;
        this.showSuccessModal = true;
      },
      error: error => {
        this.loading = false;
        if (error.status === 400 && error.error === 'Email already exists') {
          this.showError('Email already exists.');
        } else {
          this.showError('An error occurred while processing your request.');
          console.error('Error adding person:', error);
        }
      }
    });

  }

  onSubmit() {
    this.http.get(`${environment.apiUrl}/bfi/v1/auth/activate-account`, {
      params: { token: this.tokens }
    }).subscribe({
      next: () => {
        alert('Account activated successfully!');
        this.paragraph = true;
        setTimeout(() => {
          this.resetForm();
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


  validatePass(): void {
    this.RequiredPasswordError = !this.person.password;
    this.RequiredRePasswordError = !this.rePassword;
    this.passwordMismatchError = this.person.password !== this.rePassword;
    this.passwordLengthError = this.person.password.length < 8;
  }

  resetForm(): void {
    this.activeIndex = 0;
    this.person = new Person();
    this.rePassword = '';
    this.date = new Date();
    this.RequiredNameError = false;
    this.RequiredLastNameError = false;
    this.RequiredEmailError = false;
    this.RequiredPhoneError = false;
    this.RequiredAddressError = false;
    this.RequiredDateOfBirthError = false;
    this.RequiredPasswordError = false;
    this.RequiredRePasswordError = false;
    this.passwordMismatchError = false;
    this.RequiredEmailError = false;
    this.step = 1;
    this.passwordLengthError = false;
    this.emailFormatError = false;
  }

  SignIn() {
    this.router.navigate(['/signin']);
  }

  showError(message: string): void {
    this.messageService.add({ severity: 'error', summary: 'Error', detail: message });
  }
  onDialogOk(): void {
    this.showSuccessModal = false; // Close the modal
    this.activeIndex++; // Move to the next step after the user clicks OK
  }

}
