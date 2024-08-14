import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import {HTTP_INTERCEPTORS, HttpClientModule} from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import {RouterModule, Routes} from '@angular/router'; // Optional if using AppRoutingModule

import { AppComponent } from './app.component';
import { MenueBarComponent } from './Component/menue-bar/menue-bar.component';
import { SignInComponent } from './Component/sign-in/sign-in.component';
import { SignUpComponent } from './Component/sign-up/sign-up.component';
import { FileArchiveComponent } from './Component/file-archive/file-archive.component';
import { WelcomComponent } from './Component/welcom/welcom.component';
import { SearchBarComponent } from './Component/search-bar/search-bar.component';
import {AdminComponent} from "./Component/admin/admin.component";

import { MenubarModule } from 'primeng/menubar';
import { TreeModule } from 'primeng/tree';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { RadioButtonModule } from 'primeng/radiobutton';
import { CalendarModule } from 'primeng/calendar';
import { PasswordModule } from 'primeng/password';
import { ToastModule } from 'primeng/toast';
import { FileUploadModule } from 'primeng/fileupload';
import { StepsModule } from 'primeng/steps';
import { CardModule } from 'primeng/card';
import { TreeTableModule } from 'primeng/treetable';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { ToolbarModule } from 'primeng/toolbar';
import { SplitButtonModule } from 'primeng/splitbutton';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { DataViewModule } from 'primeng/dataview';




import { AppRoutingModule } from './app.routes'; // Import AppRoutingModule

import { PersonService } from './Services/person.service';
import { MessageService, ConfirmationService } from 'primeng/api';
import {DataComponent} from "./Component/data/data.component";
import {AdminService} from "./Services/admin.service";
import {FileUploadService} from "./Services/file.service";
import {DropdownModule} from "primeng/dropdown";
import {TableModule} from "primeng/table";
import {NotFoundComponent} from "./Component/not-found/not-found.component";
import {ConfirmMailComponent} from "./Component/confirm-email/confirm-mail.component";
import {InputOtpModule} from "primeng/inputotp";
import {FieldsetModule} from "primeng/fieldset";
import {AuthInterceptor} from "./Services/AuthInterceptor";
import {InputTextareaModule} from "primeng/inputtextarea";
import {StepperModule} from "primeng/stepper";
import {DragDropModule} from "primeng/dragdrop";



const routes: Routes = [
  { path: '', redirectTo: '/welcome', pathMatch: 'full' },
  { path: 'signin', component: SignInComponent },
  { path: 'signup', component: SignUpComponent },
  { path: 'file-archive', component: FileArchiveComponent },
  { path: 'welcome', component: WelcomComponent },
  { path: 'search', component: SearchBarComponent },
  { path: '**', redirectTo: '/file-archive' } // Wildcard route for a 404 page
];



@NgModule({
  declarations: [
    AppComponent,
    DataComponent,
    MenueBarComponent,
    SignInComponent,
    SignUpComponent,
    FileArchiveComponent,
    WelcomComponent,
    SearchBarComponent,
    AdminComponent,
    NotFoundComponent,
    ConfirmMailComponent
  ],
    imports: [
        BrowserModule,
        RouterModule.forRoot(routes),
        AppRoutingModule, // Use AppRoutingModule
        MenubarModule,
        DataViewModule,
        TreeModule,
        InputTextModule,
        CheckboxModule,
        RadioButtonModule,
        FormsModule,
        CalendarModule,
        BrowserAnimationsModule,
        HttpClientModule,
        PasswordModule,
        ToastModule,
        FileUploadModule,
        StepsModule,
        CardModule,
        TreeTableModule,
        AutoCompleteModule,
        ToolbarModule,
        SplitButtonModule,
        ConfirmDialogModule,
        DialogModule,
        OverlayPanelModule,
        DropdownModule,
        ProgressSpinnerModule,
        TableModule,
        InputOtpModule,
        FieldsetModule,
        InputTextareaModule,
        StepperModule,
        DragDropModule
    ],
  providers: [PersonService, MessageService, ConfirmationService,AdminService,FileUploadService,{ provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }],
  bootstrap: [AppComponent]
})
export class AppModule { }
