import { TestBed } from '@angular/core/testing';
import { ProductThumbnail, productImageSource } from './product-thumbnail';
describe('Product thumbnail', () => {
  it('allows only credential-free supported image sources', () => {
    const base = 'http://localhost:4201/';
    expect(productImageSource('/assets/pen.webp', base)).toBe(base + 'assets/pen.webp');
    expect(productImageSource('https://cdn.shopify.com/products/pen.png', base)).toBe(
      'https://cdn.shopify.com/products/pen.png',
    );
    for (const url of [
      'https://evil.test/pen.png',
      'javascript:alert(1)',
      'data:image/png;base64,a',
      'https://secret@cdn.shopify.com/pen.png',
      'https://cdn.shopify.com/pen.png?token=secret',
      '//evil.test/a.png',
      '/api/v1/products',
      '/assets/a.png#secret',
    ])
      expect(productImageSource(url, base)).toBeNull();
  });
  it('keeps a dimensioned lazy image and falls back on error, missing and unsafe URLs', async () => {
    TestBed.configureTestingModule({ imports: [ProductThumbnail] });
    const f = TestBed.createComponent(ProductThumbnail);
    f.componentRef.setInput('name', 'Desk Pen');
    await f.whenStable();
    expect(f.nativeElement.querySelector('[role="img"]').getAttribute('aria-label')).toBe(
      'No image available for Desk Pen',
    );
    f.componentRef.setInput('source', '/assets/pen.png');
    await f.whenStable();
    const img = f.nativeElement.querySelector('img');
    expect(img.alt).toBe('Desk Pen');
    expect(img.getAttribute('loading')).toBe('lazy');
    expect(img.getAttribute('width')).toBe('256');
    img.dispatchEvent(new Event('error'));
    await f.whenStable();
    expect(f.nativeElement.querySelector('img')).toBeNull();
    f.componentRef.setInput('source', '/assets/new.png');
    await f.whenStable();
    expect(f.nativeElement.querySelector('img')).toBeTruthy();
    f.componentRef.setInput('source', 'https://evil.test/a.png');
    await f.whenStable();
    expect(f.nativeElement.querySelector('img')).toBeNull();
  });
});
