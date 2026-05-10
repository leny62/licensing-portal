import { Validators } from '@angular/forms';

import { StepConfig } from '../../interfaces/form.interface';

export const applicationFormConfig = (): StepConfig[] => [
  {
    title: 'Institution',
    subtitle: 'Capture the applicant institution and legal identity.',
    fields: [
      {
        name: 'institutionName',
        type: 'text',
        label: 'Institution name',
        placeholder: 'Kigali Community Bank',
        validators: [Validators.required],
      },
      {
        name: 'legalForm',
        type: 'text',
        label: 'Legal form',
        placeholder: 'Limited Company',
        validators: [Validators.required],
      },
      {
        name: 'country',
        type: 'text',
        label: 'Country code',
        placeholder: 'RW',
        validators: [Validators.required, Validators.maxLength(2)],
      },
    ],
  },
  {
    title: 'Contact',
    subtitle: 'Set the primary point of contact for regulator questions.',
    fields: [
      {
        name: 'contactPerson',
        type: 'text',
        label: 'Contact person',
        placeholder: 'Aline Applicant',
        validators: [Validators.required],
      },
      {
        name: 'contactEmail',
        type: 'email',
        label: 'Contact email',
        placeholder: 'applicant@licensing.local',
        validators: [Validators.required, Validators.email],
      },
      {
        name: 'contactPhone',
        type: 'phone',
        label: 'Contact phone',
        placeholder: '+250788000001',
        validators: [Validators.required],
      },
    ],
  },
  {
    title: 'Summary',
    subtitle: 'Add a short operational summary before review.',
    fields: [
      {
        name: 'summary',
        type: 'textarea',
        label: 'Application summary',
        placeholder: 'Application for a new commercial banking licence.',
        validators: [Validators.required, Validators.minLength(20)],
        cols: 2,
      },
    ],
  },
];
