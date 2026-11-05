import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { HttpErrorResponse, HttpInterceptorFn, HttpXsrfTokenExtractor } from '@angular/common/http';
import { catchError, map, of, switchMap, throwError } from 'rxjs';
import { SessionService, safeReturnUrl } from './session.service';
export const authGuard: CanActivateFn = (_route, state) => {
  const session = inject(SessionService),
    router = inject(Router);
  return session.ensure().pipe(
    map((v) =>
      v.authenticated || v.mode === 'DEMO'
        ? true
        : router.createUrlTree(['/login'], {
            queryParams: { returnUrl: safeReturnUrl(state.url) },
          }),
    ),
    catchError(() =>
      of(
        router.createUrlTree(['/login'], { queryParams: { returnUrl: safeReturnUrl(state.url) } }),
      ),
    ),
  );
};
export const writeGuard: CanActivateFn = (_route, state) => {
  const session = inject(SessionService),
    router = inject(Router);
  return session.ensure().pipe(
    map((v) =>
      v.mode === 'DEMO'
        ? router.createUrlTree(['/orders'])
        : v.authenticated
          ? true
          : router.createUrlTree(['/login'], {
              queryParams: { returnUrl: safeReturnUrl(state.url) },
            }),
    ),
    catchError(() => of(router.createUrlTree(['/login']))),
  );
};
export const sessionInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith('/api/')) return next(request);
  const session = inject(SessionService),
    router = inject(Router),
    tokens = inject(HttpXsrfTokenExtractor);
  const send = () => {
    const token = tokens.getToken();
    return next(
      !['GET', 'HEAD', 'OPTIONS'].includes(request.method) && token
        ? request.clone({ setHeaders: { 'X-XSRF-TOKEN': token } })
        : request,
    );
  };
  const response = ['GET', 'HEAD', 'OPTIONS'].includes(request.method)
    ? send()
    : session.csrf().pipe(switchMap(() => send()));
  return response.pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !request.url.startsWith('/api/v1/auth/')) {
        session.clear();
        void router.navigate(['/login'], { queryParams: { returnUrl: safeReturnUrl(router.url) } });
      }
      return throwError(() => error);
    }),
  );
};
