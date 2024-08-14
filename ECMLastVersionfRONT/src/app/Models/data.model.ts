export interface MyDataType {
  id: string;
  name: string;
  type: 'file' | 'directory';
  size?: number; // Size is optional, typically for files
  created: Date;
  modified: Date;
  path: string;
  content:string;
}
