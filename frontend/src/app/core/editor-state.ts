import {
  Directive,
  HostListener,
  HostBinding,
  ElementRef,
  Input,
  OnDestroy,
  inject,
} from '@angular/core';
import { FormGroupDirective, NgControl, Validators } from '@angular/forms';

import { EditorState } from './editor-session';
export { EditorState, editorLeaveGuard } from './editor-session';

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
