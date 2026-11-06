import { Injectable, signal } from '@angular/core';

export interface MenuAction {
  label: string;
  icon?: string;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  checked?: boolean;
  action: () => void;
}

export type MenuEntry = MenuAction | 'separator';

export interface OpenMenu {
  x: number;
  y: number;
  items: MenuEntry[];
  anchor?: HTMLElement;
  fromKeyboard: boolean;
}

@Injectable({ providedIn: 'root' })
export class ContextMenuService {
  readonly current = signal<OpenMenu | null>(null);

  openAt(event: MouseEvent, items: MenuEntry[]): void {
    event.preventDefault();
    event.stopPropagation();
    this.current.set({ x: event.clientX, y: event.clientY, items, fromKeyboard: event.detail === 0 && event.button !== 2 });
  }

  openBelow(anchor: HTMLElement, items: MenuEntry[], fromKeyboard = false): void {
    const rect = anchor.getBoundingClientRect();
    this.current.set({ x: rect.left, y: rect.bottom + 4, items, anchor, fromKeyboard });
  }

  close(): void {
    this.current.set(null);
  }
}
