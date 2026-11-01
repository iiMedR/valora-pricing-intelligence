import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
it('renders workspace navigation', async () => {
  TestBed.configureTestingModule({ imports: [App], providers: [provideRouter([])] });
  const fixture = TestBed.createComponent(App);
  await fixture.whenStable();
  expect(fixture.nativeElement.querySelector('nav').textContent).toContain('Overview');
});
