export const RECURRING_FREQUENCIES = ['weekly', 'biweekly', 'monthly', 'annual'] as const
export type RecurringFrequency = (typeof RECURRING_FREQUENCIES)[number]
