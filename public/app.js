import { workouts, fullBody, phases, planFor, dateKey, week, counts } from './plan.js';
import * as api from './api.js';

const app = document.querySelector('#app');
const status = document.querySelector('#status');
const logout = document.querySelector('#logout');
let data = new Map();
let page = 'treino';
let selectedDate = dateKey();
let workoutId;
let busy = false;
const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const labels = [['treino','Treino'], ['plano','Plano'], ['hist','Histórico'], ['medidas','Medidas']];
const measures = ['Peso (kg)', 'Cintura (cm)', 'Abdômen (cm)', 'Peitoral (cm)', 'Pelve alta (cm)', 'Quadril (cm)', 'Braço D (cm)', 'Braço E (cm)', 'Coxa D (cm)', 'Coxa E (cm)', 'Panturrilha D (cm)', 'Panturrilha E (cm)'];
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const read = (kind, entry) => data.get(kind + '/' + entry)?.payload;
const preferences = () => read('plan', 'settings') || { phase: 1, mode: 'five' };
const schedule = () => preferences().mode === 'three' ? [...fullBody, workouts[5]] : workouts;
const displayDate = value => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(value + 'T12:00:00'));

function sessionFor(date, id) {
  const stored = read('session', date);
  if (stored) return structuredClone(stored);
  const list = schedule();
  const day = days[(new Date(date + 'T12:00:00').getDay() + 6) % 7];
  const workout = list.find(w => w.id === id) || list.find(w => w.day === day);
  if (!workout) return null;
  const template = read('plan', workout.id)?.exercises || planFor(workout, preferences().phase);
  return {
    workout: workout.id, title: workout.title, warmup: workout.warmup, complete: false,
    exercises: template.map(e => ({ ...e, results: Array.from({length:e.sets}, () => ({ done:false, amount:'', kg:'' })) }))
  };
}

async function store(kind, entry, payload) {
  const record = { kind, entry, payload };
  if (api.configured) await api.save(record);
  data.set(kind + '/' + entry, record);
  if (!api.configured) localStorage.setItem('fenix-demo', JSON.stringify([...data.values()]));
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
      return '<details class="card exercise" ' + (openExercises.has(i) ? 'open' : '') + ' data-exercise="' + i + '"><summary><div><strong>' + escape(e.name) + '</strong><small>' + escape(e.sets + ' × ' + e.target + ' ' + e.unit + (e.rest ? ' · ' + e.rest + ' descanso' : '') + (e.optional ? ' · opcional' : '')) + '</small></div><span class="score">' + finished + '/' + e.sets + '</span></summary>' +
        e.results.map((set,j) => '<div class="set"><label class="check"><input type="checkbox" name="done-' + i + '-' + j + '"' + (set.done ? ' checked' : '') + '> Série ' + (j+1) + '</label>' +
          numberInput('amount-' + i + '-' + j, e.unit, set.amount, 1000) +
          (e.unit === 'reps' ? numberInput('kg-' + i + '-' + j, 'kg', set.kg, 1000, '0.01') : '') + '</div>').join('') + '</details>';
    }).join('') +
    '<div class="actions"><button type="submit" class="primary" value="save">Salvar séries</button><button type="submit" value="attendance">' + (session.complete ? 'Desmarcar presença' : 'Registrar presença') + '</button></div></form>');
}
let openExercises = new Set([0]);

function planScreen() {
  const prefs = preferences();
  return header('Plano de treino', 'ROTINA E PROGRESSÃO') +
    '<section class="card"><form id="settings"><label>Rotina<select name="mode">' + options([['five','Cinco dias'],['three','Três dias · corpo inteiro']], prefs.mode) + '</select></label>' +
    '<label>Fase<select name="phase">' + options(Object.entries(phases), prefs.phase) + '</select></label><button type="submit" class="primary">Salvar plano</button></form></section>' +
    '<p class="muted">As alterações valem para novos registros. Os treinos salvos preservam a ficha original.</p>' +
    schedule().map(w => {
      const e = read('plan', w.id)?.exercises || planFor(w, prefs.phase);
      return '<details class="card"><summary><strong>' + escape(w.day + ' · ' + w.title) + '</strong></summary><form data-plan="' + w.id + '"><p>' + escape(w.warmup) + '</p>' +
        e.map((item,i) => '<div class="plan-row"><strong>' + escape(item.name) + '</strong><label>Séries<input required type="number" min="1" max="12" name="s' + i + '" value="' + item.sets + '"></label><label>Meta (' + item.unit + ')<input required maxlength="30" name="t' + i + '" value="' + escape(item.target) + '"></label></div>').join('') +
        '<button class="primary" type="submit">Salvar ajustes</button>' + (read('plan',w.id)?.exercises ? ' ' + button('Usar metas da fase','reset-plan','data-value="' + w.id + '"') : '') + '</form></details>';
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
    app.innerHTML = header('Entre no Projeto Fênix', 'SEU DIÁRIO DE TREINO') +
      '<form id="login" class="card"><label>E-mail<input name="email" type="email" autocomplete="username" required></label><label>Senha<input name="password" type="password" autocomplete="current-password" required></label><button type="submit" class="primary">Entrar</button></form>';
    return;
  }
  const content = { treino:workoutScreen, plano:planScreen, hist:historyScreen, medidas:measureScreen }[page]();
  app.innerHTML = (!api.configured ? '<p class="demo">Modo local · Os registros ficam neste navegador.</p>' : '') + content +
    '<nav aria-label="Navegação principal">' + labels.map(([key,label]) => button(label,'nav','data-value="' + key + '"' + (key === page ? ' aria-current="page"' : ''))).join('') + '</nav>';
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
  if (action === 'nav') { page = value; render(); window.scrollTo(0,0); }
  if (action === 'date') selectDate(value);
  if (action === 'open-history') { page = 'treino'; selectDate(value); window.scrollTo(0,0); }
  if (action === 'previous' || action === 'next') {
    const date = new Date(selectedDate + 'T12:00:00');
    date.setDate(date.getDate() + (action === 'next' ? 7 : -7));
    selectDate(dateKey(date));
  }
  if (action === 'reset-plan') run(() => store('plan', value, {}), 'Metas da fase restauradas.');
});
app.addEventListener('change', e => {
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
    const workout = schedule().find(w => w.id === id);
    const template = read('plan',id)?.exercises || planFor(workout,preferences().phase);
    const exercises = template.map((item,i) => ({ ...item, sets:Number(fields.get('s'+i)), target:fields.get('t'+i).trim() || item.target }));
    run(() => store('plan',id,{ exercises }), 'Exercícios atualizados.');
  }
  if (form.id === 'training') {
    openExercises = new Set([...form.querySelectorAll('details[open]')].map(el => Number(el.dataset.exercise)));
    const session = sessionFor(selectedDate, workoutId);
    for (const [i,exercise] of session.exercises.entries()) {
      for (const [j,set] of exercise.results.entries()) {
        set.done = fields.has('done-' + i + '-' + j);
        set.amount = fields.get('amount-' + i + '-' + j) || '';
        set.kg = fields.get('kg-' + i + '-' + j) || '';
      }
    }
    if (e.submitter?.value === 'attendance') session.complete = !session.complete;
    run(() => store('session',selectedDate,session), 'Treino salvo.');
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
