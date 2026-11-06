import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { fileType } from './format';

@Component({
  selector: 'ecm-file-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-block shrink-0', '[style.width.px]': 'size()', '[style.height.px]': 'size()' },
  template: `
    @if (folder()) {
      <svg viewBox="0 0 64 64" class="h-full w-full drop-shadow-[0_2px_3px_rgb(0_0_0/0.18)]" aria-hidden="true">
        <defs>
          <linearGradient [attr.id]="'fb' + uid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" [attr.stop-color]="shared() ? '#7fd1c6' : '#7fb0ff'" />
            <stop offset="1" [attr.stop-color]="shared() ? '#2f9e8f' : '#3f73f0'" />
          </linearGradient>
          <linearGradient [attr.id]="'ff' + uid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" [attr.stop-color]="shared() ? '#a6e6dc' : '#a9c9ff'" />
            <stop offset="1" [attr.stop-color]="shared() ? '#48b8a8' : '#5b8cff'" />
          </linearGradient>
        </defs>
        <path d="M6 14a4 4 0 0 1 4-4h14l6 6h24a4 4 0 0 1 4 4v30a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4z" [attr.fill]="'url(#fb' + uid + ')'" />
        <path d="M6 24a4 4 0 0 1 4-4h44a4 4 0 0 1 4 4v26a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4z" [attr.fill]="'url(#ff' + uid + ')'" />
        <path d="M6 24a4 4 0 0 1 4-4h44a4 4 0 0 1 4 4v1H6z" fill="rgb(255 255 255 / 0.35)" />
        @if (shared()) {
          <g fill="rgb(255 255 255 / 0.92)">
            <circle cx="28" cy="35" r="4" />
            <circle cx="38" cy="35" r="4" />
            <path d="M20 47a8 7 0 0 1 16 0zM30 47a8 7 0 0 1 16 0z" />
          </g>
        }
      </svg>
    } @else {
      <svg viewBox="0 0 64 64" class="h-full w-full drop-shadow-[0_2px_3px_rgb(0_0_0/0.16)]" aria-hidden="true">
        <path d="M14 4h26l14 14v38a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4z" style="fill: light-dark(#ffffff, #f2f3f7)" />
        <path d="M14 4h26l14 14v38a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4z" fill="none" stroke="rgb(0 0 0 / 0.12)" />
        <path d="M40 4v10a4 4 0 0 0 4 4h10z" fill="rgb(0 0 0 / 0.08)" />
        <rect x="10" y="38" width="44" height="14" rx="0" [attr.fill]="type().color" />
        <text x="32" y="48.5" text-anchor="middle" font-size="9.5" font-weight="700" fill="#fff"
              font-family="ui-sans-serif, system-ui, sans-serif" letter-spacing="0.5">{{ badge() }}</text>
        <g [attr.fill]="type().color" opacity="0.28">
          <rect x="17" y="16" width="18" height="3" rx="1.5" />
          <rect x="17" y="23" width="28" height="3" rx="1.5" />
          <rect x="17" y="30" width="24" height="3" rx="1.5" />
        </g>
      </svg>
    }
  `,
})
export class FileIcon {
  private static nextId = 0;

  readonly name = input('');
  readonly mimeType = input<string | null | undefined>(null);
  readonly folder = input(false);
  readonly shared = input(false);
  readonly size = input(48);

  protected readonly uid = FileIcon.nextId++;
  protected readonly type = computed(() => fileType(this.name(), this.mimeType()));
  protected readonly badge = computed(() => (this.type().extension || this.type().kind).slice(0, 4).toUpperCase());
}
