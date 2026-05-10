import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './empty-state.component.html',
})
export class EmptyStateComponent {
  @Input() icon = 'inbox';
  @Input() title = 'Nothing here yet';
  @Input() message = 'Records will appear here when they are available.';
  @Input() actionLabel = '';
  @Output() actionClick = new EventEmitter<void>();
}
