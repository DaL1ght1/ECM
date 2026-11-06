import { beforeEach, describe, expect, it } from 'vitest';
import { MENU_BAR_HEIGHT, MIN_WIDTH, WindowManager } from './window-manager.service';

describe('WindowManager', () => {
  let wm: WindowManager;

  beforeEach(() => {
    wm = new WindowManager();
    wm.setViewport(1440, 900);
  });

  it('opens windows on top and focuses them', () => {
    const first = wm.open({ kind: 'files', title: 'Home', icon: 'x' });
    const second = wm.open({ kind: 'files', title: 'Home', icon: 'x' });
    const windows = wm.windows();
    expect(windows).toHaveLength(2);
    expect(wm.focusedId()).toBe(second);
    expect(windows.find((w) => w.id === second)!.z).toBeGreaterThan(windows.find((w) => w.id === first)!.z);
  });

  it('reuses a keyed window instead of opening a duplicate', () => {
    const trash = wm.open({ kind: 'trash', key: 'trash', title: 'Trash', icon: 'x' });
    wm.open({ kind: 'files', title: 'Home', icon: 'x' });
    expect(wm.open({ kind: 'trash', key: 'trash', title: 'Trash', icon: 'x' })).toBe(trash);
    expect(wm.windows()).toHaveLength(2);
    expect(wm.focusedId()).toBe(trash);
  });

  it('minimizing moves focus to the next window and focusing restores it', () => {
    const first = wm.open({ kind: 'files', title: 'A', icon: 'x' });
    const second = wm.open({ kind: 'files', title: 'B', icon: 'x' });
    wm.minimize(second);
    expect(wm.focusedId()).toBe(first);
    expect(wm.minimized().map((w) => w.id)).toEqual([second]);
    wm.focus(second);
    expect(wm.minimized()).toHaveLength(0);
    expect(wm.focusedId()).toBe(second);
  });

  it('keeps windows reachable below the menu bar', () => {
    const id = wm.open({ kind: 'files', title: 'A', icon: 'x' });
    wm.moveTo(id, -5000, -5000);
    const window = wm.windows()[0];
    expect(window.y).toBe(MENU_BAR_HEIGHT);
    expect(window.x + window.width).toBeGreaterThanOrEqual(80);
  });

  it('enforces a minimum size', () => {
    const id = wm.open({ kind: 'files', title: 'A', icon: 'x' });
    wm.resizeTo(id, { x: 100, y: 100, width: 10, height: 10 });
    expect(wm.windows()[0].width).toBe(MIN_WIDTH);
  });

  it('routes commands to the focused window of the requested kind', () => {
    const files = wm.open({ kind: 'files', title: 'A', icon: 'x' });
    wm.open({ kind: 'settings', key: 'settings', title: 'Settings', icon: 'x' });
    const received: string[] = [];
    wm.commands.subscribe((command) => received.push(`${command.windowId}:${command.command}`));
    expect(wm.send('new-folder')).toBe(files);
    expect(received).toEqual([`${files}:new-folder`]);
    expect(wm.focusedId()).toBe(files);
  });
});
