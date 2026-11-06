import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { AppearanceService } from '../shared/appearance.service';

@Component({
  selector: 'ecm-auth-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="wallpaper fixed inset-0" [attr.data-wallpaper]="appearance.wallpaper()"></div>
    <div class="fixed inset-0 backdrop-blur-[40px]" style="background: light-dark(rgb(255 255 255 / 0.12), rgb(0 0 0 / 0.25))"></div>
    <main class="relative flex h-full flex-col items-center overflow-y-auto px-4 pb-10 pt-[9vh]">
      <p class="text-[15px] font-medium text-white/85 drop-shadow">{{ date() }}</p>
      <p class="mb-10 text-[84px] font-semibold leading-none tracking-tight text-white drop-shadow-[0_4px_18px_rgb(0_0_0/0.25)] tabular-nums">{{ time() }}</p>
      <ng-content />
    </main>
  `,
  host: { class: 'block h-full' },
})
export class AuthShell {
  protected readonly appearance = inject(AppearanceService);
  private readonly now = signal(new Date());
  private readonly timeFormat = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });
  private readonly dateFormat = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

  protected readonly time = computed(() => this.timeFormat.format(this.now()));
  protected readonly date = computed(() => this.dateFormat.format(this.now()));

  constructor() {
    const timer = setInterval(() => this.now.set(new Date()), 5_000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }
}
