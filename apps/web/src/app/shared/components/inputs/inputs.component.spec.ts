import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, Validators } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { InputsComponent } from './inputs.component';

describe(InputsComponent.name, () => {
  let component: InputsComponent;
  let fixture: ComponentFixture<InputsComponent>;
  const fb = new FormBuilder();

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InputsComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(InputsComponent);
    component = fixture.componentInstance;
    component.field = { name: 'value', type: 'text', label: 'Value' };
    component.group = fb.group({ value: '' });
  });

  describe('visible()', () => {
    it('returns true when field.visible is not set', () => {
      expect(component.visible()).toBeTrue();
    });

    it('returns false when field.visible is explicitly false', () => {
      component.field = { ...component.field, visible: false };
      expect(component.visible()).toBeFalse();
    });
  });

  describe('options()', () => {
    it('returns field.options when defined', () => {
      const opts = [{ value: 'a', label: 'Option A' }];
      component.field = { name: 'value', type: 'select', label: 'Value', options: opts };
      expect(component.options()).toEqual(opts);
    });

    it('returns data from formSelectData when selectData key is set', () => {
      const opts = [{ value: 'b', label: 'Option B' }];
      component.field = { name: 'value', type: 'select', label: 'Value', selectData: 'myKey' };
      component.formSelectData = { myKey: opts };
      expect(component.options()).toEqual(opts);
    });

    it('returns an empty array when neither options nor selectData is configured', () => {
      component.field = { name: 'value', type: 'select', label: 'Value' };
      expect(component.options()).toEqual([]);
    });
  });

  describe('icon()', () => {
    it('returns the mapped icon for a known field type', () => {
      component.field = { ...component.field, type: 'email' };
      expect(component.icon()).toBe('alternate_email');
    });

    it('falls back to edit_note for a field type with no icon mapping', () => {
      component.field = { ...component.field, type: 'group' };
      expect(component.icon()).toBe('edit_note');
    });
  });

  describe('inputType()', () => {
    it('returns the mapped HTML input type for a known field type', () => {
      component.field = { ...component.field, type: 'password' };
      expect(component.inputType()).toBe('password');
    });

    it('falls back to text for a field type that has no mapped HTML input type', () => {
      component.field = { ...component.field, type: 'textarea' };
      expect(component.inputType()).toBe('text');
    });
  });

  describe('errorMessage()', () => {
    it('returns a required message when the control has a required error', () => {
      component.field = { name: 'value', type: 'text', label: 'Name' };
      component.group = fb.group({ value: ['', Validators.required] });
      component.group.controls['value'].markAsTouched();
      expect(component.errorMessage()).toBe('Name is required.');
    });

    it('returns an email message when the control has an email error', () => {
      component.field = { name: 'value', type: 'email', label: 'Email' };
      component.group = fb.group({ value: ['notanemail', Validators.email] });
      expect(component.errorMessage()).toBe('Enter a valid email address.');
    });

    it('returns a too-short message when the control has a minlength error', () => {
      component.field = { name: 'value', type: 'text', label: 'Code' };
      component.group = fb.group({ value: ['ab', Validators.minLength(5)] });
      expect(component.errorMessage()).toBe('Code is too short.');
    });

    it('returns a generic message when the control error does not match any known type', () => {
      component.field = { name: 'value', type: 'text', label: 'Value' };
      component.group = fb.group({ value: ['', () => ({ custom: true })] });
      expect(component.errorMessage()).toBe('Enter a valid value.');
    });
  });
});
