import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { Login } from './login';
describe('Sign in', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  it('submits credentials only to the login API and clears the password after success', async () => {
    const navigation = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const f = TestBed.createComponent(Login);
    f.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http
      .expectOne('/api/v1/auth/me')
      .flush({ mode: 'NORMAL', authenticated: false, readOnly: false, username: null });
    f.componentInstance.form.setValue({ username: 'owner', password: 'ephemeral-test-password' });
    f.componentInstance.login();
    expect(f.componentInstance.busy()).toBe(true);
    const request = http.expectOne('/api/v1/auth/login');
    expect(request.request.method).toBe('POST');
    expect(request.request.body.username).toBe('owner');
    request.flush({ mode: 'NORMAL', authenticated: true, readOnly: false, username: 'owner' });
    await f.whenStable();
    expect(f.componentInstance.form.controls.password.value).toBe('');
    expect(navigation).toHaveBeenCalledWith('/');
  });
  it('shows sanitized failed login and clears typed password', async () => {
    const f = TestBed.createComponent(Login);
    f.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http
      .expectOne('/api/v1/auth/me')
      .flush({ mode: 'NORMAL', authenticated: false, readOnly: false, username: null });
    f.componentInstance.form.setValue({ username: 'owner', password: 'wrong-ephemeral-password' });
    f.componentInstance.login();
    http
      .expectOne('/api/v1/auth/login')
      .flush(
        { message: 'Invalid account name or password.' },
        { status: 401, statusText: 'Unauthorized' },
      );
    await f.whenStable();
    expect(f.nativeElement.textContent).toContain('Invalid account name or password.');
    expect(f.componentInstance.form.controls.password.value).toBe('');
  });
});
