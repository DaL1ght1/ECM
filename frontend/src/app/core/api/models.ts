export type AccessLevel = 'READ' | 'WRITE';
export type PrincipalType = 'USER' | 'ROLE';

export interface UserSummary {
  id: string;
  name: string;
  email: string;
}

export interface FolderDto {
  id: string;
  name: string;
  parentId: string | null;
  owner: UserSummary;
  access: AccessLevel | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentVersionDto {
  versionNumber: number;
  size: number;
  mimeType: string;
  sha256: string;
  comment: string | null;
  createdBy: UserSummary;
  createdAt: string;
}

export interface DocumentDto {
  id: string;
  name: string;
  folderId: string | null;
  owner: UserSummary;
  currentVersion: DocumentVersionDto | null;
  lockVersion: number;
  access: AccessLevel;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface FolderContents {
  folder: FolderDto | null;
  breadcrumbs: FolderDto[];
  folders: FolderDto[];
  documents: DocumentDto[];
}

export interface Permission {
  principalType: PrincipalType;
  principal: string;
  access: AccessLevel;
  displayName?: string;
}

export interface FacetBucket {
  value: string;
  label: string;
  count: number;
}

export interface SearchHit {
  document: DocumentDto;
  score: number;
  highlights: Record<string, string[]>;
}

export interface SearchResults {
  total: number;
  page: number;
  size: number;
  hits: SearchHit[];
  facets: Record<string, FacetBucket[]>;
}

export interface UserDto {
  id: number;
  uuid: string;
  name: string | null;
  lastName: string | null;
  email: string;
  dateOfBirth: string | null;
  gender: string | null;
  address: string | null;
  phone: string | null;
  role: string | null;
  enabled: boolean;
  accountLocked: boolean;
}

export interface AuthResponse {
  token: string;
  expiresIn: number;
  role: string;
  approved: boolean;
  accountLocked: boolean;
}

export interface RegistrationRequest {
  name: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
}

export const ASSIGNABLE_ROLES = ['USER', 'SECURITY', 'HR', 'ENGINEER', 'MANAGER', 'ADMIN'] as const;

export const API = '/api/v1';
