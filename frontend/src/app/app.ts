import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { EnvironmentIndicator } from './core/environment-indicator';
@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, EnvironmentIndicator],
  templateUrl: './app.html',
})
export class App {}
