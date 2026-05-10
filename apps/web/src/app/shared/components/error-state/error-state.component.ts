import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

import { ButtonComponent } from '../button/button.component';

@Component({
  selector: 'app-error-state',
  standalone: true,
  imports: [ButtonComponent, MatIconModule],
  templateUrl: './error-state.component.html',
})
export class ErrorStateComponent {
  @Input() title = 'Unable to load';
  @Input() message = 'Please try again.';
  @Output() retry = new EventEmitter<void>();
}
