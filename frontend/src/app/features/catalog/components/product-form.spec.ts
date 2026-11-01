import { TestBed } from '@angular/core/testing';
import { SimpleChange } from '@angular/core';
import { ProductForm } from './product-form';
import { ProductWrite } from '../models/catalog.models';
describe('ProductForm', () => {
  it('validates names and emits an archived product with no category', () => {
    const fixture = TestBed.createComponent(ProductForm);
    const component = fixture.componentInstance;
    let emitted: ProductWrite | undefined;
    component.saved.subscribe((value) => (emitted = value));
    component.form.controls.name.setValue(' ');
    component.submit();
    expect(emitted).toBeUndefined();
    component.form.controls.name.setValue('New product');
    component.submit();
    expect(emitted?.status).toBe('ARCHIVED');
    expect(emitted?.categoryId).toBeNull();
  });
  it('keeps user input when saving status changes', () => {
    const component = TestBed.createComponent(ProductForm).componentInstance;
    component.form.controls.name.setValue('Keep this name');
    component.ngOnChanges({ saving: new SimpleChange(false, true, false) });
    expect(component.form.controls.name.value).toBe('Keep this name');
  });
});
