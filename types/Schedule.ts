import { z } from 'zod';

export const UnixTimestamp = z.number();
export type UnixTimestamp = z.infer<typeof UnixTimestamp>;

export const RecurringSchedule = z.object({
  kind: z.literal('recurring'),
  start: UnixTimestamp.optional(),
  end: UnixTimestamp.optional(),
  every: z.tuple([z.number(), z.enum(['days', 'weeks', 'months', 'years'])]),
  weekdays: z.enum([
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ]).array().optional(),
  monthdays: z.number().refine(n => n >= 0 && n < 31).array().optional(),
});
export type RecurringSchedule = z.infer<typeof RecurringSchedule>;

export const OngoingSchedule = z.object({
  kind: z.literal('ongoing'),
  start: UnixTimestamp,
});
export type OngoingSchedule = z.infer<typeof OngoingSchedule>;

export const DiscreteSchedule = z.object({
  kind: z.literal('discrete'),
  start: UnixTimestamp,
  end: UnixTimestamp,
});
export type DiscreteSchedule = z.infer<typeof DiscreteSchedule>;

export const Schedule = z.discriminatedUnion('kind', [
  RecurringSchedule,
  OngoingSchedule,
  DiscreteSchedule,
]);
export type Schedule = z.infer<typeof Schedule>;

