import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addDays, weekdayKey, appDate, creditedMinutes, remainingMinutes, isUnconfirmed,
  availableDates, buildPlanningContext, describeHistory,
} from '../src/services/scheduling.js';
import { setup, originalSessions, DAY1, DAY2, DAY3, EXAM } from './fixtures/canonical.js';

const plan = (sessions) => ({ ...setup, sessions });
const topic = setup.subjects[0].topics[0];

test('date helpers', () => {
  assert.equal(addDays('2026-02-28', 1), '2026-03-01');
  assert.equal(addDays('2026-03-02', -2), '2026-02-28');
  assert.equal(weekdayKey('2026-03-02'), 'mon');
  assert.equal(appDate(new Date(2026, 2, 2, 23, 30), 0), '2026-03-02');
  assert.equal(appDate(new Date(2026, 2, 2), 1), '2026-03-03');
});

test('credited minutes follow the actual-time rules', () => {
  const s = { plannedMinutes: 120, actualMinutes: null };
  assert.equal(creditedMinutes({ ...s, status: 'completed' }), 120);
  assert.equal(creditedMinutes({ ...s, status: 'completed', actualMinutes: 90 }), 90);
  assert.equal(creditedMinutes({ ...s, status: 'partial', actualMinutes: 60 }), 60);
  assert.equal(creditedMinutes({ ...s, status: 'skipped' }), 0);
  assert.equal(creditedMinutes({ ...s, status: 'planned' }), 0);
});

test('a 2-hour session done for 1 hour leaves about 1 hour remaining', () => {
  const sessions = [{ topicId: 't-trans', date: DAY1, plannedMinutes: 120, status: 'partial', actualMinutes: 60 }];
  assert.equal(remainingMinutes(topic, sessions), 60);
  assert.equal(remainingMinutes(topic, []), 120);
});

test('Unconfirmed is derived: planned and dated before today', () => {
  const s = { status: 'planned', date: DAY1 };
  assert.equal(isUnconfirmed(s, DAY2), true);
  assert.equal(isUnconfirmed(s, DAY1), false);
  assert.equal(isUnconfirmed({ ...s, status: 'skipped' }, DAY2), false);
});

test('available dates run from today to the day before the exam', () => {
  const dates = availableDates({ ...setup, sessions: [], today: DAY1 });
  assert.deepEqual(dates.map((d) => d.date), [DAY1, DAY2, DAY3]);
  assert.ok(dates.every((d) => d.availableMinutes === 120));
  assert.ok(!dates.some((d) => d.date === EXAM));
});

test("work already done today reduces today's availability", () => {
  const sessions = [{ topicId: 't-trans', date: DAY2, plannedMinutes: 120, status: 'partial', actualMinutes: 45 }];
  const dates = availableDates({ ...setup, sessions, today: DAY2 });
  assert.equal(dates[0].availableMinutes, 75);
});

test('canonical Day 1: 6 hours needed, 6 hours available', () => {
  const ctx = buildPlanningContext({ plan: plan([]), today: DAY1 });
  assert.deepEqual(ctx.summary, { neededMinutes: 360, availableMinutes: 360 });
});

test('canonical Day 2 with Day 1 Unconfirmed: 6 hours needed, 4 hours available', () => {
  const ctx = buildPlanningContext({ plan: plan(originalSessions), today: DAY2 });
  assert.deepEqual(ctx.summary, { neededMinutes: 360, availableMinutes: 240 });
  assert.deepEqual(Object.keys(ctx.capacityByDate), [DAY2, DAY3]);
  assert.equal(describeHistory({ plan: plan(originalSessions), today: DAY2 }).unconfirmed.length, 1);
});
