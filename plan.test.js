import test from 'node:test';
import assert from 'node:assert/strict';
import { workouts, fullBody, planFor, week, counts } from './public/plan.js';

test('a agenda começa na segunda e atravessa o mês', () => {
  assert.deepEqual(week('2026-11-29'), ['2026-11-23','2026-11-24','2026-11-25','2026-11-26','2026-11-27','2026-11-28','2026-11-29']);
  assert.equal(week('2026-12-01')[0], '2026-11-30');
});
test('a progressão preserva o volume inicial e o treino original', () => {
  assert.ok(workouts.every(w => planFor(w,1).every(e => e.sets <= 2)));
  assert.equal(planFor(workouts[1],2)[0].sets, 3);
  assert.equal(planFor(workouts[1],3)[0].sets, 4);
  assert.equal(workouts[1].exercises[0].sets, 4);
  assert.equal(planFor(workouts[4],1)[0].sets, 1);
  assert.deepEqual(fullBody.map(w => w.day), ['Seg','Qua','Sex']);
});
test('a contagem de séries é independente da presença', () => {
  assert.deepEqual(counts({ complete: false, exercises: [{ results: [{done:true}, {done:false}] }] }), [1,2]);
});
