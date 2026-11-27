import { workouts, fullBody, phases, planFor, dateKey, week, counts, findExercises, illustrationKey, identifyExercises, newExercise, editExercises, startExercise, updateTodaySession } from './plan.js';
import * as api from './api.js';

const app = document.querySelector('#app');
const status = document.querySelector('#status');
const logout = document.querySelector('#logout');
let data = new Map();
let page = 'treino';
let selectedDate = dateKey();
let workoutId;
let busy = false;
let planOpen;
let editor;
const illustrations = new Map();
const illustrationDialog = document.createElement('dialog');
illustrationDialog.className = 'illustration-dialog';
illustrationDialog.setAttribute('aria-labelledby', 'illustration-title');
illustrationDialog.innerHTML = '<div class="illustration-actions"><button type="button" aria-label="Fechar ilustração">Fechar</button></div>' +
  '<h2 id="illustration-title"></h2><img alt=""><p>Ilustração do manual do Projeto Fênix.</p>';
document.body.append(illustrationDialog);
illustrationDialog.querySelector('button').addEventListener('click', () => illustrationDialog.close());
illustrationDialog.addEventListener('close', () => illustrationDialog.querySelector('img').removeAttribute('src'));
const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const labels = [['treino','Treino'], ['plano','Plano'], ['hist','Histórico'], ['medidas','Medidas']];
const measures = ['Peso (kg)', 'Cintura (cm)', 'Abdômen (cm)', 'Peitoral (cm)', 'Pelve alta (cm)', 'Quadril (cm)', 'Braço D (cm)', 'Braço E (cm)', 'Coxa D (cm)', 'Coxa E (cm)', 'Panturrilha D (cm)', 'Panturrilha E (cm)'];
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const read = (kind, entry) => data.get(kind + '/' + entry)?.payload;
const preferences = () => read('plan', 'settings') || { phase: 1, mode: 'five' };
const schedule = () => preferences().mode === 'three' ? [...fullBody, workouts[5]] : workouts;
const displayDate = value => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(value + 'T12:00:00'));

function templateFor(workout) {
  return identifyExercises(workout.id, read('plan', workout.id)?.exercises || planFor(workout, preferences().phase));
}

function sessionFor(date, id) {
  const stored = read('session', date);
  if (stored) return structuredClone(stored);
  const list = schedule();
  const day = days[(new Date(date + 'T12:00:00').getDay() + 6) % 7];
  const workout = list.find(w => w.id === id) || list.find(w => w.day === day);
  if (!workout) return null;
  const template = templateFor(workout);
  return {
    workout: workout.id, title: workout.title, warmup: workout.warmup, complete: false,
    exercises: template.map(startExercise)
  };
}

async function store(kind, entry, payload) {
  const record = { kind, entry, payload };
  if (api.configured) await api.save(record);
  remember([record]);
}

function remember(records) {
  for (const record of records) data.set(record.kind + '/' + record.entry, record);
  if (!api.configured) localStorage.setItem('fenix-demo', JSON.stringify([...data.values()]));
}

async function saveCompared(records) {
  if (api.configured) {
    await api.saveChanges(records.map(record => ({
      ...record, expected: read(record.kind, record.entry) ?? null
    })));
  }
  remember(records);
}

async function saveTemplate(id, before, after) {
  const today = dateKey();
  const saved = read('session', today);
  const current = updateTodaySession(saved, id, before, after);
  const records = [{ kind: 'plan', entry: id, payload: { ...read('plan', id), exercises: after } }];
  if (saved && current !== saved) records.push({ kind: 'session', entry: today, payload: current });
  await saveCompared(records);
}

