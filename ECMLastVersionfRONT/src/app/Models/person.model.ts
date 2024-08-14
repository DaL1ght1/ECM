export class Person {
  id:number;
  name: string;
  lastName: string;
  gender: string;
  address: string;
  phone: string;
  email: string;
  password: string;
  birthDate: Date;
  role: string;
  accountLocked :boolean;
  enabled : boolean ;

  constructor() {
    this.id=0;
    this.name = '';
    this.lastName = '';
    this.gender = '';
    this.address = '';
    this.phone ='';
    this.email = '';
    this.password = '';
    this.birthDate = new Date();
    this.role = '';
    this.accountLocked = false;
    this.enabled  = false;

  }
}
