import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { EnvironmentIndicator } from './core/environment-indicator';
import { SessionNav } from './core/session-nav';
@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, EnvironmentIndicator, SessionNav],
  templateUrl: './app.html',
  styles: [
    `
      header {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 14px 24px;
      }
      header > .brand {
        grid-column: 1;
        grid-row: 1;
      }
      header > app-session-nav {
        grid-column: 2;
        grid-row: 1;
        max-width: 210px;
      }
      header > nav {
        grid-column: 1/-1;
        grid-row: 2;
        min-width: 0;
      }
    `,
  ],
})
export class App {}
