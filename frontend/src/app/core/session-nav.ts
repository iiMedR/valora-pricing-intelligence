import { EditorState } from './editor-session';
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SessionService } from './session.service';
@Component({
  selector: 'app-session-nav',
  imports: [RouterLink],
  template: `
    @if (session.value()?.authenticated) {
      <span>{{ session.value()?.username }}</span>
      <button (click)="logout()" [disabled]="busy()">Sign out</button>
    } @else if (
      session.value() && (session.value()?.mode !== 'DEMO' || session.value()?.loginRequired)
    ) {
      <a routerLink="/login">Sign in</a>
    } @else {
      <span role="status">Checking access…</span>
    }
    @if (error()) {
      <span role="alert">Session unavailable. <button (click)="load()">Retry session</button></span>
    }
  `,
  styles: [
    `
      :host {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        font-size: 14px;
      }
      button {
        padding: 8px 12px;
      }
    `,
  ],
})
export class SessionNav {
  private readonly editors = inject(EditorState);
  readonly session = inject(SessionService);
  private readonly router = inject(Router);
  readonly error = signal(false);
  readonly busy = signal(false);
  constructor() {
    this.load();
  }
  load() {
    this.error.set(false);
    this.session.ensure().subscribe({ error: () => this.error.set(true) });
  }
  async logout() {
    if (this.busy() || !(await this.editors.canLeave())) return;
    this.busy.set(true);
    this.error.set(false);
    this.session.logout().subscribe({
      next: () => {
        this.busy.set(false);
        void this.router.navigate(['/login']);
      },
      error: () => {
        this.busy.set(false);
        this.error.set(true);
      },
    });
  }
}
