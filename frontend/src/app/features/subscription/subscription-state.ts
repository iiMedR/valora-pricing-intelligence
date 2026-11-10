export interface SubscriptionSelection {
  start: string;
  asOf: string;
  search: string;
  sort: string;
  page: number;
  planId: string | null;
}
const opaqueId = /^[A-Za-z0-9_-]{1,64}$/;
export function validSubscriptionDate(value: string | null, today: string): value is string {
  return (
    !!value &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    value >= '2000-01-01' &&
    value <= today &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}
export function subscriptionSelection(
  params: { get(key: string): string | null },
  today: string,
): SubscriptionSelection {
  const end = params.get('asOf');
  const asOf = validSubscriptionDate(end, today) ? end : today;
  const defaultStart = new Date(Math.max(Date.UTC(2000, 0, 1), Date.parse(asOf) - 29 * 86400000))
    .toISOString()
    .slice(0, 10);
  const from = params.get('start');
  const start =
    validSubscriptionDate(from, today) &&
    from <= asOf &&
    (Date.parse(asOf) - Date.parse(from)) / 86400000 < 366
      ? from
      : defaultStart;
  const search = params.get('search') ?? '';
  const page = params.get('page') ?? '';
  const plan = params.get('planId');
  return {
    start,
    asOf,
    search: search.length <= 80 && !/[\u0000-\u001f@]/.test(search) ? search : '',
    sort: params.get('sort') === 'price' ? 'price' : 'name',
    page: /^\d{1,5}$/.test(page) && Number(page) <= 10000 ? Number(page) : 0,
    planId: plan && opaqueId.test(plan) ? plan : null,
  };
}
export function subscriptionQuery(state: SubscriptionSelection) {
  return {
    start: state.start,
    asOf: state.asOf,
    search: state.search || null,
    sort: state.sort === 'name' ? null : state.sort,
    page: state.page || null,
    planId: state.planId,
  };
}
