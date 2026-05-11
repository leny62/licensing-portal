import { Validators } from '@angular/forms';

import { SHAREHOLDER_TYPE_LABELS, ShareholderType } from '../../enums/shareholder-type.enum';
import {
  SENIOR_MANAGER_ROLE_LABELS,
  SeniorManagerRole,
} from '../../enums/senior-manager-role.enum';
import { FieldConfig, SelectOption } from '../../interfaces/form.interface';

export const capitalDeclarationFields: FieldConfig[] = [
  {
    name: 'amountRwf',
    type: 'number',
    label: 'Declared paid-up capital',
    placeholder: '20000000000',
    validators: [Validators.required, Validators.min(1)],
  },
  {
    name: 'sourceSummary',
    type: 'textarea',
    label: 'Source summary',
    placeholder: 'Summarise verified sources of capital.',
    rows: 4,
    validators: [Validators.required, Validators.minLength(12)],
  },
];

export const shareholderFields: FieldConfig[] = [
  {
    name: 'shareholderType',
    type: 'select',
    label: 'Shareholder type',
    selectData: 'shareholderTypes',
    validators: [Validators.required],
  },
  {
    name: 'fullName',
    type: 'text',
    label: 'Full name',
    validators: [Validators.required],
  },
  {
    name: 'registrationNumber',
    type: 'text',
    label: 'Registration or ID number',
  },
  {
    name: 'country',
    type: 'text',
    label: 'Country',
    placeholder: 'RW',
    validators: [Validators.required],
  },
  {
    name: 'ownershipPercent',
    type: 'number',
    label: 'Ownership percent',
    validators: [Validators.required, Validators.min(0.01), Validators.max(100)],
  },
  {
    name: 'beneficialOwner',
    type: 'text',
    label: 'Beneficial owner',
  },
  {
    name: 'sourceOfFunds',
    type: 'textarea',
    label: 'Source of funds',
    placeholder: 'Summarise documentary evidence and source of funds.',
    rows: 4,
    validators: [Validators.required, Validators.minLength(10)],
  },
];

export const seniorManagerFields: FieldConfig[] = [
  {
    name: 'role',
    type: 'select',
    label: 'Role',
    selectData: 'seniorManagerRoles',
    validators: [Validators.required],
    hint: 'BNR Regulation 2310-13 Annex 3 — each executive role carries minimum qualification and experience requirements.',
  },
  {
    name: 'fullName',
    type: 'text',
    label: 'Full name',
    validators: [Validators.required],
  },
  {
    name: 'email',
    type: 'email',
    label: 'Email',
    validators: [Validators.required, Validators.email],
  },
  {
    name: 'nationality',
    type: 'text',
    label: 'Nationality',
    placeholder: 'RW',
    validators: [Validators.required],
  },
  {
    name: 'yearsExperience',
    type: 'number',
    label: 'Years of experience',
    validators: [Validators.required, Validators.min(0), Validators.max(80)],
    hint: 'CEO requires 10+ yrs banking (5+ at senior level) · CFO 7+ yrs finance · CRO 3+ yrs managerial in financial institution · Chief Compliance 5+ yrs compliance.',
  },
  {
    name: 'fitAndProperAttested',
    type: 'checkbox',
    label: 'Fit-and-proper evidence attested',
    hint: 'Confirm only after supporting evidence has been reviewed by the applicant.',
  },
];

export const informationLetterFields: FieldConfig[] = [
  {
    name: 'subject',
    type: 'text',
    label: 'Subject',
    validators: [Validators.required, Validators.minLength(6)],
  },
  {
    name: 'responseDays',
    type: 'number',
    label: 'Response window',
    validators: [Validators.required, Validators.min(1), Validators.max(90)],
  },
  {
    name: 'body',
    type: 'textarea',
    label: 'Letter body',
    placeholder: 'State the required information clearly and reference the relevant evidence.',
    rows: 7,
    validators: [Validators.required, Validators.minLength(20)],
  },
];

export const shareholderTypeOptions: SelectOption[] = Object.values(ShareholderType).map(
  (value) => ({
    label: SHAREHOLDER_TYPE_LABELS[value],
    value,
  }),
);

export const seniorManagerRoleOptions: SelectOption[] = Object.values(SeniorManagerRole).map(
  (value) => ({
    label: SENIOR_MANAGER_ROLE_LABELS[value],
    value,
  }),
);
