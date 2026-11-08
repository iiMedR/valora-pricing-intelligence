import { TestBed } from '@angular/core/testing';
import { ExplainMore, formatMoney } from './foundation';
describe('Product foundation', () => {
  it('rounds display money without losing large decimal precision', () => {
    expect(formatMoney('18464745.8400', 'MAD')).toBe('18,464,745.84 MAD');
    expect(formatMoney('999999999999999.9999', 'MAD')).toBe('1,000,000,000,000,000.00 MAD');
    expect(formatMoney('-0.125', 'MAD')).toBe('-0.13 MAD');
    expect(formatMoney('100.5', 'JPY')).toBe('101 JPY');
    expect(formatMoney('1.2345', 'TND')).toBe('1.235 TND');
    expect(formatMoney(null, 'MAD')).toBe('Unavailable');
    expect(formatMoney('not-money', 'MAD')).toBe('Unavailable');
  });
  it('opens a labeled explanation, prevents nested modals and restores trigger focus', async () => {
    TestBed.configureTestingModule({ imports: [ExplainMore] });
    const f = TestBed.createComponent(ExplainMore);
    f.componentRef.setInput('title', 'Actual evidence');
    await f.whenStable();
    const trigger = f.nativeElement.querySelector('button');
    trigger.focus();
    trigger.click();
    await f.whenStable();
    const dialog = f.nativeElement.querySelector('dialog');
    expect(dialog.getAttribute('aria-labelledby')).toBe(f.componentInstance.id);
    dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
    await f.whenStable();
    expect(f.nativeElement.querySelector('dialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);
    const other = document.createElement('dialog');
    other.setAttribute('open', '');
    document.body.appendChild(other);
    f.componentInstance.show();
    expect(f.componentInstance.open()).toBe(false);
    other.remove();
  });
});
