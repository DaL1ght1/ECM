import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-welcom',
  templateUrl: './welcom.component.html',
  styleUrls: ['./welcom.component.scss']
})
export class WelcomComponent implements OnInit {
  welcomeMessage: string = "Explore our features and services.";

  constructor() { }

  ngOnInit(): void {
    // You can add initialization logic here if needed
  }
}
