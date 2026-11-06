import { computed, Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';

export type AppKind = 'files' | 'viewer' | 'trash' | 'admin' | 'settings';

export interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DesktopWindow extends WindowBounds {
  id: string;
  kind: AppKind;
  key: string;
  title: string;
  icon: string;
  z: number;
  minimized: boolean;
  maximized: boolean;
  data: Record<string, unknown>;
}

export interface OpenRequest {
  kind: AppKind;
  key?: string;
  title: string;
  icon: string;
  data?: Record<string, unknown>;
  width?: number;
  height?: number;
}

export interface WindowCommand {
  windowId: string;
  command: string;
}

export const MENU_BAR_HEIGHT = 30;
export const DOCK_RESERVE = 84;
export const MIN_WIDTH = 360;
export const MIN_HEIGHT = 240;

@Injectable({ providedIn: 'root' })
export class WindowManager {
  private sequence = 0;
  private topZ = 10;
  private readonly viewport = signal({ width: 1280, height: 800 });

  readonly windows = signal<DesktopWindow[]>([]);
  readonly focusedId = signal<string | null>(null);
  readonly commands = new Subject<WindowCommand>();

  readonly focused = computed(() => this.windows().find((window) => window.id === this.focusedId() && !window.minimized) ?? null);
  readonly minimized = computed(() => this.windows().filter((window) => window.minimized));

  setViewport(width: number, height: number): void {
    this.viewport.set({ width, height });
    this.windows.update((windows) => windows.map((window) => ({ ...window, ...this.clamp(window) })));
  }

  workArea(): WindowBounds {
    const { width, height } = this.viewport();
    return { x: 0, y: MENU_BAR_HEIGHT, width, height: Math.max(MIN_HEIGHT, height - MENU_BAR_HEIGHT - DOCK_RESERVE) };
  }

  open(request: OpenRequest): string {
    const key = request.key ?? `${request.kind}:${++this.sequence}`;
    const existing = this.windows().find((window) => window.key === key);
    if (existing) {
      this.update(existing.id, { data: { ...existing.data, ...request.data }, title: request.title });
      this.focus(existing.id);
      return existing.id;
    }

    const area = this.workArea();
    const width = Math.min(request.width ?? 900, area.width - 24);
    const height = Math.min(request.height ?? 580, area.height - 16);
    const cascade = (this.windows().length % 8) * 28;
    const x = Math.max(12, Math.round((area.width - width) / 2) - 120 + cascade);
    const y = area.y + Math.max(8, Math.round((area.height - height) / 2) - 60 + cascade);

    const window: DesktopWindow = {
      id: `w${++this.sequence}`,
      key,
      kind: request.kind,
      title: request.title,
      icon: request.icon,
      data: request.data ?? {},
      z: ++this.topZ,
      minimized: false,
      maximized: false,
      ...this.clamp({ x, y, width, height }),
    };
    this.windows.update((windows) => [...windows, window]);
    this.focusedId.set(window.id);
    return window.id;
  }

  close(id: string): void {
    this.windows.update((windows) => windows.filter((window) => window.id !== id));
    if (this.focusedId() === id) {
      this.focusTopmost();
    }
  }

  closeAll(): void {
    this.windows.set([]);
    this.focusedId.set(null);
  }

  focus(id: string): void {
    const window = this.windows().find((candidate) => candidate.id === id);
    if (!window) {
      return;
    }
    if (window.z !== this.topZ || window.minimized) {
      this.update(id, { z: ++this.topZ, minimized: false });
    }
    this.focusedId.set(id);
  }

  minimize(id: string): void {
    this.update(id, { minimized: true });
    if (this.focusedId() === id) {
      this.focusTopmost();
    }
  }

  minimizeAll(): void {
    this.windows.update((windows) => windows.map((window) => ({ ...window, minimized: true })));
    this.focusedId.set(null);
  }

  toggleMaximize(id: string): void {
    const window = this.windows().find((candidate) => candidate.id === id);
    if (window) {
      this.update(id, { maximized: !window.maximized });
      this.focus(id);
    }
  }

  moveTo(id: string, x: number, y: number): void {
    const window = this.windows().find((candidate) => candidate.id === id);
    if (window) {
      this.update(id, this.clamp({ ...window, x, y }));
    }
  }

  resizeTo(id: string, bounds: WindowBounds): void {
    this.update(id, this.clamp(bounds));
  }

  setTitle(id: string, title: string): void {
    this.update(id, { title });
  }

  setData(id: string, data: Record<string, unknown>): void {
    const window = this.windows().find((candidate) => candidate.id === id);
    if (window) {
      this.update(id, { data: { ...window.data, ...data } });
    }
  }

  send(command: string, kind: AppKind = 'files'): string | null {
    const focused = this.focused();
    const target = focused?.kind === kind
      ? focused
      : [...this.windows()].filter((window) => window.kind === kind && !window.minimized).sort((a, b) => b.z - a.z)[0];
    if (!target) {
      return null;
    }
    this.focus(target.id);
    this.commands.next({ windowId: target.id, command });
    return target.id;
  }

  ofKind(kind: AppKind): DesktopWindow[] {
    return this.windows().filter((window) => window.kind === kind);
  }

  clamp(bounds: WindowBounds): WindowBounds {
    const area = this.workArea();
    const width = Math.max(MIN_WIDTH, Math.min(bounds.width, area.width));
    const height = Math.max(MIN_HEIGHT, Math.min(bounds.height, area.height + DOCK_RESERVE));
    const x = Math.min(Math.max(bounds.x, 80 - width), area.width - 80);
    const y = Math.min(Math.max(bounds.y, area.y), area.y + area.height + DOCK_RESERVE - 40);
    return { x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) };
  }

  private update(id: string, changes: Partial<DesktopWindow>): void {
    this.windows.update((windows) => windows.map((window) => (window.id === id ? { ...window, ...changes } : window)));
  }

  private focusTopmost(): void {
    const top = this.windows().filter((window) => !window.minimized).sort((a, b) => b.z - a.z)[0];
    this.focusedId.set(top?.id ?? null);
  }
}
