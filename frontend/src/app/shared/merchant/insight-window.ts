import { ParamMap } from '@angular/router';

/** Preserve explicit valid deep-link selections; invalid input never silently changes the model. */
export function insightWindow(initial: { startDate: string; endDate: string }, params: ParamMap) {
  const validDate = (value: string | null): value is string =>
    !!value &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value + 'T00:00:00Z')) &&
    new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) === value;
  const from = params.get('startDate'),
    to = params.get('endDate'),
    horizon = Number(params.get('horizonDays'));
  return {
    startDate: validDate(from) ? from : initial.startDate,
    endDate: validDate(to) ? to : initial.endDate,
    horizonDays: [7, 14, 30].includes(horizon) ? horizon : 30,
  };
}
