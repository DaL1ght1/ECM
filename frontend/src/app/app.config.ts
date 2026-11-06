import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideIcons } from '@ng-icons/core';
import {
  lucideX, lucideAppWindow, lucideArrowRight, lucideCheck, lucideChevronLeft, lucideChevronRight, lucideCircleAlert,
  lucideCircleCheck, lucideCloudOff, lucideCloudUpload, lucideCornerLeftUp, lucideDatabaseZap, lucideDownload, lucideEye,
  lucideFile, lucideFileText, lucideFileUp, lucideFileX, lucideFolder, lucideFolderOpen, lucideFolderPlus, lucideFolderX,
  lucideGitCompare, lucideHistory, lucideHouse, lucideImage, lucideInfo, lucideLayoutGrid, lucideList, lucideLogOut,
  lucideMail, lucideMailCheck, lucideMaximize2, lucideMinimize2, lucideMinus, lucideMoon, lucidePencil, lucideRefreshCw,
  lucideRotateCcw, lucideSave, lucideSearch, lucideSettings2, lucideShield, lucideSun, lucideSunMoon, lucideTrash,
  lucideTrash2, lucideUndo2, lucideUpload, lucideUserCheck, lucideUserPlus, lucideUserRound, lucideUsers, lucideUsersRound,
  lucideUserX,
} from '@ng-icons/lucide';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';
import { AuthService } from './core/auth/auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAppInitializer(() => inject(AuthService).restoreSession()),
    provideIcons({
      lucideX, lucideAppWindow, lucideArrowRight, lucideCheck, lucideChevronLeft, lucideChevronRight, lucideCircleAlert,
      lucideCircleCheck, lucideCloudOff, lucideCloudUpload, lucideCornerLeftUp, lucideDatabaseZap, lucideDownload, lucideEye,
      lucideFile, lucideFileText, lucideFileUp, lucideFileX, lucideFolder, lucideFolderOpen, lucideFolderPlus, lucideFolderX,
      lucideGitCompare, lucideHistory, lucideHouse, lucideImage, lucideInfo, lucideLayoutGrid, lucideList, lucideLogOut,
      lucideMail, lucideMailCheck, lucideMaximize2, lucideMinimize2, lucideMinus, lucideMoon, lucidePencil, lucideRefreshCw,
      lucideRotateCcw, lucideSave, lucideSearch, lucideSettings2, lucideShield, lucideSun, lucideSunMoon, lucideTrash,
      lucideTrash2, lucideUndo2, lucideUpload, lucideUserCheck, lucideUserPlus, lucideUserRound, lucideUsers, lucideUsersRound,
      lucideUserX,
    }),
  ],
};
