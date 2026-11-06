import { Injectable, signal } from '@angular/core';

export type ToastKind = 'info' | 'success' | 'error' | 'progress';

export interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  detail?: string;
  progress?: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();
  readonly toasts = signal<Toast[]>([]);

  info(title: string, detail?: string): number {
    return this.push({ kind: 'info', title, detail });
  }

  success(title: string, detail?: string): number {
    return this.push({ kind: 'success', title, detail });
  }

  error(title: string, detail?: string): number {
    return this.push({ kind: 'error', title, detail }, 7000);
  }

  progress(title: string, detail?: string): number {
    return this.push({ kind: 'progress', title, detail, progress: 0 }, 0);
  }

  update(id: number, changes: Partial<Omit<Toast, 'id'>>): void {
    this.toasts.update((toasts) => toasts.map((toast) => (toast.id === id ? { ...toast, ...changes } : toast)));
    if (changes.kind && changes.kind !== 'progress') {
      this.schedule(id, changes.kind === 'error' ? 7000 : 3500);
    }
  }

  dismiss(id: number): void {
    clearTimeout(this.timers.get(id));
    this.timers.delete(id);
    this.toasts.update((toasts) => toasts.filter((toast) => toast.id !== id));
  }

  private push(toast: Omit<Toast, 'id'>, duration = 3500): number {
    const id = this.nextId++;
    this.toasts.update((toasts) => [...toasts.slice(-4), { id, ...toast }]);
    if (duration > 0) {
      this.schedule(id, duration);
    }
    return id;
  }

  private schedule(id: number, duration: number): void {
    clearTimeout(this.timers.get(id));
    this.timers.set(id, setTimeout(() => this.dismiss(id), duration));
  }
}
