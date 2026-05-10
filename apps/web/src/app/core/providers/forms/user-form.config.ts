import { Validators } from '@angular/forms';

import { StepConfig } from '../../interfaces/form.interface';
import { userRoleOptions } from '../../utils/enum-options';

export const userFormConfig = (isEdit: boolean): StepConfig[] => [
  {
    title: 'Profile',
    fields: [
      {
        name: 'fullName',
        type: 'text',
        label: 'Full name',
        placeholder: 'New User',
        validators: [Validators.required],
      },
      {
        name: 'email',
        type: 'email',
        label: 'Email',
        placeholder: 'new.user@licensing.local',
        validators: [Validators.required, Validators.email],
      },
      {
        name: 'role',
        type: 'select',
        label: 'Role',
        validators: [Validators.required],
        options: userRoleOptions,
      },
      {
        name: 'institutionName',
        type: 'text',
        label: 'Institution',
        placeholder: 'Kigali Community Bank',
      },
      {
        name: 'password',
        type: 'password',
        label: 'Temporary password',
        placeholder: 'At least 12 characters',
        validators: isEdit ? [] : [Validators.required, Validators.minLength(12)],
        visible: !isEdit,
      },
    ],
  },
];
