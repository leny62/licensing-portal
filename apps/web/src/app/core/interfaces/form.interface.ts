import { ValidatorFn } from '@angular/forms';

export type FieldType =
  | 'text'
  | 'password'
  | 'number'
  | 'email'
  | 'phone'
  | 'textarea'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'date'
  | 'file'
  | 'group'
  | 'array';

export interface SelectOption<T = string> {
  label: string;
  value: T;
}

export interface FieldConfig {
  name: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  hint?: string;
  validators?: ValidatorFn[];
  options?: SelectOption[];
  selectData?: string;
  multiple?: boolean;
  children?: FieldConfig[];
  visible?: boolean | ((value: Record<string, unknown>) => boolean);
  showIf?: {
    field: string;
    equals: unknown;
  };
  readOnly?: boolean;
  cols?: 1 | 2 | 3;
  defaultValue?: unknown;
  rows?: number;
}

export interface StepConfig {
  title: string;
  subtitle?: string;
  fields: FieldConfig[];
  customValidator?: (value: Record<string, unknown>) => string | null;
  visible?: boolean | ((value: Record<string, unknown>) => boolean);
}

export type FormSelectData = Record<string, SelectOption[]>;
