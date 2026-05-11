import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { FitAndProperStatus } from '../../../core/enums/regulatory-status.enum';
import { FitProperDialogComponent, FitProperDialogResult } from './fit-proper-dialog.component';

describe(FitProperDialogComponent.name, () => {
  let component: FitProperDialogComponent;
  let fixture: ComponentFixture<FitProperDialogComponent>;
  let dialogRef: jasmine.SpyObj<
    MatDialogRef<FitProperDialogComponent, FitProperDialogResult | false>
  >;

  beforeEach(async () => {
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [FitProperDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { shareholderName: 'Alice Founder' } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FitProperDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('closes with false on cancel', () => {
    component.cancel();

    expect(dialogRef.close).toHaveBeenCalledWith(false);
  });

  it('does not close when justification is empty', () => {
    component.form.controls.justification.setValue('');

    component.submit();

    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(component.form.touched).toBeTrue();
  });

  it('returns the selected status and justification', () => {
    component.form.setValue({
      status: FitAndProperStatus.Failed,
      justification: 'Source-of-funds evidence is not sufficient.',
    });

    component.submit();

    expect(dialogRef.close).toHaveBeenCalledWith({
      status: FitAndProperStatus.Failed,
      justification: 'Source-of-funds evidence is not sufficient.',
    });
  });
});
