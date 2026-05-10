import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ButtonComponent } from '../../shared/components/button/button.component';

@Component({
  selector: 'app-no-access',
  standalone: true,
  imports: [ButtonComponent, RouterLink],
  templateUrl: './no-access.component.html',
})
export class NoAccessComponent {}