function header(title, detail) {
  return '<div class="heading"><p>' + escape(detail) + '</p><h1>' + escape(title) + '</h1></div>';
}
function button(label, action, attributes = '') {
  return '<button type="button" data-action="' + action + '" ' + attributes + '>' + label + '</button>';
}
function options(list, selected) {
  return list.map(([value,label]) => '<option value="' + escape(value) + '"' + (String(value) === String(selected) ? ' selected' : '') + '>' + escape(label) + '</option>').join('');
}
function numberInput(name, label, value, max, step = '1') {
  return '<label><span>' + escape(label) + '</span><input type="number" name="' + escape(name) + '" min="0" max="' + max + '" step="' + step + '" inputmode="' + (step === '1' ? 'numeric' : 'decimal') + '" value="' + escape(value) + '"></label>';
}

function workoutScreen() {
  const session = sessionFor(selectedDate, workoutId);
  const saved = read('session', selectedDate);
  const line = week(selectedDate).map((day, i) => button(
    '<span>' + days[i] + '</span><strong>' + day.slice(-2) + '</strong><small>' + (read('session', day)?.complete ? '✓' : '·') + '</small>',
    'date', 'class="day" data-value="' + day + '" aria-pressed="' + (day === selectedDate) + '" aria-label="' + days[i] + ', ' + day + (read('session', day)?.complete ? ', treino registrado' : '') + '"'
  )).join('');
  const tally = session ? counts(session) : [0,0];
  const title = session?.title || 'Dia sem treino programado';
  return header('Seu treino', 'AGENDA SEMANAL') +
    '<div class="week">' + line + '</div>' +
    '<div class="date-tools">' + button('Semana anterior', 'previous') + '<label><span>Data do treino</span><input id="date" aria-label="Data do treino" type="date" value="' + selectedDate + '"></label>' + button('Próxima semana','next') + '</div>' +
    '<section class="hero"><p>' + escape(displayDate(selectedDate)) + '</p><h2>' + escape(title) + '</h2>' +
    (saved?.complete ? '<span class="done">✓ Presença registrada</span>' : '') +
    (session ? '<p>' + escape(session.warmup) + '</p><progress max="' + Math.max(tally[1], 1) + '" value="' + tally[0] + '"></progress><small>' + tally.join(' de ') + ' séries concluídas</small>' : '') +
    '</section>' +
    (!saved ? '<label class="picker">Escolher treino<select id="workout">' + options([['','Treino do dia'],...schedule().map(w => [w.id,w.title])], workoutId) + '</select></label>' : '') +
    (!session ? '' : '<form id="training">' + session.exercises.map((e,i) => {
      const finished = e.results.filter(set => set.done).length;
      const photo = illustrationKey(e.name);
      const thumbnail = api.currentUser() && photo
        ? button('<img alt="" width="64" height="48">', 'view-illustration',
          'class="exercise-thumbnail" data-key="' + photo + '" data-name="' + escape(e.name) +
          '" hidden aria-label="' + escape('Ampliar ilustração de ' + e.name) + '"')
        : '';
      return '<details class="card exercise" ' + (openExercises.has(i) ? 'open' : '') + ' data-exercise="' + i + '"><summary>' + thumbnail + '<div class="exercise-label"><strong>' + escape(e.name) + '</strong><small>' + escape(e.sets + ' × ' + e.target + ' ' + e.unit + (e.rest ? ' · ' + e.rest + ' descanso' : '') + (e.optional ? ' · opcional' : '')) + '</small></div><span class="score">' + finished + '/' + e.sets + '</span></summary>' +
        e.results.map((set,j) => '<div class="set"><label class="check"><input type="checkbox" name="done-' + i + '-' + j + '"' + (set.done ? ' checked' : '') + '> Série ' + (j+1) + '</label>' +
          numberInput('amount-' + i + '-' + j, e.unit, set.amount, 1000) +
          (e.unit === 'reps' ? numberInput('kg-' + i + '-' + j, 'kg', set.kg, 1000, '0.01') : '') + '</div>').join('') + '</details>';
    }).join('') + archivedScreen(session) +
    '<div class="actions"><button type="submit" class="primary" value="save">Salvar séries</button><button type="submit" value="attendance">' + (session.complete ? 'Desmarcar presença' : 'Registrar presença') + '</button></div></form>');
}
async function showThumbnails() {
  const buttons = [...app.querySelectorAll('[data-action="view-illustration"]')];
  const owner = api.currentUser()?.id;
  if (!owner || !buttons.length) return;
  const keys = [...new Set(buttons.map(el => el.dataset.key))].filter(key => !illustrations.has(key));
  if (keys.length) {
    try {
      const rows = await api.exerciseIllustrations(keys);
      if (api.currentUser()?.id !== owner) return;
      for (const key of keys) illustrations.set(key, null);
      for (const row of rows) {
        if (keys.includes(row.exercise_key) && /^[a-zA-Z0-9+/]+={0,2}$/.test(row.webp_base64)) {
          illustrations.set(row.exercise_key, 'data:image/webp;base64,' + row.webp_base64);
        }
      }
    } catch { return; }
  }
  for (const el of buttons) {
    const url = illustrations.get(el.dataset.key);
    if (!el.isConnected || !url) continue;
    const image = el.querySelector('img');
    image.src = url;
    el.hidden = false;
  }
}

