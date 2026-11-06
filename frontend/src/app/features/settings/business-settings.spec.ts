import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { BusinessSettings } from './business-settings';
import { SessionService } from '../../core/session.service';
describe('BusinessSettings', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [BusinessSettings],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  it('shows synthetic settings without editable merchant controls', () => {
    TestBed.inject(SessionService).value.set({
      mode: 'DEMO',
      authenticated: false,
      readOnly: true,
      username: null,
    });
    const fixture = TestBed.createComponent(BusinessSettings),
      http = TestBed.inject(HttpTestingController);
    http
      .expectOne('/api/v1/business-settings')
      .flush({
        id: 1,
        displayName: 'Synthetic business',
        currencyCode: 'MAD',
        version: 0,
        createdAt: '',
        updatedAt: '',
      });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Read-only synthetic settings');
    fixture.componentInstance.save();
    http.expectNone((r) => r.method === 'PUT');
  });
  it('validates input and preserves the backend currency restriction', async () => {
    const fixture = TestBed.createComponent(BusinessSettings);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/business-settings').flush({
      id: 1,
      displayName: 'My Business',
      currencyCode: 'MAD',
      version: 0,
      createdAt: '',
      updatedAt: '',
    });
    await fixture.whenStable();
    fixture.componentInstance.form.controls.currencyCode.setValue('usd');
    expect(fixture.componentInstance.form.invalid).toBe(true);
    fixture.componentInstance.form.controls.currencyCode.setValue('USD');
    fixture.componentInstance.save();
    const request = http.expectOne('/api/v1/business-settings');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body.version).toBe(0);
    request.flush(
      { code: 'CURRENCY_LOCKED', message: 'Currency cannot change while variants exist.' },
      { status: 409, statusText: 'Conflict' },
    );
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'Currency cannot change',
    );
    expect(fixture.componentInstance.form.controls.currencyCode.value).toBe('USD');
  });
});
