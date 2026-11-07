import {
  AfterViewInit,
  Component,
  Directive,
  ElementRef,
  HostListener,
  Injectable,
  OnDestroy,
  Output,
  EventEmitter,
  inject,
  signal,
} from '@angular/core';

@Directive({ selector: 'dialog[appModal]' })
export class ModalFocus implements AfterViewInit, OnDestroy {
  private readonly element = inject<ElementRef<HTMLDialogElement>>(ElementRef);
  private previous: HTMLElement | null = null;
  @Output() modalCancelled = new EventEmitter<void>();
  ngAfterViewInit() {
    this.previous = document.activeElement as HTMLElement;
    this.element.nativeElement.tabIndex = -1;
    const dialog = this.element.nativeElement;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', ''); // DOM-test fallback; real browsers use native modal focus containment.
  }
  @HostListener('keydown', ['$event']) keepFocus(event: KeyboardEvent) {
    if (event.key !== 'Tab') return;
    const dialog = this.element.nativeElement;
    const controls = [
      ...dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]),a[href],input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
      ),
    ].filter((control) => control.getClientRects().length > 0);
    const first = controls[0],
      last = controls[controls.length - 1],
      active = document.activeElement;
    if (!first) {
      event.preventDefault();
      dialog.focus();
      return;
    }
    if (event.shiftKey && (active === first || !dialog.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
      event.preventDefault();
      first.focus();
    }
  }
  @HostListener('cancel', ['$event']) cancel(event: Event) {
    event.preventDefault();
    this.modalCancelled.emit();
  }
  ngOnDestroy() {
    const dialog = this.element.nativeElement;
    if (typeof dialog.close === 'function' && dialog.open) dialog.close();
    if (this.previous?.isConnected && !this.previous.hasAttribute('disabled'))
      this.previous.focus();
    else document.getElementById('main')?.focus({ preventScroll: true });
  }
}
@Injectable({ providedIn: 'root' })
export class Confirmation {
  readonly request = signal<{ title: string; message: string; action: string } | null>(null);
  private resolve?: (accepted: boolean) => void;
  ask(title: string, message: string, action = 'Continue'): Promise<boolean> {
    if (this.request()) return Promise.resolve(false);
    this.request.set({ title, message, action });
    return new Promise((resolve) => {
      this.resolve = resolve;
    });
  }
  answer(accepted: boolean) {
    const resolve = this.resolve;
    this.resolve = undefined;
    this.request.set(null);
    resolve?.(accepted);
  }
}
@Component({
  selector: 'app-confirm-dialog',
  imports: [ModalFocus],
  template: `@if (confirmation.request(); as request) {
    <dialog
      appModal
      aria-labelledby="confirmation-title"
      aria-describedby="confirmation-description"
      (modalCancelled)="confirmation.answer(false)"
    >
      <h2 id="confirmation-title">{{ request.title }}</h2>
      <p id="confirmation-description">{{ request.message }}</p>
      <div class="actions">
        <button autofocus (click)="confirmation.answer(false)">Cancel</button
        ><button class="primary" (click)="confirmation.answer(true)">{{ request.action }}</button>
      </div>
    </dialog>
  }`,
})
export class ConfirmDialog {
  readonly confirmation = inject(Confirmation);
}
