export interface Directory {
  id: number;
  name: string;
  path :string;
  parent_id:number;
  parent?: Directory;

}

// file.model.ts
export interface File {
  id:number;
  name: string;
  size: number;
  filetype: string;
  path: string;
  directory_id:number;
  content:string;

}
export interface FilesAndDirectoriesResponse {
  files: File[];
  directories: Directory[];
}