function openIllustration(target) {
  const url = illustrations.get(target.dataset.key);
  if (!url) return;
  const { name } = target.dataset;
  illustrationDialog.querySelector('h2').textContent = name;
  const image = illustrationDialog.querySelector('img');
  image.alt = 'Ilustração do manual para ' + name;
  image.src = url;
  illustrationDialog.showModal();
}

function archivedScreen(session) {
  if (!session.archivedExercises?.length) return '';
  return '<section class="card"><h3>Registros de exercícios substituídos</h3>' +
    session.archivedExercises.map(item => '<details><summary><strong>' + escape(item.name) +
    '</strong></summary><ul>' + item.results.map(set => '<li>Série ' + set.number +
    (set.done ? ' · concluída' : '') + (set.amount !== '' && set.amount != null ? ' · ' + escape(set.amount) + ' ' + escape(item.unit) : '') +
    (set.kg !== '' && set.kg != null ? ' · ' + escape(set.kg) + ' kg' : '') + '</li>').join('') +
    '</ul></details>').join('') + '</section>';
}

let openExercises = new Set([0]);

function exerciseEditor(id, item) {
  const title = item ? 'Substituir ' + item.name : 'Adicionar exercício';
  return '<form id="exercise-editor" class="card" data-workout="' + id + '"><h3>' + escape(title) + '</h3>' +
    '<label>Buscar no catálogo<input type="search" id="catalog-search" autocomplete="off" placeholder="Ex. puxada frontal"></label>' +
    '<label>Exercício do catálogo<select name="catalog" id="catalog-results">' + catalogOptions('') + '</select></label>' +
    '<label>Ou digite um exercício personalizado<input name="custom" maxlength="80"></label>' +
    '<div class="exercise-dosage"><label>Séries<input required type="number" min="1" max="12" name="sets" value="' + (item?.sets ?? 2) + '"></label>' +
    '<label>Repetições<input required maxlength="9" name="target" placeholder="Ex. 10–12" value="' +
    escape(item?.unit === 'reps' && /^[0-9– -]+$/.test(item.target) ? item.target : '10–12') + '"></label></div>' +
    '<div class="actions"><button class="primary" type="submit">Salvar exercício</button>' +
    button('Cancelar', 'cancel-exercise') + '</div></form>';
}
function catalogOptions(query, selected) {
  const matches = findExercises(query);
  return options([['', matches.length ? 'Selecione um exercício' : 'Nenhum exercício encontrado'],
    ...matches.map(name => [name, name])], selected);
}

