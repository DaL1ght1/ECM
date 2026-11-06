import { Component } from '@angular/core';
import { SearchService } from '../../Services/search.service'; // Update the path as needed
import { AutoCompleteCompleteEvent } from 'primeng/autocomplete';

@Component({
  selector: 'app-search-bar',
  templateUrl: './search-bar.component.html',
  styleUrls: ['./search-bar.component.scss']
})
export class SearchBarComponent {
  items: any[] | undefined;
  selectedItem: any;
  suggestions: any[] = [];

  constructor(private searchService: SearchService) {}

  search(event: AutoCompleteCompleteEvent) {
    this.searchService.searchFiles(event.query).subscribe({next:(data: any[] | null) => {
      if (data && Array.isArray(data)) {
        this.suggestions = data.map(file => file.name);
        console.log(this.suggestions)// Assuming 'name' is the property you want to display
      } else {
        this.suggestions = [];
      }
    },error: error => {
      console.error('Error fetching search results:', error);
      this.suggestions = [];
    }});
  }
}
