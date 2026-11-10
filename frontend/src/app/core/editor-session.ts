import { Injectable, inject } from '@angular/core';
import type { CanDeactivateFn } from '@angular/router';
import type { EditForm } from './editor-state';
import { Confirmation } from './confirmation';
import { SessionService } from './session.service';

@Injectable({ providedIn: 'root' })
export class EditorState {
  readonly editors = new Set<EditForm>();
  private readonly confirmation = inject(Confirmation);
  canLeave(): boolean | Promise<boolean> {
    const editors = [...this.editors];
    const busy = editors.some((editor) => editor.editorBusy);
    if (!busy && !editors.some((editor) => editor.form.form.dirty)) return true;
    return this.confirmation.ask(
      busy ? 'A save is still in progress' : 'Discard unsaved changes?',
      busy
        ? 'The server may still finish this request. Stay to review its result, or leave and reload before editing again.'
        : 'Your edits have not been saved. Stay to continue editing, or discard them and leave.',
      busy ? 'Leave anyway' : 'Discard and leave',
    );
  }
  saved() {
    this.editors.forEach((editor) => editor.form.form.markAsPristine());
  }
}
export const editorLeaveGuard: CanDeactivateFn<unknown> = () => {
  // Session-expiry navigation must always remove protected content promptly.
  if (inject(SessionService).value()?.authenticated !== true) return true;
  return inject(EditorState).canLeave();
};
