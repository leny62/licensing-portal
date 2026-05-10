import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApplicationState } from '../../../core/enums/application-state.enum';
import { StatusBadgeComponent } from './status-badge.component';

describe(StatusBadgeComponent.name, () => {
  let fixture: ComponentFixture<StatusBadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatusBadgeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(StatusBadgeComponent);
  });

  it('renders a readable state label', () => {
    fixture.componentInstance.state = ApplicationState.ChangesRequested;
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Changes requested');
  });

  it('falls back cleanly for unknown states', () => {
    fixture.componentInstance.state = 'SOMETHING_NEW';
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('SOMETHING_NEW');
    expect(fixture.nativeElement.querySelector('span').className).toContain('status-neutral');
  });
});
