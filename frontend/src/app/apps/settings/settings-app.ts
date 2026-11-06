import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { EcmApi } from '../../core/api/ecm-api';
import { UserDto } from '../../core/api/models';
import { AuthService } from '../../core/auth/auth.service';
import { WindowFrame } from '../../desktop/window-frame';
import { DesktopWindow } from '../../desktop/window-manager.service';
import { AppearanceService, ColorScheme, Wallpaper } from '../../shared/appearance.service';
import { initials } from '../../shared/format';

@Component({
  selector: 'ecm-settings-app',
  imports: [WindowFrame, NgIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <ecm-window [window]="window()">
      <div class="min-h-0 flex-1 overflow-y-auto bg-pane p-6">
        <div class="mx-auto flex max-w-lg flex-col gap-6">
          <section class="flex items-center gap-4">
            <span class="grid size-14 place-items-center rounded-full bg-gradient-to-br from-[#6f93ff] to-[#8e4ec6] text-lg font-bold text-white">
              {{ avatar() }}
            </span>
            <div class="min-w-0 flex-1">
              <p class="truncate text-[15px] font-semibold">{{ auth.user()?.name }}</p>
              <p class="truncate text-ink-soft">{{ auth.user()?.email }}</p>
              <p class="mt-1 flex gap-1.5">
                @for (role of auth.user()?.roles ?? []; track role) { <span class="badge badge-accent">{{ role }}</span> }
                @if (profile()?.phone) { <span class="badge">{{ profile()?.phone }}</span> }
              </p>
            </div>
            <button type="button" class="btn" (click)="auth.logout()"><ng-icon name="lucideLogOut" size="14" /> Sign Out</button>
          </section>

          <section class="flex flex-col gap-2.5">
            <h3 class="text-[12px] font-semibold text-ink-soft">Appearance</h3>
            <div class="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Color scheme">
              @for (option of schemes; track option.value) {
                <button type="button" role="radio" class="choice" [attr.aria-checked]="appearance.scheme() === option.value"
                        (click)="appearance.setScheme(option.value)">
                  <span class="preview" [class]="'preview ' + option.preview"></span>
                  <span class="flex items-center gap-1.5"><ng-icon [name]="option.icon" size="13" /> {{ option.label }}</span>
                </button>
              }
            </div>
          </section>

          <section class="flex flex-col gap-2.5">
            <h3 class="text-[12px] font-semibold text-ink-soft">Wallpaper</h3>
            <div class="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Wallpaper">
              @for (option of wallpapers; track option.value) {
                <button type="button" role="radio" class="choice" [attr.aria-checked]="appearance.wallpaper() === option.value"
                        (click)="appearance.setWallpaper(option.value)">
                  <span class="preview"><span class="wallpaper absolute inset-0 rounded-[inherit]" [attr.data-wallpaper]="option.value"></span></span>
                  <span>{{ option.label }}</span>
                </button>
              }
            </div>
          </section>

          <section class="flex flex-col gap-1.5 rounded-xl border border-line p-4 text-[12px] text-ink-soft">
            <p class="flex items-center gap-2 font-semibold text-ink"><ng-icon name="lucideInfo" size="14" /> About ECM</p>
            <p>Enterprise content management with document versioning, folder permissions and full-text search.</p>
            <p class="text-ink-faint">Shortcuts: Ctrl/⌘ K search · Del move to Trash · F2 rename · Enter open · Backspace up one level</p>
          </section>
        </div>
      </div>
    </ecm-window>
  `,
  styles: `
    .choice {
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
      padding: 0.45rem;
      border-radius: 0.75rem;
      border: 1.5px solid transparent;
      font-size: 12px;
      text-align: left;
    }
    .choice:hover {
      background: var(--color-hover);
    }
    .choice[aria-checked="true"] {
      border-color: var(--color-accent);
      background: var(--color-accent-soft);
    }
    .preview {
      position: relative;
      display: block;
      height: 3.5rem;
      border-radius: 0.5rem;
      overflow: hidden;
      box-shadow: inset 0 0 0 0.5px var(--color-line-strong);
    }
    .preview.light {
      background: linear-gradient(135deg, #f6f7fb 50%, #dfe4f2 50%);
    }
    .preview.dark {
      background: linear-gradient(135deg, #22252f 50%, #11131a 50%);
    }
    .preview.auto {
      background: linear-gradient(135deg, #f6f7fb 50%, #11131a 50%);
    }
  `,
})
export class SettingsApp {
  protected readonly auth = inject(AuthService);
  protected readonly appearance = inject(AppearanceService);
  private readonly api = inject(EcmApi);

  readonly window = input.required<DesktopWindow>();
  protected readonly profile = signal<UserDto | null>(null);

  protected readonly schemes: { value: ColorScheme; label: string; icon: string; preview: string }[] = [
    { value: 'light dark', label: 'Automatic', icon: 'lucideSunMoon', preview: 'auto' },
    { value: 'light', label: 'Light', icon: 'lucideSun', preview: 'light' },
    { value: 'dark', label: 'Dark', icon: 'lucideMoon', preview: 'dark' },
  ];

  protected readonly wallpapers: { value: Wallpaper; label: string }[] = [
    { value: 'aurora', label: 'Aurora' },
    { value: 'dusk', label: 'Dusk' },
    { value: 'lagoon', label: 'Lagoon' },
    { value: 'graphite', label: 'Graphite' },
  ];

  constructor() {
    this.api.me().then((profile) => this.profile.set(profile), () => undefined);
  }

  protected avatar(): string {
    return initials(this.auth.user()?.name);
  }
}
