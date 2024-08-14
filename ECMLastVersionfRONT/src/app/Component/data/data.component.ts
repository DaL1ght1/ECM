import {Component, OnInit, ViewChild} from '@angular/core';
import {ConfirmationService, MenuItem, TreeNode, TreeTableNode} from 'primeng/api';
import { FileUploadService } from '../../Services/file.service';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef } from '@angular/core';
import { MessageService } from 'primeng/api';
import {OverlayPanel} from "primeng/overlaypanel";

@Component({
  selector: 'file-archive',
  templateUrl: './data.component.html',
  styleUrls: ['./data.component.scss'],
  providers: [MessageService,ConfirmationService]
})
export class DataComponent implements OnInit {
  private apiUrl = 'http://localhost:8090/bfi/v1';



  cols!: any[];
  selectedFiles: File[] = [];
  selectedFileName: string = 'No file selected';
  message: string = '';
  selectedNode?: TreeNode;
  selectedNode2?: TreeTableNode<any> | TreeTableNode<any>[] | null;
  files: TreeNode[] = [];
  newDirectoryName: string = '';
  tree: TreeNode[] = [];
  id: number = 1;
  items: MenuItem[] | undefined;
  fileopp: MenuItem[] | undefined;
  updatedFile?: File;
  updatedName: string = '';
  updatedParentId?: number;
  displayUpdateDialog: boolean = false;
  isDirectoryUpdate: boolean = false;
  @ViewChild('searchPanel') searchPanel!: OverlayPanel;
  searchTerm: string = '';
  filteredFiles: { id: number, name: string }[] = [];
  notFound :boolean = false;
  selectedFileDetails: any = null;
  displayFileDetailsDialog: boolean = false;


  constructor(
    private fileUploadService: FileUploadService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit() {
    this.cols = [
      { field: 'name', header: 'Name' },
      { field: 'size', header: 'Size' },
      { field: 'filetype', header: 'Type' }
    ];

    this.items = [
      {
        label: 'Update',
        icon: 'pi pi-refresh'
      },
      {
        label: 'Delete',
        icon: 'pi pi-times'
      },
      {
        label: 'Angular',
        icon: 'pi pi-external-link',
        url: 'http://angular.io'
      },
      {
        label: 'Router',
        icon: 'pi pi-upload',
        routerLink: '/fileupload'
      }
    ];

    this.fileopp = [
      {
        label: 'Choose',
        icon: 'pi pi-file',
        command: () => this.chooseFile()
      },
      {
        label: 'Upload',
        icon: 'pi pi-upload',
        command: () => this.onUpload()
      }
    ];

    this.fetchFilesAndDirectories();
  }

  chooseFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.style.display = 'none';
    input.addEventListener('change', (event: any) => {
      this.onFileSelected(event);
    });
    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  }

  onFileSelected(event: any) {
    this.selectedFiles = Array.from(event.target.files);
    if (this.selectedFiles.length > 0) {
      this.selectedFileName = this.selectedFiles[0].name; // Update label to selected file name
    } else {
      this.selectedFileName = 'No file selected'; // Reset label if no file selected
    }
  }
  onSearchClick(event: Event) {
    this.searchPanel.toggle(event);
  }

  searchFiles(event: any) {
    this.http.get<{ [key: string]: string }>(`${this.apiUrl}/search`, {
      params: { mot: event.query }
    }).subscribe({
      next: (response) => {
        if (response && Object.keys(response).length > 0) {
          this.filteredFiles = Object.entries(response).map(([id, name]) => ({
            id: Number(id),
            name
          }));
          this.notFound = false; // Reset the not found flag
        } else {
          this.filteredFiles = [];
          this.notFound = true; // Set the not found flag
        }
      },
      error: (error) => {
        console.error('Error searching files:', error);
        this.filteredFiles = [];
        this.notFound = true; // Handle errors as not found
      }
    });
  }



  onUpload() {
    if (this.selectedFiles.length > 0) {
      this.selectedFiles.forEach(file => {
        const fileName = file.name;
        const parentDirectoryId = this.selectedNode && this.selectedNode.data.name !== 'Root' ? this.selectedNode.data.id : 1;

        // Check for name conflicts
        if (this.files.some(node => node.data.name === fileName && node.data.filetype !== 'directory' && node.parent && node.parent.data.id === parentDirectoryId)) {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'A file with the same name already exists' });
          return;
        }

        if (this.files.some(node => node.data.name === fileName && node.data.filetype === 'directory' && node.parent && node.parent.data.id === parentDirectoryId)) {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'A directory with the same name already exists' });
          return;
        }

