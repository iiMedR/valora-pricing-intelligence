import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { provideHttpClient } from '@angular/common/http';
import { Confirmation, ConfirmDialog } from './confirmation';
import { EditForm, ControlState, EditorState, editorLeaveGuard } from './editor-state';
import { SessionService } from './session.service';
@Component({
  imports: [ReactiveFormsModule, EditForm, ControlState],
  template:
    '<form appEditForm [editorBusy]="busy" [formGroup]="form"><label>Name<input formControlName="name"></label><button>Save</button></form>',
})
class Editor {
  busy = false;
  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });
}
describe('Editor safety and accessible confirmation', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [Editor, ConfirmDialog],
      providers: [provideHttpClient()],
    }),
  );
  it('keeps a dirty edit on cancelled navigation, then clears only successful state', async () => {
    const f = TestBed.createComponent(Editor);
    f.detectChanges();
    const state = TestBed.inject(EditorState),
      confirmation = TestBed.inject(Confirmation);
    TestBed.inject(SessionService).value.set({
      mode: 'NORMAL',
      authenticated: true,
      readOnly: false,
      username: 'owner',
    });
    f.componentInstance.form.controls.name.setValue('Keep my draft');
    f.componentInstance.form.markAsDirty();
    const result = TestBed.runInInjectionContext(() =>
      editorLeaveGuard({} as never, {} as never, {} as never, {} as never),
    );
    expect(confirmation.request()?.title).toContain('unsaved');
    confirmation.answer(false);
    expect(await result).toBe(false);
    expect(f.componentInstance.form.value.name).toBe('Keep my draft');
    state.saved();
    expect(state.canLeave()).toBe(true);
    f.destroy();
    expect(state.editors.size).toBe(0);
  });
  it('announces invalid controls and permits forced session-expiry navigation', () => {
    const f = TestBed.createComponent(Editor);
    f.componentInstance.form.markAllAsTouched();
    f.componentInstance.form.markAsDirty();
    f.detectChanges();
    expect(f.nativeElement.querySelector('input').getAttribute('aria-invalid')).toBe('true');
    TestBed.inject(SessionService).clear();
    expect(
      TestBed.runInInjectionContext(() =>
        editorLeaveGuard({} as never, {} as never, {} as never, {} as never),
      ),
    ).toBe(true);
  });
  it('does not silently leave during an in-flight save', async () => {
    const f = TestBed.createComponent(Editor);
    f.componentInstance.busy = true;
    f.detectChanges();
    expect(f.nativeElement.querySelector('input').disabled).toBe(true);
    expect(f.nativeElement.querySelector('input').disabled).toBe(true);
    const state = TestBed.inject(EditorState),
      confirmation = TestBed.inject(Confirmation);
    const result = state.canLeave();
    expect(confirmation.request()?.title).toContain('save');
    confirmation.answer(false);
    expect(await result).toBe(false);
  });
  it('cancels a real dialog request and restores its trigger focus', async () => {
    const f = TestBed.createComponent(ConfirmDialog);
    const trigger = document.createElement('button');
    document.body.append(trigger);
    trigger.focus();
    const confirmation = TestBed.inject(Confirmation);
    const accepted = confirmation.ask(
      'Archive product?',
      'History is retained.',
      'Archive product',
    );
    await f.whenStable();
    const dialog = f.nativeElement.querySelector('dialog');
    expect(dialog.getAttribute('aria-describedby')).toBe('confirmation-description');
    const buttons = [...dialog.querySelectorAll('button')] as HTMLButtonElement[];
    for (const button of buttons)
      vi.spyOn(button, 'getClientRects').mockReturnValue([{}] as unknown as DOMRectList);
    buttons[buttons.length - 1].focus();
    const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    dialog.dispatchEvent(tab);
    expect(tab.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(buttons[0]);
    dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
    await f.whenStable();
    expect(await accepted).toBe(false);
    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });
});
