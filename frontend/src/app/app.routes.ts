import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SignInComponent } from './Component/sign-in/sign-in.component';
import { SignUpComponent } from './Component/sign-up/sign-up.component';
import { FileArchiveComponent } from './Component/file-archive/file-archive.component';
import { WelcomComponent } from './Component/welcom/welcom.component';
import { SearchBarComponent } from './Component/search-bar/search-bar.component';
import {AdminComponent} from "./Component/admin/admin.component";
import {AuthGuard} from "./Services/Auth.guard";
import {NotFoundComponent} from "./Component/not-found/not-found.component";
import {DataComponent} from "./Component/data/data.component";
import {ConfirmMailComponent} from "./Component/confirm-email/confirm-mail.component";

const routes: Routes = [
  { path: '', redirectTo: '/welcome', pathMatch: 'full' },
  { path: 'signin', component: SignInComponent },
  { path: 'signup', component: SignUpComponent },
  { path: 'filearchive', component: FileArchiveComponent },
  { path: 'welcome', component: WelcomComponent },
  { path: 'dd', component: DataComponent },
  { path: 'search', component: SearchBarComponent },
  { path: 'admin', component: AdminComponent, canActivate: [AuthGuard] }, // Protect admin route
  { path: 'activate-account', component: ConfirmMailComponent },
  { path: '**', component: NotFoundComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