        const uploadId = this.id;
        this.fileUploadService.upload(file, uploadId).subscribe({
          next: (response: any) => {
            console.log('Upload response:', response);
            this.messageService.add({ severity: 'success', summary: 'Success', detail: 'File uploaded successfully' });
            this.fetchFilesAndDirectories();
          },
          error: (err: any) => {
            console.error('Upload error:', err);
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to upload file' });
          }
        });
      });
      this.selectedFiles = [];
      this.selectedFileName = 'No file selected'; // Reset file name after upload
    } else {
      this.messageService.add({ severity: 'warn', summary: 'Warning', detail: 'No files selected for upload' });
    }
  }

  fetchFilesAndDirectories() {
    this.fileUploadService.getAllFilesAndDirectories().subscribe({
      next: (response: any) => {
        const { files, directories } = response;
        this.tree = this.buildFileTree(files, directories);
        this.files = [...this.tree];
        this.cdr.detectChanges();
      },
      error: error => {
        console.error("Error fetching files and directories:", error);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to fetch files and directories' });
      }
    });
  }

  buildFileTree(files: any[], directories: any[]): TreeNode[] {
    const map = new Map<string, TreeNode>();

    const createNode = (item: any): TreeNode => ({
      data: {
        id: item.id,
        name: item.name,
        size: item.size || '',
        filetype: item.filetype || 'directory'
      },
      children: [],
      expanded: false,
      selectable: true
    });

    directories.forEach(directory => {
      const path = directory.path;
      const node = createNode(directory);
      map.set(path, node);
    });

    const rootNode: TreeNode = {
      data: { id: 1, name: 'Root', size: '', filetype: 'directory' },
      children: [],
      expanded: false,
      selectable: true
    };

    map.set('root', rootNode);

    files.forEach(file => {
      const path = file.path;
      if (!map.has(path)) {
        const node = createNode(file);
        map.set(path, node);
      } else {
        const existingNode = map.get(path);
        if (existingNode) {
          const parentPath = this.getParentPath(path);
          const parentNode = map.get(parentPath);
          if (parentNode) {
            const fileNode = createNode(file);
            parentNode.children = parentNode.children ?? [];
            if (!parentNode.children.find(child => child.data.name === fileNode.data.name)) {
              parentNode.children.push(fileNode);
            }
          } else {
            console.error(`Parent node not found for path: ${parentPath}`);
          }
        }
      }
    });

    map.forEach((node, path) => {
      const item = directories.find(d => d.path === path) || files.find(f => f.path === path);
      if ((item && (item.parent_id || item.directory_id)) && (item.path !== 'root')) {
        let parentPath = item.path;
        if (item.parent_id) {
          parentPath = this.getParentPath(item.path);
        }
        const parentNode = map.get(parentPath!);
        if (parentNode) {
          parentNode.children = parentNode.children ?? [];
          if (!parentNode.children.find(child => child.data.name === node.data.name)) {
            parentNode.children.push(node);
          }
        } else {
          console.error(`Parent node not found for path: ${parentPath}`);
        }
      } else {
        if (path !== 'root') {
          if (!rootNode.children!.find(n => n.data.name === node.data.name)) {
            rootNode.children!.push(node);
          }
        }
      }
    });

    return [rootNode];
  }

  onNodeSelect(event: any) {
    this.selectedNode = event.node;
    this.id = event.node.data.id;
    this.isDirectoryUpdate = this.selectedNode!.data.filetype === 'directory';
    console.log(this.id);
    console.log(event.node.data.name);

    // Update displayFileDetailsDialog instead of directly using selectedFileDetails
    this.selectedFileDetails = event.node.data;
    this.displayFileDetailsDialog = true;
  }

  createDirectory() {
    if (!this.newDirectoryName.trim()) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Directory name cannot be empty' });
      return;
    }

    const directoryName = this.newDirectoryName.trim();
    const parentDirectoryId = this.selectedNode && this.selectedNode.data.name !== 'Root' ? this.selectedNode.data.id : 1;

    // Check for name conflicts locally
    if (this.files.some(node => node.data.name === directoryName && node.data.filetype === 'directory' && node.parent && node.parent.data.id === parentDirectoryId)) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'A directory with the same name already exists' });
      return;
    }

    if (this.files.some(node => node.data.name === directoryName && node.data.filetype !== 'directory' && node.parent && node.parent.data.id === parentDirectoryId)) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'A file with the same name already exists' });
      return;
    }

    const requestPayload = {
      name: directoryName,
      parent: {
        id: parentDirectoryId
      }
    };

    this.fileUploadService.createDirectory(requestPayload).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Directory created successfully' });
        this.newDirectoryName = '';
        this.fetchFilesAndDirectories();
      },
      error: (err: any) => {
        if (err.status === 409) {
          this.messageService.add({ severity: 'error', summary: 'Conflict', detail: err.error });
        } else {
          console.error('Error creating directory:', err);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to create directory' });
        }
      }
    });
  }

  getParentPath(path: string): string {
    path = path.endsWith('/') ? path.slice(0, -1) : path;
    const lastSlashIndex = path.lastIndexOf('/');
    if (lastSlashIndex === -1) {
      return "root";
    }
    return path.substring(0, lastSlashIndex);
  }

  onDeleteFile(id: number) {
    this.http.delete(`${this.apiUrl}/files/${id}`, { responseType: 'text' })
      .subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'File deleted successfully' });
          this.fetchFilesAndDirectories();
          this.displayUpdateDialog = false;
        },
        error: (err: any) => {
          console.error('Error deleting file:', err);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete file' });
        }
      });
  }

  deleteSelectedFile() {
    if (this.selectedNode && this.selectedNode.data.filetype !== 'directory') {
      this.onDeleteFile(this.selectedNode!.data.id);
    } else {
      this.messageService.add({ severity: 'warn', summary: 'Warning', detail: 'Please select a file to delete' });
    }
  }

  updateSelectedItem() {
    if (!this.selectedNode || !this.selectedNode.data.id) {
      this.messageService.add({ severity: 'warn', summary: 'Warning', detail: 'Please select a file or directory to update' });
      return;
    }

    const id = this.selectedNode.data.id;
    const isDirectory = this.selectedNode.data.filetype === 'directory';
    const name = this.updatedName;

    if (isDirectory) {
      // Update directory name
      this.http.put(`${this.apiUrl}/directories/update/${id}?name=${encodeURIComponent(name)}`, null, { responseType: 'text' })
        .subscribe({
          next: response => {
            console.log('Directory update response:', response); // Log the response
            this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Directory updated successfully' });
            this.fetchFilesAndDirectories();
          },
          error: (err: any) => {
            console.error('Error updating directory:', err);
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update directory' });
          }
        });
    } else {
      // Update file
      this.fileUploadService.updateFile(id, this.updatedFile, this.updatedName, this.updatedParentId)
        .subscribe({
          next: response => {
            console.log('File update response:', response); // Log the response
            this.messageService.add({ severity: 'success', summary: 'Success', detail: 'File updated successfully' });
            this.fetchFilesAndDirectories();
          },
          error: (err: any) => {
            console.error('Error updating file:', err);
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update file' });
          }
        });
    }

    this.displayUpdateDialog = false;
  }

  onFileChange(event: any) {
    this.updatedFile = event.target.files[0];
  }

  onFileSelectedFromSearch(event: { originalEvent: Event, value: any }) {
    const selectedFile = event.value;
    this.selectedNode = this.findNodeInTree(this.files, selectedFile.id);

    if (this.selectedNode) {
      this.id = this.selectedNode.data.id;
      this.isDirectoryUpdate = this.selectedNode.data.filetype === 'directory';
      console.log('Selected file from search:', selectedFile);
      console.log('Node data:', this.selectedNode.data);
    } else {
      console.error('Selected file from search not found in the tree');
    }
  }

  findNodeInTree(nodes: TreeNode[], id: number): TreeNode | undefined {
    for (const node of nodes) {
      if (node.data.id === id) {
        return node;
      }
      if (node.children) {
        const foundNode = this.findNodeInTree(node.children, id);
        if (foundNode) {
          return foundNode;
        }
      }
    }
    return undefined;
  }
  confirmDelete(file: any) {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete ${file.name}?`,
      header: 'Confirmation',
      icon: 'pi pi-exclamation-triangle',
      closeOnEscape:true,

      accept: () => {
        this.deleteSelectedFile();
      },
      reject:():void=>{
        this.messageService.add({ severity: 'warn', summary: 'Warning', detail: 'Delete cancelled' });
      },

    });
  }

  // Method to confirm and delete the selected file
  confirmDeleteFile() {
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this file?',
      accept: () => {
        this.deleteSelectedFile();
      },
      reject:():void=>{
        this.messageService.add({ severity: 'warn', summary: 'Warning', detail: 'Delete cancelled' });
      }
    });
  }

  // Method to reset the selected file details and close dialog
  closeUpdateDialog() {
    this.selectedFileDetails = null;
    this.displayUpdateDialog = false;
  }


}
