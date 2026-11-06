import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { EcmApi } from '../../core/api/ecm-api';
import { errorMessage, httpStatus } from '../../core/api/errors';
import { SearchHit, SearchResults } from '../../core/api/models';
import { Launcher } from '../../desktop/launcher.service';
import { FileIcon } from '../../shared/file-icon';
import { fileType, formatBytes, formatWhen } from '../../shared/format';

@Component({
  selector: 'ecm-spotlight',
  imports: [NgIcon, FileIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog #dialog popover="manual" aria-label="Search documents"
            class="fixed inset-x-0 top-[14vh] mx-auto w-[min(44rem,calc(100vw-2rem))] p-0"
            (keydown)="onKeydown($event)">
      <div class="glass-strong overflow-hidden rounded-2xl shadow-[var(--shadow-window)] animate-pop-in">
        <div class="flex items-center gap-3 px-4">
          <ng-icon name="lucideSearch" size="20" class="text-ink-faint" />
          <input #input type="search" class="h-14 flex-1 bg-transparent text-[18px] outline-none placeholder:text-ink-faint"
                 placeholder="Search documents, content and folders…" aria-label="Search" autocomplete="off"
                 [value]="query()" (input)="onInput($any($event.target).value)" />
          @if (loading()) {
            <span class="size-4 animate-spin rounded-full border-2 border-line-strong border-t-accent"></span>
          }
          <button type="button" class="icon-btn" aria-label="Close search" (click)="launcher.toggleSpotlight(false)">
            <ng-icon name="lucideX" size="16" />
          </button>
        </div>

        @if (results(); as results) {
          @if (facetChips().length) {
            <div class="flex flex-wrap gap-1.5 border-t border-line px-4 py-2.5">
              @for (chip of facetChips(); track chip.key) {
                <button type="button" class="badge h-6 gap-1 px-2.5 text-[11.5px] transition-colors"
                        [class.badge-accent]="chip.active" (click)="toggleFacet(chip.facet, chip.value)">
                  <ng-icon [name]="chip.facet === 'type' ? 'lucideFile' : 'lucideFolder'" size="11" />
                  {{ chip.label }} <span class="opacity-60">{{ chip.count }}</span>
                </button>
              }
            </div>
          }
          <ul class="max-h-[52vh] overflow-y-auto border-t border-line p-1.5" role="listbox" aria-label="Results">
            @for (hit of results.hits; track hit.document.id; let i = $index) {
              <li role="option" [attr.aria-selected]="i === activeIndex()"
                  class="flex cursor-default gap-3 rounded-xl px-3 py-2.5"
                  [class.bg-accent-soft]="i === activeIndex()"
                  (mousemove)="activeIndex.set(i)" (click)="open(hit)">
                <ecm-file-icon [name]="hit.document.name" [mimeType]="hit.document.currentVersion?.mimeType" [size]="36" />
                <div class="min-w-0 flex-1">
                  <div class="flex items-baseline gap-2">
                    <span class="truncate font-semibold" [innerHTML]="titleOf(hit)"></span>
                    <span class="shrink-0 text-[11px] text-ink-faint">v{{ hit.document.currentVersion?.versionNumber }} · {{ size(hit) }} · {{ when(hit) }}</span>
                  </div>
                  @for (fragment of hit.highlights['content']?.slice(0, 2) ?? []; track $index) {
                    <p class="mt-0.5 line-clamp-2 text-[12px] leading-relaxed text-ink-soft" [innerHTML]="'… ' + fragment + ' …'"></p>
                  } @empty {
                    <p class="mt-0.5 text-[12px] text-ink-faint">{{ kindLabel(hit) }} · {{ hit.document.owner.name }}</p>
                  }
                </div>
              </li>
            } @empty {
              <li class="px-4 py-10 text-center text-ink-faint">No documents match “{{ query() }}”.</li>
            }
          </ul>
          <footer class="flex items-center gap-4 border-t border-line px-4 py-2 text-[11px] text-ink-faint">
            <span>{{ results.total }} result{{ results.total === 1 ? '' : 's' }}</span>
            <span class="ml-auto flex items-center gap-1"><kbd class="kbd">↑</kbd><kbd class="kbd">↓</kbd> to navigate</span>
            <span class="flex items-center gap-1"><kbd class="kbd">↵</kbd> to open</span>
            <span class="flex items-center gap-1"><kbd class="kbd">esc</kbd> to close</span>
          </footer>
        } @else if (error()) {
          <p class="flex items-center gap-2 border-t border-line px-4 py-4 text-ink-soft">
            <ng-icon name="lucideCloudOff" size="16" class="text-warning" /> {{ error() }}
          </p>
        } @else {
          <p class="border-t border-line px-4 py-3 text-[12px] text-ink-faint">
            Full-text search across names and document content. Typos and accents are forgiven.
          </p>
        }
      </div>
    </dialog>
  `,
  styles: `
    input[type="search"]::-webkit-search-cancel-button {
      -webkit-appearance: none;
      appearance: none;
    }
    .kbd {
      display: inline-grid;
      place-items: center;
      min-width: 1.25rem;
      height: 1.15rem;
      padding: 0 0.25rem;
      border-radius: 0.3rem;
      font-family: var(--font-sans);
      font-size: 10px;
      background: var(--color-hover);
      border: 0.5px solid var(--color-line-strong);
    }
  `,
})
export class Spotlight {
  private readonly api = inject(EcmApi);
  protected readonly launcher = inject(Launcher);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly input = viewChild.required<ElementRef<HTMLInputElement>>('input');

  protected readonly query = signal('');
  protected readonly results = signal<SearchResults | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly activeIndex = signal(0);
  private readonly filters = signal<{ type?: string; folderId?: string }>({});
  private debounce?: ReturnType<typeof setTimeout>;
  private requestId = 0;

  protected readonly facetChips = computed(() => {
    const results = this.results();
    const filters = this.filters();
    if (!results) {
      return [];
    }
    const types = (results.facets['mimeType'] ?? []).map((bucket) => ({
      key: 't:' + bucket.value, facet: 'type' as const, value: bucket.value,
      label: fileType('', bucket.value).label, count: bucket.count, active: filters.type === bucket.value,
    }));
    const folders = (results.facets['folder'] ?? []).map((bucket) => ({
      key: 'f:' + bucket.value, facet: 'folder' as const, value: bucket.value,
      label: bucket.label, count: bucket.count, active: filters.folderId === bucket.value,
    }));
    return [...types, ...folders];
  });

  constructor() {
    effect(() => {
      const dialog = this.dialog().nativeElement;
      if (this.launcher.spotlightOpen()) {
        if (!dialog.matches(':popover-open')) {
          dialog.showPopover();
        }
        queueMicrotask(() => this.input().nativeElement.select());
      } else if (dialog.matches(':popover-open')) {
        dialog.hidePopover();
      }
    });
  }

  protected onInput(value: string): void {
    this.query.set(value);
    clearTimeout(this.debounce);
    this.debounce = setTimeout(() => this.run(), 220);
  }

  protected toggleFacet(facet: 'type' | 'folder', value: string): void {
    this.filters.update((filters) => {
      const key = facet === 'type' ? 'type' : 'folderId';
      return { ...filters, [key]: filters[key] === value ? undefined : value };
    });
    void this.run();
  }

  protected onKeydown(event: KeyboardEvent): void {
    const hits = this.results()?.hits ?? [];
    if (event.key === 'Escape') {
      event.preventDefault();
      this.launcher.toggleSpotlight(false);
    } else if (event.key === 'ArrowDown' && hits.length) {
      event.preventDefault();
      this.activeIndex.update((index) => (index + 1) % hits.length);
    } else if (event.key === 'ArrowUp' && hits.length) {
      event.preventDefault();
      this.activeIndex.update((index) => (index - 1 + hits.length) % hits.length);
    } else if (event.key === 'Enter' && hits[this.activeIndex()]) {
      event.preventDefault();
      this.open(hits[this.activeIndex()]);
    }
  }

  protected open(hit: SearchHit): void {
    this.launcher.toggleSpotlight(false);
    this.launcher.viewer(hit.document);
  }

  protected titleOf(hit: SearchHit): string {
    return hit.highlights['title']?.[0] ?? escapeHtml(hit.document.name);
  }

  protected size(hit: SearchHit): string {
    return formatBytes(hit.document.currentVersion?.size);
  }

  protected when(hit: SearchHit): string {
    return formatWhen(hit.document.updatedAt);
  }

  protected kindLabel(hit: SearchHit): string {
    return fileType(hit.document.name, hit.document.currentVersion?.mimeType).label;
  }

  private async run(): Promise<void> {
    const query = this.query().trim();
    const id = ++this.requestId;
    if (!query) {
      this.results.set(null);
      this.error.set(null);
      this.filters.set({});
      return;
    }
    this.loading.set(true);
    try {
      const results = await this.api.search(query, { ...this.filters(), size: 25 });
      if (id === this.requestId) {
        this.results.set(results);
        this.error.set(null);
        this.activeIndex.set(0);
      }
    } catch (error) {
      if (id === this.requestId) {
        this.results.set(null);
        this.error.set(httpStatus(error) === 503 ? 'Search is temporarily unavailable. Try again in a moment.' : errorMessage(error));
      }
    } finally {
      if (id === this.requestId) {
        this.loading.set(false);
      }
    }
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}