function planScreen() {
  const prefs = preferences();
  return header('Plano de treino', 'ROTINA E PROGRESSÃO') +
    '<section class="card"><form id="settings"><label>Rotina<select name="mode">' + options([['five','Cinco dias'],['three','Três dias · corpo inteiro']], prefs.mode) + '</select></label>' +
    '<label>Fase<select name="phase">' + options(Object.entries(phases), prefs.phase) + '</select></label><button type="submit" class="primary">Salvar plano</button></form></section>' +
    '<p class="muted">Edite os exercícios por dia. Se o treino de hoje já foi iniciado, os registros feitos são preservados.</p>' +
    schedule().map(w => {
      const exercises = templateFor(w);
      return '<details class="card" data-plan-day="' + w.id + '"' + (planOpen === w.id ? ' open' : '') +
        '><summary><strong>' + escape(w.day + ' · ' + w.title) + '</strong></summary><form data-plan="' + w.id + '"><p>' + escape(w.warmup) + '</p>' +
        exercises.map((item,i) => '<div class="plan-row"><div><strong>' + escape(item.name) + '</strong>' +
          button('Substituir', 'replace-exercise', 'class="exercise-replace" data-value="' + w.id + '" data-exercise="' + escape(item.id) +
            '" aria-label="' + escape('Substituir ' + item.name) + '"') +
          '</div><label>Séries<input required type="number" min="1" max="12" name="s' + i + '" value="' + item.sets + '"></label><label>Meta (' + escape(item.unit) +
          ')<input required maxlength="30" name="t' + i + '" value="' + escape(item.target) + '"></label></div>').join('') +
        '<div class="actions"><button class="primary" type="submit">Salvar ajustes</button>' +
        button('Adicionar exercício', 'add-exercise', 'data-value="' + w.id + '"') +
        (read('plan',w.id)?.exercises ? button('Usar metas da fase','reset-plan','data-value="' + w.id + '"') : '') + '</div></form>' +
        (editor?.workout === w.id ? exerciseEditor(w.id, exercises.find(item => item.id === editor.replacement)) : '') + '</details>';
    }).join('');
}
function historyScreen() {
  const rows = [...data.values()].filter(row => row.kind === 'session').sort((a,b) => b.entry.localeCompare(a.entry));
  return header('Histórico', 'CONSISTÊNCIA') +
    '<section class="hero"><h2>' + rows.filter(row => row.payload.complete).length + ' treinos com presença</h2><p>' + rows.length + ' sessões registradas</p></section>' +
    (rows.length ? rows.map(row => button('<strong>' + escape(row.payload.title) + '</strong><small>' + escape(displayDate(row.entry)) + ' · ' + counts(row.payload).join('/') + ' séries' + (row.payload.complete ? ' · presença ✓' : '') + '</small>',
      'open-history', 'class="card history" data-value="' + escape(row.entry) + '"')).join('') : '<p class="muted">Seus treinos salvos aparecerão aqui.</p>');
}
function measureScreen() {
  const entries = [...data.values()].filter(r => r.kind === 'measure').sort((a,b) => b.entry.localeCompare(a.entry));
  return header('Medidas', 'ACOMPANHAMENTO') +
    '<section class="card"><form id="measure"><label>Data da medição<input name="date" type="date" required value="' + selectedDate + '"></label><div class="measure-grid">' +
    measures.map((m,i) => numberInput('m'+i,m,read('measure',selectedDate)?.values[i],500,'0.1')).join('') +
    '</div><button class="primary" type="submit">Salvar medidas</button></form></section>' +
    entries.map(r => '<details class="card"><summary><strong>' + escape(displayDate(r.entry)) + '</strong></summary><dl>' +
      measures.map((m,i) => r.payload.values[i] ? '<dt>' + escape(m) + '</dt><dd>' + escape(r.payload.values[i]) + '</dd>' : '').join('') + '</dl></details>').join('');
}
function render() {
  app.setAttribute('aria-busy','false');
  logout.hidden = !api.currentUser();
  if (api.configured && !api.currentUser()) {
    illustrations.clear();
    if (illustrationDialog.open) illustrationDialog.close();
    app.innerHTML = header('Entre no Projeto Fênix', 'SEU DIÁRIO DE TREINO') +
      '<form id="login" class="card"><label>E-mail<input name="email" type="email" autocomplete="username" required></label><label>Senha<input name="password" type="password" autocomplete="current-password" required></label><button type="submit" class="primary">Entrar</button></form>';
    return;
  }
  const content = { treino:workoutScreen, plano:planScreen, hist:historyScreen, medidas:measureScreen }[page]();
  app.innerHTML = (!api.configured ? '<p class="demo">Modo local · Os registros ficam neste navegador.</p>' : '') + content +
    '<nav aria-label="Navegação principal">' + labels.map(([key,label]) => button(label,'nav','data-value="' + key + '"' + (key === page ? ' aria-current="page"' : ''))).join('') + '</nav>';
  if (page === 'treino') void showThumbnails();
}
async function load() {
  const rows = api.configured ? (api.currentUser() ? await api.records() : []) : JSON.parse(localStorage.getItem('fenix-demo') || '[]');
  data = new Map(rows.map(row => [row.kind + '/' + row.entry, row]));
}
async function run(action, success) {
  if (busy) return;
  busy = true;
  app.inert = true;
  logout.disabled = true;
  status.textContent = 'Aguarde…';
  try {
    await action();
    render();
    status.textContent = success;
  } catch (error) {
    if (error.status === 409) {
      try {
        await load();
        editor = undefined;
        render();
        status.textContent = 'O registro mudou em outro acesso. Confira a versão atual e tente novamente.';
        return;
      } catch {}
    }
    if (api.configured && !api.currentUser()) render();
    status.textContent = error.status === 400 ? 'Confira os dados e tente novamente.' : 'A operação falhou. Confira sua conexão e tente novamente.';
  } finally { busy = false; app.inert = false; logout.disabled = false; }
}
function selectDate(value) {
  selectedDate = value; workoutId = undefined; openExercises = new Set([0]);
  render();
}
app.addEventListener('click', e => {
  const target = e.target.closest('[data-action]');
  if (!target || busy) return;
  const { action, value } = target.dataset;
  if (action === 'view-illustration') {
    e.preventDefault();
    openIllustration(target);
    return;
  }
  if (action === 'nav') {
    const navigate = () => { page = value; editor = undefined; window.scrollTo(0,0); };
    const form = value === 'plano' ? document.querySelector('#training') : null;
    if (form?.dataset.dirty) {
      const session = collectTraining(form);
      run(async () => {
        await saveCompared([{ kind: 'session', entry: selectedDate, payload: session }]);
        navigate();
      }, 'Registros do treino salvos.');
    } else {
      navigate();
      render();
    }
  }
  if (action === 'date') selectDate(value);
  if (action === 'open-history') { page = 'treino'; selectDate(value); window.scrollTo(0,0); }
  if (action === 'previous' || action === 'next') {
    const date = new Date(selectedDate + 'T12:00:00');
    date.setDate(date.getDate() + (action === 'next' ? 7 : -7));
    selectDate(dateKey(date));
  }
  if (action === 'add-exercise' || action === 'replace-exercise') {
    planOpen = value;
    editor = { workout: value, replacement: target.dataset.exercise };
    render();
    const search = document.querySelector('#catalog-search');
    search.scrollIntoView({ block: 'center' });
    search.focus({ preventScroll: true });
  }
  if (action === 'cancel-exercise') { editor = undefined; render(); }
  if (action === 'reset-plan') {
    const workout = schedule().find(w => w.id === value);
    const before = templateFor(workout);
    const defaults = new Map(identifyExercises(value, planFor(workout, preferences().phase)).map(item => [item.id,item]));
    planOpen = value;
    run(() => saveTemplate(value, before, before.map(item => defaults.get(item.id) ?? item)), 'Metas da fase restauradas.');
  }
});
app.addEventListener('input', e => {
  if (e.target.form?.id === 'training') e.target.form.dataset.dirty = 'true';
  if (e.target.id === 'catalog-search') {
    const select = document.querySelector('#catalog-results');
    select.innerHTML = catalogOptions(e.target.value, select.value);
  }
  if (e.target.name === 'custom' && e.target.form?.id === 'exercise-editor' && e.target.value.trim()) {
    e.target.form.elements.catalog.value = '';
  }
});
function collectTraining(form) {
  const fields = new FormData(form);
  const session = sessionFor(selectedDate, workoutId);
  for (const [i,exercise] of session.exercises.entries()) {
    for (const [j,set] of exercise.results.entries()) {
      set.done = fields.has('done-' + i + '-' + j);
      set.amount = fields.get('amount-' + i + '-' + j) || '';
      set.kg = fields.get('kg-' + i + '-' + j) || '';
    }
  }
  return session;
}
app.addEventListener('change', e => {
  if (e.target.id === 'catalog-results' && e.target.value) e.target.form.elements.custom.value = '';
  if (e.target.id === 'date' && e.target.value) selectDate(e.target.value);
  if (e.target.id === 'workout') { workoutId = e.target.value; openExercises = new Set([0]); render(); }
  if (e.target.name === 'date' && e.target.form?.id === 'measure' && e.target.value) selectDate(e.target.value);
});
app.addEventListener('submit', e => {
  e.preventDefault();
  const form = e.target;
  const fields = new FormData(form);
  if (form.id === 'login') run(async () => {
    await api.login(fields.get('email'), fields.get('password'));
    await load();
  }, 'Sessão iniciada.');
  if (form.id === 'settings') run(() => store('plan','settings',{ mode:fields.get('mode'), phase:Number(fields.get('phase')) }), 'Plano salvo.');
  if (form.dataset.plan) {
    const id = form.dataset.plan;
    const before = templateFor(schedule().find(w => w.id === id));
    const exercises = before.map((item,i) => ({ ...item, sets:Number(fields.get('s'+i)), target:fields.get('t'+i).trim() || item.target }));
    planOpen = id;
    run(() => saveTemplate(id, before, exercises), 'Exercícios atualizados.');
  }
  if (form.id === 'exercise-editor') {
    const id = form.dataset.workout;
    const name = fields.get('custom').trim() || fields.get('catalog');
    const exercise = newExercise(crypto.randomUUID(), name, Number(fields.get('sets')), fields.get('target'));
    if (!exercise) {
      status.textContent = 'Escolha ou digite um exercício e informe as repetições (ex. 10 ou 10–12).';
      return;
    }
    const before = templateFor(schedule().find(w => w.id === id));
    const replacement = editor.replacement;
    const after = editExercises(before, replacement, exercise);
    run(async () => {
      await saveTemplate(id, before, after);
      editor = undefined;
    }, replacement ? 'Exercício substituído.' : 'Exercício adicionado.');
  }
  if (form.id === 'training') {
    openExercises = new Set([...form.querySelectorAll('details[open]')].map(el => Number(el.dataset.exercise)));
    const session = collectTraining(form);
    if (e.submitter?.value === 'attendance') session.complete = !session.complete;
    run(() => saveCompared([{ kind: 'session', entry: selectedDate, payload: session }]), 'Treino salvo.');
  }
  if (form.id === 'measure') {
    const values = measures.map((_,i) => fields.get('m'+i));
    if (!values.some(Boolean)) { status.textContent = 'Preencha pelo menos uma medida.'; return; }
    run(() => store('measure',selectedDate,{ values }), 'Medidas salvas.');
  }
});
logout.addEventListener('click', () => run(async () => {
  try { await api.logout(); } finally { data.clear(); page = 'treino'; }
}, 'Sessão encerrada.'));
load().then(render).catch(() => {
  if (!api.currentUser()) { render(); return; }
  app.setAttribute('aria-busy','false');
  logout.hidden = false;
  app.textContent = 'Não foi possível carregar o histórico. Atualize a página para tentar novamente.';
});
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
