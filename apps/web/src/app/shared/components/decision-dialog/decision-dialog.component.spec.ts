import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { ApplicationDecision } from '../../../core/enums/application-decision.enum';
import { DecisionType } from '../../../core/enums/decision-type.enum';
import { DecisionDialogComponent, DecisionDialogResult } from './decision-dialog.component';

describe(DecisionDialogComponent.name, () => {
  let component: DecisionDialogComponent;
  let fixture: ComponentFixture<DecisionDialogComponent>;
  let dialogRef: jasmine.SpyObj<
    MatDialogRef<DecisionDialogComponent, DecisionDialogResult | false>
  >;

  beforeEach(async () => {
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [DecisionDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            referenceNumber: 'APP-TEST-001',
            permittedActivities: ['Accept deposits from licensed financial institutions.'],
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DecisionDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('cancel closes the dialog with false', () => {
    component.cancel();
    expect(dialogRef.close).toHaveBeenCalledWith(false);
  });

  describe('submitGrant', () => {
    it('marks the form touched and does not close when justification is empty', () => {
      component.submitGrant();

      expect(dialogRef.close).not.toHaveBeenCalled();
      expect(component.grantForm.touched).toBeTrue();
    });

    it('closes with a Grant payload when the form is valid', () => {
      component.grantForm.setValue({
        justification: 'All capital requirements are fully satisfied.',
      });

      component.submitGrant();

      expect(dialogRef.close).toHaveBeenCalledWith({
        decision: ApplicationDecision.Approve,
        decisionType: DecisionType.Grant,
        justification: 'All capital requirements are fully satisfied.',
      });
    });
  });

  describe('submitGrantWithConditions', () => {
    it('does not close when the form is invalid', () => {
      component.submitGrantWithConditions();

      expect(dialogRef.close).not.toHaveBeenCalled();
    });

    it('closes with structured conditions array when form is valid', () => {
      component.conditionsForm.controls.justification.setValue(
        'Approval is subject to satisfying the following conditions.',
      );
      component.newConditionForm.setValue({
        text: 'Submit audited financial statements',
        satisfactionDate: '2026-12-31',
      });
      component.addCondition();

      component.submitGrantWithConditions();

      const result = dialogRef.close.calls.mostRecent().args[0] as DecisionDialogResult;
      expect(result.decision).toBe(ApplicationDecision.Approve);
      expect(result.decisionType).toBe(DecisionType.GrantWithConditions);
      expect(result.justification).toBe(
        'Approval is subject to satisfying the following conditions.',
      );
      expect(result.conditions).toEqual([
        { text: 'Submit audited financial statements', satisfactionDate: '2026-12-31' },
      ]);
    });
  });

  describe('submitGrantLimited', () => {
    it('does not close when the form is invalid', () => {
      component.submitGrantLimited();

      expect(dialogRef.close).not.toHaveBeenCalled();
    });

    it('closes with GrantLimited payload and allowedActivities', () => {
      component.limitedForm.setValue({
        justification: 'Limited licence granted for institutional deposit-taking only.',
        permittedActivities: ['Accept deposits from licensed financial institutions.'],
      });

      component.submitGrantLimited();

      expect(dialogRef.close).toHaveBeenCalledWith({
        decision: ApplicationDecision.Approve,
        decisionType: DecisionType.GrantLimited,
        justification: 'Limited licence granted for institutional deposit-taking only.',
        allowedActivities: 'Accept deposits from licensed financial institutions.',
      });
    });
  });

  describe('submitRefuse', () => {
    it('does not close when the form is invalid', () => {
      component.submitRefuse();

      expect(dialogRef.close).not.toHaveBeenCalled();
    });

    it('closes with Refuse payload and structured refusalReasons', () => {
      component.refuseForm.controls.justification.setValue(
        'Application fails to meet minimum capital requirements under Article 5.',
      );
      component.newReasonForm.setValue({
        reason: 'Paid-up capital below the statutory minimum',
        articleCitation: 'Article 5, Regulation 2310-13',
      });
      component.addReason();

      component.submitRefuse();

      const result = dialogRef.close.calls.mostRecent().args[0] as DecisionDialogResult;
      expect(result.decision).toBe(ApplicationDecision.Reject);
      expect(result.decisionType).toBe(DecisionType.Refuse);
      expect(result.justification).toBe(
        'Application fails to meet minimum capital requirements under Article 5.',
      );
      expect(result.refusalReasons).toEqual([
        {
          reason: 'Paid-up capital below the statutory minimum',
          articleCitation: 'Article 5, Regulation 2310-13',
        },
      ]);
    });
  });

  describe('condition list', () => {
    it('does not push when newConditionForm is invalid and marks it touched', () => {
      expect(component.conditionsArray.length).toBe(0);

      component.addCondition();

      expect(component.conditionsArray.length).toBe(0);
      expect(component.newConditionForm.touched).toBeTrue();
    });

    it('pushes a condition and resets the staging form on valid submit', () => {
      component.newConditionForm.setValue({
        text: 'Hire a certified compliance officer',
        satisfactionDate: '2026-06-30',
      });

      component.addCondition();
      fixture.detectChanges();

      expect(component.conditionsArray.length).toBe(1);
      expect(component.newConditionForm.controls.text.value).toBe('');
      expect(component.newConditionForm.controls.satisfactionDate.value).toBe('');
    });

    it('removeCondition removes the entry at the given index', () => {
      component.newConditionForm.setValue({ text: 'Condition A', satisfactionDate: '2026-01-01' });
      component.addCondition();
      component.newConditionForm.setValue({ text: 'Condition B', satisfactionDate: '2026-02-01' });
      component.addCondition();

      component.removeCondition(0);

      expect(component.conditionsArray.length).toBe(1);
      expect((component.conditionsArray.at(0).value as { text: string }).text).toBe('Condition B');
    });
  });

  describe('reason list', () => {
    it('does not push when newReasonForm is invalid and marks it touched', () => {
      expect(component.reasonsArray.length).toBe(0);

      component.addReason();

      expect(component.reasonsArray.length).toBe(0);
      expect(component.newReasonForm.touched).toBeTrue();
    });

    it('pushes a reason and resets the staging form on valid submit', () => {
      component.newReasonForm.setValue({
        reason: 'Capital shortfall',
        articleCitation: 'Article 5, Regulation 2310-13',
      });

      component.addReason();
      fixture.detectChanges();

      expect(component.reasonsArray.length).toBe(1);
      expect(component.newReasonForm.controls.reason.value).toBe('');
      expect(component.newReasonForm.controls.articleCitation.value).toBe('');
    });

    it('removeReason removes the entry at the given index', () => {
      component.newReasonForm.setValue({ reason: 'Reason 1', articleCitation: 'Art 1' });
      component.addReason();
      component.newReasonForm.setValue({ reason: 'Reason 2', articleCitation: 'Art 2' });
      component.addReason();

      component.removeReason(0);

      expect(component.reasonsArray.length).toBe(1);
      expect((component.reasonsArray.at(0).value as { reason: string }).reason).toBe('Reason 2');
    });
  });
});
