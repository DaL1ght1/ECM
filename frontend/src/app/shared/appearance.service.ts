import { Injectable, signal } from '@angular/core';

export type ColorScheme = 'light dark' | 'light' | 'dark';
export type Wallpaper = 'aurora' | 'dusk' | 'lagoon' | 'graphite';

const SCHEME_KEY = 'ecm.color-scheme';
const WALLPAPER_KEY = 'ecm.wallpaper';

@Injectable({ providedIn: 'root' })
export class AppearanceService {
  readonly scheme = signal<ColorScheme>(this.readScheme());
  readonly wallpaper = signal<Wallpaper>(readWallpaper());

  constructor() {
    window.addEventListener('storage', (event) => {
      if (event.key === SCHEME_KEY) {
        this.applyScheme((event.newValue as ColorScheme | null) ?? 'light dark', false);
      }
      if (event.key === WALLPAPER_KEY) {
        this.applyWallpaper((event.newValue as Wallpaper | null) ?? 'aurora', false);
      }
    });
  }

  setScheme(scheme: ColorScheme): void {
    this.applyScheme(scheme, true);
  }

  setWallpaper(wallpaper: Wallpaper): void {
    this.applyWallpaper(wallpaper, true);
  }

  private applyScheme(scheme: ColorScheme, persist: boolean): void {
    this.scheme.set(scheme);
    document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]')!.content = scheme;
    if (persist) {
      try {
        scheme === 'light dark' ? localStorage.removeItem(SCHEME_KEY) : localStorage.setItem(SCHEME_KEY, scheme);
      } catch {}
    }
  }

  private applyWallpaper(wallpaper: Wallpaper, persist: boolean): void {
    this.wallpaper.set(wallpaper);
    if (persist) {
      try {
        localStorage.setItem(WALLPAPER_KEY, wallpaper);
      } catch {}
    }
  }

  private readScheme(): ColorScheme {
    const content = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]')?.content;
    return content === 'light' || content === 'dark' ? content : 'light dark';
  }
}

function readWallpaper(): Wallpaper {
  try {
    const stored = localStorage.getItem(WALLPAPER_KEY);
    return stored === 'dusk' || stored === 'lagoon' || stored === 'graphite' ? stored : 'aurora';
  } catch {
    return 'aurora';
  }
}
