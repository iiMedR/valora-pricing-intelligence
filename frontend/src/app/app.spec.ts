import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
it('renders workspace navigation', async () => {
  TestBed.configureTestingModule({
    imports: [App],
    providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
  });
  const fixture = TestBed.createComponent(App);
  TestBed.inject(HttpTestingController)
    .expectOne('/api/v1/auth/me')
    .flush({ mode: 'NORMAL', authenticated: false, readOnly: false, username: null });
  TestBed.inject(HttpTestingController).expectOne('/api/v1/environment').flush({
    mode: 'NORMAL',
    synthetic: false,
    label: 'Local workspace',
    datasetVersion: null,
    datasetState: 'NOT_APPLICABLE',
  });
  await fixture.whenStable();
  expect(fixture.nativeElement.querySelector('nav').textContent).toContain('Overview');
  TestBed.inject(HttpTestingController).verify();
});
