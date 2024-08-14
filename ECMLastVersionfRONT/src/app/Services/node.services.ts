import { Injectable } from '@angular/core';
import { TreeNode } from 'primeng/api';

@Injectable({
  providedIn: 'root'
})
export class NodeService {

  constructor() {}

  getFilesystem() {
    return Promise.resolve(this.getFilesystemData());
  }

  private getFilesystemData(): TreeNode[] {
    return [
      {
        label: 'Documents',
        data: { name: 'Documents', size: '75kb', type: 'Folder' },
        children: [
          {
            label: 'Work',
            data: { name: 'Work', size: '55kb', type: 'Folder' },
            children: [
              { label: 'Expenses.doc', data: { name: 'Expenses.doc', size: '30kb', type: 'Document' } },
              { label: 'Resume.doc', data: { name: 'Resume.doc', size: '25kb', type: 'Document' } }
            ]
          },
          {
            label: 'Home',
            data: { name: 'Home', size: '20kb', type: 'Folder' },
            children: [
              { label: 'Invoices.txt', data: { name: 'Invoices.txt', size: '20kb', type: 'Text' } }
            ]
          }
        ]
      },
      {
        label: 'Pictures',
        data: { name: 'Pictures', size: '150kb', type: 'Folder' },
        children: [
          { label: 'barcelona.jpg', data: { name: 'barcelona.jpg', size: '90kb', type: 'Picture' } },
          { label: 'primeui.png', data: { name: 'primeui.png', size: '30kb', type: 'Picture' } },
          { label: 'optimus.jpg', data: { name: 'optimus.jpg', size: '30kb', type: 'Picture' } }
        ]
      }
    ];
  }
}
