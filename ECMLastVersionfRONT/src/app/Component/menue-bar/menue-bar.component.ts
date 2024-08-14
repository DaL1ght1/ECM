import { Component, OnInit } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { AuthService } from '../../Services/auth.service';

@Component({
  selector: 'app-menue-bar',
  templateUrl: './menue-bar.component.html',
  styleUrls: ['./menue-bar.component.scss']
})
export class MenueBarComponent implements OnInit {
  menuItems: MenuItem[] = [];

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.updateMenuItems();

    // Subscribe to authentication status changes
    this.authService.isAuthenticated$.subscribe(() => {
      this.updateMenuItems();
    });
  }

  private updateMenuItems(): void {
    const isAuthenticated = this.authService.isAuthenticated();
    const isAdmin = this.authService.isAdmin();

    this.menuItems = [
      {
        label: 'Admin',
        icon: 'pi pi-cog',
        routerLink: ['/admin'],
        visible: isAdmin
      },
      {
        label: 'All files',
        icon: 'pi pi-home',
        routerLink: ['/filearchive'],
      },
      {
        label: 'Sign In',
        icon: 'pi pi-sign-in',
        routerLink: ['/signin'],
        visible: !isAuthenticated
      },
      {
        label: 'Sign Up',
        icon: 'pi pi-user-plus',
        routerLink: ['/signup'],
        visible: !isAuthenticated
      },

      {
        label: 'Sign Out',
        icon: 'pi pi-sign-out',
        visible: isAuthenticated,
        command: () => this.authService.logout()
      }
    ];
  }
}
