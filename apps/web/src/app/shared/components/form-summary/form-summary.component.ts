import { Component, Input } from '@angular/core';

import { StepConfig } from '../../../core/interfaces/form.interface';

@Component({
  selector: 'app-form-summary',
  standalone: true,
  templateUrl: './form-summary.component.html',
  styleUrl: './form-summary.component.scss',
})
export class FormSummaryComponent {
  @Input() steps: StepConfig[] = [];
  @Input() value: Record<string, Record<string, unknown>> = {};

  stepValue(index: number): Record<string, unknown> {
    return this.value[`step${index}`] ?? {};
  }

  display(value: unknown): string {
    if (value === null || value === undefined || value === '') {
      return 'Not provided';
    }

    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }

    return String(value);
  }
}
