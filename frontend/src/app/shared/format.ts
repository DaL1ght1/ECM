export type FileKind = 'pdf' | 'image' | 'text' | 'doc' | 'sheet' | 'slides' | 'archive' | 'audio' | 'video' | 'code' | 'other';

export interface FileType {
  kind: FileKind;
  extension: string;
  color: string;
  label: string;
}

const KIND_STYLE: Record<FileKind, { color: string; label: string }> = {
  pdf: { color: '#e5484d', label: 'PDF document' },
  image: { color: '#8e4ec6', label: 'Image' },
  text: { color: '#6b7385', label: 'Text document' },
  doc: { color: '#2f6fed', label: 'Word document' },
  sheet: { color: '#18a058', label: 'Spreadsheet' },
  slides: { color: '#f76b15', label: 'Presentation' },
  archive: { color: '#a07a2c', label: 'Archive' },
  audio: { color: '#d6409f', label: 'Audio' },
  video: { color: '#0d74ce', label: 'Video' },
  code: { color: '#12a594', label: 'Source code' },
  other: { color: '#7c8496', label: 'File' },
};

const EXTENSION_KINDS: Record<string, FileKind> = {
  pdf: 'pdf',
  png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', webp: 'image', svg: 'image', bmp: 'image',
  txt: 'text', md: 'text', rtf: 'text', log: 'text', csv: 'sheet',
  doc: 'doc', docx: 'doc', odt: 'doc',
  xls: 'sheet', xlsx: 'sheet', ods: 'sheet',
  ppt: 'slides', pptx: 'slides', odp: 'slides',
  zip: 'archive', rar: 'archive', '7z': 'archive', tar: 'archive', gz: 'archive',
  mp3: 'audio', wav: 'audio', ogg: 'audio', flac: 'audio',
  mp4: 'video', mov: 'video', webm: 'video', mkv: 'video',
  json: 'code', xml: 'code', html: 'code', css: 'code', js: 'code', ts: 'code', java: 'code', py: 'code', sql: 'code', yml: 'code', yaml: 'code',
};

export function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
}

export function fileType(name: string, mimeType?: string | null): FileType {
  const extension = extensionOf(name);
  let kind: FileKind = EXTENSION_KINDS[extension] ?? 'other';
  if (kind === 'other' && mimeType) {
    if (mimeType === 'application/pdf') kind = 'pdf';
    else if (mimeType.startsWith('image/')) kind = 'image';
    else if (mimeType.startsWith('audio/')) kind = 'audio';
    else if (mimeType.startsWith('video/')) kind = 'video';
    else if (mimeType.startsWith('text/')) kind = 'text';
  }
  return { kind, extension, ...KIND_STYLE[kind] };
}

export function isTextLike(mimeType: string | null | undefined, name: string): boolean {
  const kind = fileType(name, mimeType).kind;
  return kind === 'text' || kind === 'code' || (mimeType?.startsWith('text/') ?? false) || extensionOf(name) === 'csv';
}

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined) {
    return '—';
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}

const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
const absolute = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export function formatWhen(value: string | null | undefined, now = Date.now()): string {
  if (!value) {
    return '—';
  }
  const time = parseServerDate(value).getTime();
  const seconds = Math.round((time - now) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 45) return 'just now';
  if (abs < 3600) return relative.format(Math.round(seconds / 60), 'minute');
  if (abs < 86400) return relative.format(Math.round(seconds / 3600), 'hour');
  if (abs < 7 * 86400) return relative.format(Math.round(seconds / 86400), 'day');
  return absolute.format(time);
}

export function formatDateTime(value: string | null | undefined): string {
  return value ? absolute.format(parseServerDate(value)) : '—';
}

export function parseServerDate(value: string): Date {
  const iso = value.includes('T') ? value : value.replace(' ', 'T');
  const normalized = iso.replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
  return new Date(normalized);
}

export function initials(name: string | null | undefined): string {
  if (!name) {
    return '?';
  }
  const parts = name.replace(/@.*/, '').split(/[\s._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}
