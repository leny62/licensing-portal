import { Component, Inject, inject } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

import { ApplicationDecision } from '../../../core/enums/application-decision.enum';
import { DecisionType } from '../../../core/enums/decision-type.enum';
import { ButtonComponent } from '../button/button.component';
import { InputsComponent } from '../inputs/inputs.component';
import { FieldConfig, FormSelectData } from '../../../core/interfaces/form.interface';

export interface DecisionDialogData {
  referenceNumber: string;
  permittedActivities: string[];
}

export interface DecisionDialogResult {
  decision: ApplicationDecision;
  justification: string;
  decisionType: DecisionType;
  conditions?: Array<{ text: string; satisfactionDate: string }>;
  allowedActivities?: string;
  refusalReasons?: Array<{ reason: string; articleCitation: string }>;
}

const justificationField: FieldConfig = {
  name: 'justification',
  type: 'textarea',
  label: 'Justification',
  placeholder: 'Record a clear, evidence-based reason for this decision.',
  rows: 5,
  validators: [Validators.required, Validators.minLength(20)],
};

const conditionTextField: FieldConfig = {
  name: 'text',
  type: 'text',
  label: 'Condition',
  placeholder: 'Describe the condition',
  validators: [Validators.required],
};

const conditionDateField: FieldConfig = {
  name: 'satisfactionDate',
  type: 'date',
  label: 'Target satisfaction date',
  validators: [Validators.required],
};

const activitiesField: FieldConfig = {
  name: 'permittedActivities',
  type: 'select',
  label: 'Permitted activities',
  selectData: 'permittedActivities',
  multiple: true,
  validators: [Validators.required],
};

const refuseReasonField: FieldConfig = {
  name: 'reason',
  type: 'text',
  label: 'Reason',
  placeholder: 'State the reason for refusal',
  validators: [Validators.required],
};

const articleCitationField: FieldConfig = {
  name: 'articleCitation',
  type: 'text',
  label: 'Article citation',
  placeholder: 'e.g. Article 7, Regulation 2310-13',
  validators: [Validators.required],
};

@Component({
  selector: 'app-decision-dialog',
  standalone: true,
  imports: [
    ButtonComponent,
    InputsComponent,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatTabsModule,
    ReactiveFormsModule,
  ],
  templateUrl: './decision-dialog.component.html',
})
export class DecisionDialogComponent {
  private readonly fb = inject(FormBuilder);

  readonly justificationField = justificationField;
  readonly conditionTextField = conditionTextField;
  readonly conditionDateField = conditionDateField;
  readonly activitiesField = activitiesField;
  readonly refuseReasonField = refuseReasonField;
  readonly articleCitationField = articleCitationField;

  readonly grantForm = this.fb.nonNullable.group({
    justification: ['', [Validators.required, Validators.minLength(20)]],
  });

  readonly conditionsForm = this.fb.nonNullable.group({
    justification: ['', [Validators.required, Validators.minLength(20)]],
    conditions: this.fb.array<ReturnType<typeof this.buildConditionGroup>>([]),
  });
  readonly newConditionForm = this.fb.nonNullable.group({
    text: ['', [Validators.required]],
    satisfactionDate: ['', [Validators.required]],
  });

  readonly limitedForm = this.fb.nonNullable.group({
    justification: ['', [Validators.required, Validators.minLength(20)]],
    permittedActivities: this.fb.nonNullable.control<string[]>([], [Validators.required]),
  });
  readonly limitedSelectData: FormSelectData;

  readonly refuseForm = this.fb.nonNullable.group({
    justification: ['', [Validators.required, Validators.minLength(20)]],
    reasons: this.fb.array<ReturnType<typeof this.buildReasonGroup>>([]),
  });
  readonly newReasonForm = this.fb.nonNullable.group({
    reason: ['', [Validators.required]],
    articleCitation: ['', [Validators.required]],
  });

  get conditionsArray(): FormArray {
    return this.conditionsForm.controls.conditions;
  }

  get reasonsArray(): FormArray {
    return this.refuseForm.controls.reasons;
  }

  constructor(
    private readonly dialogRef: MatDialogRef<DecisionDialogComponent, DecisionDialogResult | false>,
    @Inject(MAT_DIALOG_DATA) readonly data: DecisionDialogData,
  ) {
    this.limitedSelectData = {
      permittedActivities: data.permittedActivities.map((activity) => ({
        label: activity,
        value: activity,
      })),
    };
  }

  addCondition(): void {
    if (this.newConditionForm.invalid) {
      this.newConditionForm.markAllAsTouched();
      return;
    }
    this.conditionsArray.push(this.buildConditionGroup(this.newConditionForm.getRawValue()));
    this.newConditionForm.reset({ text: '', satisfactionDate: '' });
  }

  removeCondition(index: number): void {
    this.conditionsArray.removeAt(index);
  }

  addReason(): void {
    if (this.newReasonForm.invalid) {
      this.newReasonForm.markAllAsTouched();
      return;
    }
    this.reasonsArray.push(this.buildReasonGroup(this.newReasonForm.getRawValue()));
    this.newReasonForm.reset({ reason: '', articleCitation: '' });
  }

  removeReason(index: number): void {
    this.reasonsArray.removeAt(index);
  }

  submitGrant(): void {
    if (this.grantForm.invalid) {
      this.grantForm.markAllAsTouched();
      return;
    }
    this.dialogRef.close({
      decision: ApplicationDecision.Approve,
      decisionType: DecisionType.Grant,
      justification: this.grantForm.controls.justification.value,
    });
  }

  submitGrantWithConditions(): void {
    if (this.conditionsForm.invalid) {
      this.conditionsForm.markAllAsTouched();
      return;
    }
    const { justification, conditions } = this.conditionsForm.getRawValue();
    this.dialogRef.close({
      decision: ApplicationDecision.Approve,
      decisionType: DecisionType.GrantWithConditions,
      justification,
      conditions,
    });
  }

  submitGrantLimited(): void {
    if (this.limitedForm.invalid) {
      this.limitedForm.markAllAsTouched();
      return;
    }
    const { justification, permittedActivities } = this.limitedForm.getRawValue();
    this.dialogRef.close({
      decision: ApplicationDecision.Approve,
      decisionType: DecisionType.GrantLimited,
      justification,
      allowedActivities: permittedActivities.join('; '),
    });
  }

  submitRefuse(): void {
    if (this.refuseForm.invalid) {
      this.refuseForm.markAllAsTouched();
      return;
    }
    const { justification, reasons } = this.refuseForm.getRawValue();
    this.dialogRef.close({
      decision: ApplicationDecision.Reject,
      decisionType: DecisionType.Refuse,
      justification,
      refusalReasons: reasons,
    });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }

  private buildConditionGroup(value: { text: string; satisfactionDate: string }) {
    return this.fb.nonNullable.group({
      text: [value.text],
      satisfactionDate: [value.satisfactionDate],
    });
  }

  private buildReasonGroup(value: { reason: string; articleCitation: string }) {
    return this.fb.nonNullable.group({
      reason: [value.reason],
      articleCitation: [value.articleCitation],
    });
  }
}
