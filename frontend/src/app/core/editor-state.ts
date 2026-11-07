import {
  Directive,
  HostListener,
  HostBinding,
  ElementRef,
  Injectable,
  Input,
  OnDestroy,
  inject,
} from '@angular/core';
import { FormGroupDirective, NgControl, Validators } from '@angular/forms';
import { CanDeactivateFn } from '@angular/router';
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
@Directive({ selector: 'form[appEditForm]' })
export class EditForm implements OnDestroy {
  readonly form = inject(FormGroupDirective);
  private readonly state = inject(EditorState);
  @Input() editorBusy = false;
  constructor() {
    this.state.editors.add(this);
  }
  private readonly element = inject<ElementRef<HTMLFormElement>>(ElementRef);
  @HostBinding('attr.aria-busy') get busyState() {
    return this.editorBusy ? 'true' : null;
  }
  @HostListener('submit') focusInvalid() {
    queueMicrotask(() => {
      if (this.element.nativeElement.isConnected)
        this.element.nativeElement
          .querySelector<HTMLElement>('[formControlName].ng-invalid')
          ?.focus();
    });
  }
  @HostListener('window:beforeunload', ['$event']) beforeUnload(event: BeforeUnloadEvent) {
    if (this.form.form.dirty || this.editorBusy) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
  ngOnDestroy() {
    this.state.editors.delete(this);
  }
}
export const editorLeaveGuard: CanDeactivateFn<unknown> = () => {
  // Session-expiry navigation must always remove protected content promptly.
  if (inject(SessionService).value()?.authenticated !== true) return true;
  return inject(EditorState).canLeave();
};

@Directive({ selector: 'input[formControlName],select[formControlName],textarea[formControlName]' })
export class ControlState {
  private readonly control = inject(NgControl, { self: true });
  private readonly editor = inject(EditForm, { optional: true });
  private readonly element = inject<ElementRef<HTMLInputElement>>(ElementRef);
  @HostBinding('disabled') get disabled() {
    return this.control.disabled || this.editor?.editorBusy || false;
  }
  @HostBinding('attr.aria-invalid') get invalid() {
    return this.control.invalid && (this.control.touched || this.control.dirty) ? 'true' : null;
  }
  @HostBinding('attr.aria-required') get required() {
    return this.control.control?.hasValidator(Validators.required) ||
      this.element.nativeElement.required
      ? 'true'
      : null;
  }
}
