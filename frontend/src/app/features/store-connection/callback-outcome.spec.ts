import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, ActivatedRoute, convertToParamMap } from '@angular/router';
import { CallbackOutcome } from './callback-outcome';
it('never trusts callback outcome as proof of connection or echoes secret query values', async () => {
  TestBed.configureTestingModule({
    imports: [CallbackOutcome],
    providers: [
      provideRouter([]),
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: {
            queryParamMap: convertToParamMap({
              outcome: 'untrusted',
              code: 'ephemeral-private-code',
              state: 'ephemeral-state',
              hmac: 'ephemeral-hmac',
            }),
          },
        },
      },
    ],
  });
  const navigation = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  const f = TestBed.createComponent(CallbackOutcome);
  await f.whenStable();
  expect(f.nativeElement.textContent).toContain('Authorization could not be completed');
  expect(f.nativeElement.textContent).not.toContain('ephemeral-private-code');
  expect(navigation).toHaveBeenCalledWith('/store-connection/callback?outcome=failed', {
    replaceUrl: true,
  });
});
