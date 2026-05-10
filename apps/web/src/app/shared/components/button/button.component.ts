import { NgClass } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'ghost' | 'neutral';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [NgClass, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss',
})
export class ButtonComponent {
  @Input() variant: ButtonVariant = 'primary';
  @Input() icon?: string;
  @Input() loading = false;
  @Input() disabled = false;
  @Input() type: 'button' | 'submit' | 'reset' = 'button';

  get classes(): string[] {
    return ['btn', `btn-${this.variant}`];
  }
}
