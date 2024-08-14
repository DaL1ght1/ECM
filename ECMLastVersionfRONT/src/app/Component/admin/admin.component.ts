import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SelectItem, MessageService } from 'primeng/api';
import { AdminService } from '../../Services/admin.service';
import { Person } from '../../Models/person.model';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss'],
  providers: [MessageService]
})
export class AdminComponent implements OnInit {
  pendingUsers: Person[] = [];
  isBanned: boolean = false;
  allUsers: Person[] = [];
  roles: SelectItem[] = [
    {label: 'User', value: 'USER'},
    {label: 'Security', value: 'SECURITY'},
    {label: 'HR', value: 'HR'},
    {label: 'Engineer', value: 'ENGINEER'},
    {label: 'Manager', value: 'MANAGER'},
  ];
  private apiUrl = 'http://localhost:8090/bfi/v1/admin';

  constructor(
    private adminService: AdminService,
    private http: HttpClient,
    private messageService: MessageService
  ) {
  }

  ngOnInit(): void {
    this.loadPendingUsers();
    this.loadAllUsers();
  }

  loadPendingUsers(): void {
    this.adminService.getPendingUsers().subscribe({
        next: users => {
          this.pendingUsers = users;
          console.log(this.pendingUsers);
        },
        error: error => {
          this.messageService.add({severity: 'error', summary: 'Error', detail: 'Failed to load pending users.'});
        }
      }
    );
  }

  approveUser(userId: number, role: string=''): void {
    if(role!=='PENDING') {
      this.adminService.approveUser(userId, role).subscribe({
        next: () => {
          this.loadPendingUsers();
          this.messageService.add({severity: 'success', summary: 'Success', detail: 'User approved successfully.'});
        }
        ,
        error: error => {
          this.messageService.add({severity: 'error', summary: 'Error', detail: 'Failed to approve user.'});
        }
      });
    }
    else {
      this.messageService.add({severity: 'warn', summary: 'warning', detail: 'You need to assign a role to approve user.'});
    }
  }

  declineUser(userId: number): void {
    this.http.delete<void>(`${this.apiUrl}/${userId}`).subscribe({
        next: () => {
          this.loadPendingUsers();
          this.messageService.add({severity: 'success', summary: 'Success', detail: 'User declined successfully.'});
        },
        error: error => {
          this.messageService.add({severity: 'error', summary: 'Error', detail: 'Failed to decline user.'});
        }
      }
    );
  }

  loadAllUsers(): void {
   this.adminService.getAllUsers().subscribe({
      next: users => {
        this.allUsers = users.filter(user => user.role !== 'ADMIN'&& user.enabled);
      },
      error: error => {
        this.messageService.add({severity: 'error', summary: 'Error', detail: 'Failed to load all users.'});
      }
    });
  }

  updateUserRole(userId: number, role: string): void {
    this.adminService.updateUserRole(userId,role).subscribe({
      next: () => {
        this.messageService.add({severity: 'success', summary: 'Success', detail: 'Role updated successfully.'});
      },
      error: error => {
        this.messageService.add({severity: 'error', summary: 'Error', detail: 'Failed to update role.'});
      }
    });
  }

  toggleBanUser(userId: number, isBanned: boolean) {
      this.UserBanStatus(userId);

  }
  UserBanStatus(userId: number): void {
    this.adminService.UserBanStatus(userId).subscribe({
      next:Banned => {

        this.isBanned =Banned;
        this.loadAllUsers();
        if (this.isBanned){
          this.messageService.add({severity: 'success', summary: 'Success', detail: 'User banned  successfully.'});
        }
        else {
          this.messageService.add({severity: 'success', summary: 'Success', detail: 'User unbanned successfully.'});

        }
      },
      error: error => {
        this.messageService.add({severity: 'error', summary: 'Error', detail: 'Failed to ban user.'});
      }
    });
  }
  deleteUser(userId: number) {
    this.adminService.deleteUser(userId).subscribe(() => {
      this.messageService.add({ severity: 'error', summary: 'Deleted', detail: 'User deleted' });
      this.loadAllUsers();
    });
  }
}
