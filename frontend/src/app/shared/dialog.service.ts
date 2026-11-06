import { Injectable, signal } from '@angular/core';

export interface PromptOptions {
  title: string;
  message?: string;
  label: string;
  value?: string;
  confirmText?: string;
  selectBaseName?: boolean;
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  danger?: boolean;
}

export type DialogRequest =
  | ({ type: 'prompt'; resolve: (value: string | null) => void } & PromptOptions)
  | ({ type: 'confirm'; resolve: (value: boolean) => void } & ConfirmOptions);

@Injectable({ providedIn: 'root' })
export class DialogService {
  readonly current = signal<DialogRequest | null>(null);

  prompt(options: PromptOptions): Promise<string | null> {
    return new Promise((resolve) => this.open({ type: 'prompt', ...options, resolve }));
  }

  confirm(options: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => this.open({ type: 'confirm', ...options, resolve }));
  }

  settle(value: string | boolean | null): void {
    const request = this.current();
    if (!request) {
      return;
    }
    this.current.set(null);
    if (request.type === 'prompt') {
      request.resolve(typeof value === 'string' ? value : null);
    } else {
      request.resolve(value === true);
    }
  }

  private open(request: DialogRequest): void {
    this.settle(null);
    this.current.set(request);
  }
}
