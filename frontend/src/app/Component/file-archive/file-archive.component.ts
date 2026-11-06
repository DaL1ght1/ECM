import {Component, OnInit, ViewChild} from '@angular/core';
import {ConfirmationService, MenuItem, TreeNode, TreeTableNode} from 'primeng/api';
import {FileUploadService} from '../../Services/file.service';
import {HttpClient} from '@angular/common/http';
import {ChangeDetectorRef} from '@angular/core';
import {MessageService} from 'primeng/api';
import {OverlayPanel} from "primeng/overlaypanel";

@Component({
  selector: 'file-archive',
  templateUrl: './file-archive.component.html',
  styleUrls: ['./file-archive.component.scss'],
  providers: [MessageService, ConfirmationService]
})
export class FileArchiveComponent implements OnInit {
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
  notFound: boolean = false;
  draggedFile: any;
  selectedFileDetails: {
    id: number;
    name: string;
    filetype: string;
    size: string;
    path: string
    content?: string;
    children?:TreeNode[] ;
  } = {
    id: 0,
    name: '',
    filetype: '',
    size: '',
    path: '',
    children : []
  };
  displayFileDetailsDialog: boolean = false;
  editedFileContent: string = '';
  isEditing: boolean = false;


  constructor(
    private fileUploadService: FileUploadService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {
  }

  ngOnInit() {
    this.cols = [
      {field: 'name', header: 'Name'},
      {field: 'size', header: 'Size'},
      {field: 'filetype', header: 'Type'}

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
    input.multiple = true; // Allow multiple file selection
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
      params: {mot: event.query}
    }).subscribe({
      next: (response) => {
        if (response && Object.keys(response).length > 0) {
          this.filteredFiles = Object.entries(response).map(([id, name]) => ({
            id: Number(id),
            name // Only include id and name
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
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'A file with the same name already exists'
          });
          return;
        }

        if (this.files.some(node => node.data.name === fileName && node.data.filetype === 'directory' && node.parent && node.parent.data.id === parentDirectoryId)) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'A directory with the same name already exists'
          });
          return;
        }

        const uploadId = this.id;
        this.fileUploadService.upload(file, uploadId).subscribe({
          next: (response: any) => {
            console.log('Upload response:', response);
            this.messageService.add({severity: 'success', summary: 'Success', detail: 'File uploaded successfully'});
            this.fetchFilesAndDirectories();
          },
          error: (err: any) => {
            console.error('Upload error:', err);
            this.messageService.add({severity: 'error', summary: 'Error', detail: 'Failed to upload file'});
          }
        });
      });
      this.selectedFiles = [];
      this.selectedFileName = 'No file selected'; // Reset file name after upload
    } else {
      this.messageService.add({severity: 'warn', summary: 'Warning', detail: 'No files selected for upload'});
    }
  }

  fetchFilesAndDirectories() {
    this.fileUploadService.getAllFilesAndDirectories().subscribe({
      next: (response: any) => {
        const {files, directories} = response;
        this.tree = this.buildFileTree(files, directories);
        this.files = [...this.tree];
        this.cdr.detectChanges();
      },
      error: error => {
        console.error("Error fetching files and directories:", error);
        this.messageService.add({severity: 'error', summary: 'Error', detail: 'Failed to fetch files and directories'});
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
        filetype: item.filetype || 'directory',
        path: item.path
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

    const rootNode: TreeNode = {
      data: {id: 1, name: 'Root', size: '', filetype: 'directory', path: 'fileDirectory'},
      children: [],
      expanded: false,
      selectable: true
    };

    map.set('fileDirectory', rootNode);


    map.forEach((node, path) => {
      const item = directories.find(d => d.path === path) || files.find(f => f.path === path);
      if ((item && (item.parent_id || item.directory_id)) && (item.path !== 'fileDirectory')) {
        let parentPath = this.getParentPath(item.path);
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
        if (path !== 'fileDirectory') {
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
    console.log("ID:", this.id, "Name:", event.node.data.name);

  }

  createDirectory() {
    if (!this.newDirectoryName.trim()) {
      this.messageService.add({severity: 'error', summary: 'Error', detail: 'Directory name cannot be empty'});
      return;
    }

    const directoryName = this.newDirectoryName.trim();
    const parentDirectoryId = this.selectedNode && this.selectedNode.data.name !== 'Root' ? this.selectedNode.data.id : 1;

    // Check for name conflicts locally
    if (this.files.some(node => node.data.name === directoryName && node.data.filetype === 'directory' && node.parent && node.parent.data.id === parentDirectoryId)) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'A directory with the same name already exists'
      });
      return;
    }

    if (this.files.some(node => node.data.name === directoryName && node.data.filetype !== 'directory' && node.parent && node.parent.data.id === parentDirectoryId)) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'A file with the same name already exists'
      });
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
        this.messageService.add({severity: 'success', summary: 'Success', detail: 'Directory created successfully'});
        this.newDirectoryName = '';
        this.fetchFilesAndDirectories();
      },
      error: (err: any) => {
        if (err.status === 409) {
          this.messageService.add({severity: 'error', summary: 'Conflict', detail: err.error});
        } else {
          console.error('Error creating directory:', err);
          this.messageService.add({severity: 'error', summary: 'Error', detail: 'Failed to create directory'});
        }
      }
    });
  }

  getParentPath(path: string): string {
    path = path.endsWith('/') ? path.slice(0, -1) : path;
    const lastSlashIndex = path.lastIndexOf('/');
    if (lastSlashIndex === -1) {
      return "fileDirectory";
    }
    return path.substring(0, lastSlashIndex);
  }

  onDeleteFile(id: number) {
    this.http.delete(`${this.apiUrl}/files/${id}`, {responseType: 'text'})
      .subscribe({
        next: () => {
          this.messageService.add({severity: 'success', summary: 'Success', detail: 'File deleted successfully'});
          this.fetchFilesAndDirectories();
          this.displayUpdateDialog = false;
        },
        error: (err: any) => {
          console.error('Error deleting file:', err);
          this.messageService.add({severity: 'error', summary: 'Error', detail: 'Failed to delete file'});
        }
      });
  }

  deleteDirectory(directory: any) {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete the directory "${directory.name}" and all its contents?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.fileUploadService.deleteDirectory(directory.id).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Directory and its contents deleted successfully'
            });
            this.fetchFilesAndDirectories();
          },
          error: (err: any) => {
            console.error('Error deleting directory:', err);
            this.messageService.add({severity: 'error', summary: 'Error', detail: 'Failed to delete directory'});
          }
        });
      },
      reject: () => {
        this.messageService.add({severity: 'info', summary: 'Cancelled', detail: 'Delete cancelled'});
      }
    });
  }

  updateSelectedItem() {
    if (!this.selectedNode || !this.selectedNode.data.id) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Please select a file or directory to update'
      });
      return;
    }

    const id = this.selectedNode.data.id;
    const isDirectory = this.selectedNode.data.filetype === 'directory';
    const name = this.updatedName;

    if (isDirectory) {
      // Update directory name
      this.http.put(`${this.apiUrl}/directories/update/${id}?name=${encodeURIComponent(name)}`, null, {responseType: 'text'})
        .subscribe({
          next: response => {
            console.log('Directory update response:', response); // Log the response
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Directory updated successfully'
            });
            this.fetchFilesAndDirectories();
          },
          error: (err: any) => {
            console.error('Error updating directory:', err);
            this.messageService.add({severity: 'error', summary: 'Error', detail: 'Failed to update directory'});
          }
        });
    } else {
      // Update file

      var  newParentFileId  =this.updatedParentId
      this.fileUploadService.updateFile(id, this.updatedFile, this.updatedName,newParentFileId )
        .subscribe({
          next: response => {
            console.log('File update response:', response); // Log the response
            this.messageService.add({severity: 'success', summary: 'Success', detail: 'File updated successfully'});
            this.fetchFilesAndDirectories();
          },
          error: (err: any) => {
            console.error('Error updating file:', err);
            this.messageService.add({severity: 'error', summary: 'Error', detail: 'Failed to update file'});
          }
        });
    }

    this.displayUpdateDialog = false; // Close dialog after update
  }

  onFileChange(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.editedFileContent = e.target.result;
      };
      reader.readAsText(file);
    }
  }

  onFileSelectedFromSearch(event: { originalEvent: Event, value: any }) {
    const selectedFilename = event.value.name;
    const node = this.findNodeInTree(this.files, selectedFilename);

    if (node) {
      const id = node.data.id;

      this.fileUploadService.getFileContent(id).subscribe({
          next: response => {
            this.editedFileContent = response.fileContent || '';

            this.selectedFileDetails = {
              id: node.data.id,
              name: node.data.name,
              filetype: node.data.filetype || 'unknown',
              size: node.data.size || 'N/A',
              content: this.editedFileContent,
              path: node.data.path,
            };
            this.selectedNode = node;
            this.displayFileDetailsDialog = true;
          },
          error: error => {
            console.error('Error retrieving file content:', error);
          }
        }
      );
    } else {
      console.error('File not found in tree');
    }
  }

  findNodeInTree(nodes: TreeNode[], name: string): TreeNode | undefined {
    for (const node of nodes) {
      if (node.data.name === name) {
        return node;
      }
      if (node.children) {
        const foundNode = this.findNodeInTree(node.children, name);
        if (foundNode) {
          return foundNode;
        }
      }
    }
    return undefined;
  }

  confirmDelete(item: any) {
    if (item.filetype === 'directory') {
      this.deleteDirectory(item);
    } else {
      this.confirmationService.confirm({
        message: `Are you sure you want to delete ${item.name}?`,
        header: 'Confirmation',
        icon: 'pi pi-exclamation-triangle',
        closeOnEscape: true,
        accept: () => {
          this.onDeleteFile(item.id);
        },
        reject: () => {
          this.messageService.add({severity: 'warn', summary: 'Warning', detail: 'Delete cancelled'});
        },
      });
    }
  }

  closeUpdateDialog() {
    this.selectedFileDetails = {
      id: 0,
      name: '',
      filetype: '',
      size: '',
      path: ''
    };
    this.displayFileDetailsDialog = false;
    this.isEditing = true; // Reset edit state
    this.editedFileContent = '';
  }

  confirmUpdate(): void {
    if (!this.selectedNode) {
      this.messageService.add({severity: 'warn', summary: 'Warning', detail: 'Please select a file to update'});
      return;
    }

    if (this.selectedNode.data.filetype === 'directory') {
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'You cannot update the content of a directory'
      });
      return;
    }

    if (!this.editedFileContent) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'No changes detected in the file content'
      });
      return;
    }

    this.confirmationService.confirm({
      message: 'Are you sure you want to update the file content?',
      header: 'Confirm Update',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.updateFileContent();
      },
      reject: () => {
        this.messageService.add({severity: 'info', summary: 'Cancelled', detail: 'Update cancelled'});
      }
    });
  }

  onSearchButtonClick(rowData: any) {
    const node = this.findNodeInTree(this.files, rowData.name);

    if (node) {
      const id = node.data.id;

      if (node.data.filetype === 'directory') {
        // If it's a directory, just show its details without content
        this.selectedFileDetails = {
          id: node.data.id,
          name: node.data.name,
          filetype: 'directory',
          size: 'N/A',
          content: 'This is a directory',
          path: node.data.path,
          children: node.children ? node.children.map(child => child.data.name) : []
        };
        this.selectedNode = node;
        this.displayFileDetailsDialog = true;
      } else {
        // If it's a file, fetch its content
        this.fileUploadService.getFileContent(id).subscribe({
            next: response => {
              this.editedFileContent = response.fileContent || '';

              this.selectedFileDetails = {
                id: node.data.id,
                name: node.data.name,
                filetype: node.data.filetype || 'unknown',
                size: node.data.size || 'N/A',
                content: this.editedFileContent,
                path: node.data.path
              };
              this.selectedNode = node;
              this.displayFileDetailsDialog = true;
            },
            error: error => {
              console.error('Error retrieving file content:', error);
              this.messageService.add({severity: 'error', summary: 'Error', detail: 'Failed to retrieve file content'});
            }
          }
        );
      }
    } else {
      console.error('Node not found in tree');
      this.messageService.add({severity: 'error', summary: 'Error', detail: 'File or directory not found'});
    }
  }

  updateFileContent(): void {
    if (!this.selectedNode || !this.editedFileContent) {
      return;
    }

    const fileId = this.selectedNode.data.id;
    const newFile = this.editedFileContent;

    this.fileUploadService.replaceFile(fileId, newFile).subscribe({
      next: (response) => {
        console.log('File updated successfully:', response);
        this.messageService.add({severity: 'success', summary: 'Success', detail: 'File updated successfully'});
        this.fetchFilesAndDirectories();
        this.isEditing = false; // Reset edit state
      },
      error: (error) => {
        console.error('Error updating file content:', error);
        this.messageService.add({severity: 'error', summary: 'Error', detail: 'Failed to update file'});
      }
    });

    this.closeUpdateDialog();
  }

  enableEditing() {
    this.isEditing = true;
  }

  onDragStart(file: any) {
    if (file.filetype !== 'directory') {
      this.draggedFile = file;
    }
  }

  onDrop(event: any, targetDirectory: any) {
    if (this.draggedFile) {
      // Prevent dropping a file onto itself or its current parent
      if (this.draggedFile.id !== targetDirectory.id && this.draggedFile.parentId !== targetDirectory.id) {
        this.moveFile(this.draggedFile, targetDirectory);
      } else {
        this.messageService.add({severity:'warn', summary: 'Warning', detail: 'Cannot move file to the same location'});
      }
    }
    this.draggedFile = null;
  }

  onDragEnd() {
    this.draggedFile = null;
  }

  moveFile(file: any, targetDirectory: any) {
    this.fileUploadService.moveFile(file.id, targetDirectory.id).subscribe(
      (response: string | null) => {
        if (response) {
          this.messageService.add({ severity: 'success', summary: 'Success', detail: response });
        } else {
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'File moved successfully' });
        }
        this.fetchFilesAndDirectories(); // Refresh the file tree
      },
      (error) => {
        let errorMessage = 'An unexpected error occurred';
        if (error.error && typeof error.error === 'string') {
          errorMessage = error.error;
        } else if (error.message) {
          errorMessage = error.message;
        }
        this.messageService.add({ severity: 'error', summary: 'Error', detail: errorMessage });
      }
    );
  }

  downloadFile(item: any) {
    const fileId=item.id;
    this.fileUploadService.downloadFile(fileId).subscribe({
     next: blob => {
        // Handle the downloaded file
        const fileURL = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = fileURL;
        link.setAttribute('download', item.name);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      },
     error: error => {
        console.error('Error downloading file:', error);
       this.messageService.add({severity: 'error', summary: 'error', detail: 'Download failed'});
      }}
    );
  }

}
