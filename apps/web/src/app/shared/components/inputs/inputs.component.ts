import { Component, Input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import {
  FieldConfig,
  FieldType,
  FormSelectData,
  SelectOption,
} from '../../../core/interfaces/form.interface';

@Component({
  selector: 'app-inputs',
  standalone: true,
  imports: [
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule,
  ],
  templateUrl: './inputs.component.html',
  styleUrl: './inputs.component.scss',
})
export class InputsComponent {
  @Input({ required: true }) field!: FieldConfig;
  @Input({ required: true }) group!: FormGroup;
  @Input() formSelectData: FormSelectData = {};

  options(): SelectOption[] {
    if (this.field.options !== undefined) {
      return this.field.options;
    }

    if (this.field.selectData !== undefined) {
      return this.formSelectData[this.field.selectData] ?? [];
    }

    return [];
  }

  visible(): boolean {
    return this.field.visible !== false;
  }

  icon(): string {
    const icons: Partial<Record<FieldType, string>> = {
      checkbox: 'check_box',
      date: 'calendar_month',
      email: 'alternate_email',
      file: 'upload_file',
      number: 'tag',
      password: 'lock',
      phone: 'call',
      select: 'tune',
      textarea: 'notes',
      text: 'edit_note',
    };

    return icons[this.field.type] ?? 'edit_note';
  }

  errorMessage(): string {
    const control = this.group.get(this.field.name);

    if (control?.hasError('required')) {
      return `${this.field.label} is required.`;
    }

    if (control?.hasError('email')) {
      return 'Enter a valid email address.';
    }

    if (control?.hasError('minlength')) {
      return `${this.field.label} is too short.`;
    }

    return 'Enter a valid value.';
  }

  inputType(): string {
    const types: Partial<Record<FieldType, string>> = {
      date: 'date',
      email: 'email',
      number: 'number',
      password: 'password',
      phone: 'tel',
      text: 'text',
    };

    return types[this.field.type] ?? 'text';
  }
}
