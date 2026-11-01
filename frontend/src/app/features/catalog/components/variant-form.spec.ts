import { TestBed } from '@angular/core/testing';
import { VariantForm } from './variant-form';
import { VariantWrite } from '../models/catalog.models';
describe('VariantForm', () => {
  it('rejects invalid bounds and excess precision', () => {
    const component = TestBed.createComponent(VariantForm).componentInstance;
    component.form.setValue({
      sku: 'SKU',
      name: 'Standard',
      costPrice: '0',
      currentPrice: '10',
      minPrice: '11',
      maxPrice: '20',
      status: 'ACTIVE',
    });
    expect(component.form.hasError('priceBounds')).toBe(true);
    component.form.patchValue({ minPrice: '1', currentPrice: '10.00001' });
    expect(component.form.invalid).toBe(true);
    component.form.patchValue({ currentPrice: '0' });
    expect(component.form.invalid).toBe(true);
  });
  it('retains all decimal digits and warns for loss leaders without blocking', () => {
    const component = TestBed.createComponent(VariantForm).componentInstance;
    let emitted: VariantWrite | undefined;
    component.saved.subscribe((value) => (emitted = value));
    component.form.setValue({
      sku: 'SKU',
      name: 'Standard',
      costPrice: '999999999999999.9999',
      currentPrice: '10.1234',
      minPrice: '5',
      maxPrice: '20',
      status: 'ACTIVE',
    });
    expect(component.belowCost()).toBe(true);
    component.submit();
    expect(emitted?.costPrice).toBe('999999999999999.9999');
    expect(emitted?.currentPrice).toBe('10.1234');
  });
});
