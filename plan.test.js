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

import { findExercises, illustrationKey, identifyExercises, newExercise, editExercises, startExercise, updateTodaySession } from './public/plan.js';

test('busca sem acento, inclusão pelo catálogo e exercício personalizado', () => {
  const name = findExercises('TRICEPS CORDA')[0];
  assert.equal(name, 'Tríceps corda na polia');
  const initial = identifyExercises('peito', planFor(workouts[0], 1));
  const fromCatalog = newExercise('catalog', name, 3, '10 - 12');
  const custom = newExercise('custom', '  Meu exercício  ', 4, '8');
  const updated = editExercises(editExercises(initial, null, fromCatalog), null, custom);
  assert.deepEqual(updated.slice(-2).map(e => [e.name,e.sets,e.target]), [
    ['Tríceps corda na polia',3,'10–12'], ['Meu exercício',4,'8']
  ]);
  assert.equal(newExercise('bad', 'Teste', 2, '12–8'), null);
  assert.equal(newExercise('bad', 'Teste', 13, '10'), null);
  assert.equal(newExercise('bad', '   ', 2, '10'), null);
});

test('substituir em sessão legada preserva resultados com o exercício original', () => {
  const original = planFor(workouts[0], 1);
  const session = { workout: 'peito', complete: true, note: 'Treino de teste', exercises: original.map(startExercise) };
  session.exercises[0].results[0] = {done:true, amount:'11', kg:'20', effort:3};
  session.exercises[0].results[1].kg = '0';
  session.exercises[1].results[0].kg = '15';
  const before = identifyExercises('peito', original);
  const replacement = newExercise('replacement','Supino reto com barra',3,'10');
  const after = editExercises(before, before[0].id, replacement);
  const updated = updateTodaySession(session, 'peito', before, after);
  assert.equal(updated.complete, true);
  assert.equal(updated.note, session.note);
  assert.equal(updated.exercises[0].name, replacement.name);
  assert.equal(updated.exercises[0].results.length, 3);
  assert.ok(updated.exercises[0].results.every(set => !set.done && !set.kg));
  assert.deepEqual(updated.archivedExercises[0].results, [
    {done:true,amount:'11',kg:'20',effort:3,number:1},
    {done:false,amount:'',kg:'0',number:2}
  ]);
  assert.deepEqual(updated.exercises[1].results, session.exercises[1].results);
  assert.equal(updateTodaySession(session, 'costas', before, after), session);
  assert.equal(updateTodaySession(undefined, 'peito', before, after), undefined);
  assert.equal(session.exercises[0].name, original[0].name);
  assert.equal(updateTodaySession(updated,'peito',after,after).archivedExercises.length,1);
});

test('incluir e reduzir séries preserva todas as séries com dados', () => {
  const before = identifyExercises('peito', planFor(workouts[0], 3));
  const session = { workout:'peito', exercises:before.map(startExercise) };
  session.exercises[0].results[2].amount = '8';
  const reduced = [{...before[0],sets:1}, ...before.slice(1)];
  const extra = newExercise('extra','Exercício adicional',2,'12');
  const after = editExercises(reduced, null, extra);
  const updated = updateTodaySession(session,'peito',before,after);
  assert.equal(updated.exercises[0].results.length,3);
  assert.equal(updated.exercises[0].results[2].amount,'8');
  assert.deepEqual(updated.exercises.at(-1),startExercise(extra));
});

test('seleciona a imagem da variação correspondente sem confundir aparelhos', () => {
  assert.equal(illustrationKey(' TRÍCEPS CORDA na polia '), 'triceps-corda');
  assert.equal(illustrationKey('Supino máquina ou halteres'), 'supino-maquina');
  assert.equal(illustrationKey('Abdominal na máquina'), 'abdominal-maquina');
  assert.equal(illustrationKey('Crunch na polia ou abdominal máquina'), 'crunch-polia');
  assert.equal(illustrationKey('Remada no aparelho personalizado'), null);
  assert.notEqual(illustrationKey('Prancha'), illustrationKey('Prancha lateral'));
  assert.ok([...workouts, ...fullBody].every(w => w.exercises.every(e => illustrationKey(e.name))));
});
