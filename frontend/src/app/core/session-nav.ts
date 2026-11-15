import { EditorState } from './editor-session';
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SessionService } from './session.service';
@Component({
  selector: 'app-session-nav',
  imports: [RouterLink],
  template: `
    @if (session.value()?.authenticated) {
      <span class="session-username" [title]="session.value()?.username ?? ''">{{
        session.value()?.username
      }}</span>
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
      .session-username {
        max-width: 100px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      @media (max-width: 1050px) {
        :host {
          gap: 6px;
          font-size: 12px;
          justify-content: flex-end;
          flex-wrap: nowrap;
          min-width: 0;
        }
        button {
          min-height: 40px;
          padding: 8px 10px;
          font-size: 12px;
          white-space: nowrap;
        }
        .session-username {
          max-width: 64px;
        }
        [role='alert'] {
          white-space: normal;
        }
      }
      @media (max-width: 360px) {
        .session-username {
          display: none;
        }
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
