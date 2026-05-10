import { Injectable } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';

import { FieldConfig, StepConfig } from '../../../core/interfaces/form.interface';

export type FormbuilderGroup = FormGroup<
  Record<string, FormGroup<Record<string, FormControl<unknown>>>>
>;

@Injectable({ providedIn: 'root' })
export class FormbuilderService {
  buildFormFromSteps(
    steps: StepConfig[],
    initialData: Record<string, unknown> = {},
  ): FormbuilderGroup {
    const root: Record<string, FormGroup<Record<string, FormControl<unknown>>>> = {};

    steps.forEach((step, index) => {
      const stepKey = `step${index}`;
      const stepInitial = (initialData[stepKey] ?? initialData) as Record<string, unknown>;
      root[stepKey] = this.buildStep(step.fields, stepInitial);
    });

    return new FormGroup(root);
  }

  private buildStep(
    fields: FieldConfig[],
    initialData: Record<string, unknown>,
  ): FormGroup<Record<string, FormControl<unknown>>> {
    const controls: Record<string, FormControl<unknown>> = {};

    for (const field of fields) {
      if (field.visible === false) {
        continue;
      }

      controls[field.name] = new FormControl(
        {
          value: initialData[field.name] ?? field.defaultValue ?? this.defaultValue(field),
          disabled: field.readOnly ?? false,
        },
        {
          nonNullable: false,
          validators: field.validators ?? [],
        },
      );
    }

    return new FormGroup(controls);
  }

  private defaultValue(field: FieldConfig): unknown {
    if (field.type === 'checkbox') {
      return false;
    }

    return '';
  }
}
