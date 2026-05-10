import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatStepperModule } from '@angular/material/stepper';

import { FormSelectData, StepConfig } from '../../../core/interfaces/form.interface';
import { ButtonComponent } from '../button/button.component';
import { FormSummaryComponent } from '../form-summary/form-summary.component';
import { InputsComponent } from '../inputs/inputs.component';
import { FormbuilderGroup, FormbuilderService } from './formbuilder.service';

@Component({
  selector: 'app-formbuilder',
  standalone: true,
  imports: [
    ButtonComponent,
    FormSummaryComponent,
    InputsComponent,
    MatStepperModule,
    ReactiveFormsModule,
  ],
  templateUrl: './formbuilder.component.html',
  styleUrl: './formbuilder.component.scss',
})
export class FormbuilderComponent implements OnChanges {
  private readonly formbuilder = inject(FormbuilderService);

  @Input() steps: StepConfig[] = [];
  @Input() initialData: Record<string, unknown> = {};
  @Input() formName = '';
  @Input() formSelectData: FormSelectData = {};
  @Input() isLoading = false;
  @Output() submitForm = new EventEmitter<Record<string, unknown>>();

  form: FormbuilderGroup = this.formbuilder.buildFormFromSteps([]);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['steps'] !== undefined || changes['initialData'] !== undefined) {
      this.form = this.formbuilder.buildFormFromSteps(this.steps, this.initialData);
    }
  }

  stepGroup(index: number): FormGroup {
    return this.form.get(`step${index}`) as FormGroup;
  }

  submit(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    this.submitForm.emit(this.form.getRawValue());
  }
}
