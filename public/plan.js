function exercise(name, sets, target, rest = '', unit = 'reps', optional = false) {
  return { name, sets, target, rest, unit, optional };
}

export const workouts = [
  { id: 'peito', day: 'Seg', title: 'Peito, ombros e tríceps', warmup: '5 min de esteira ou bicicleta e uma série leve dos dois primeiros exercícios.', exercises: [
    exercise('Supino máquina ou halteres', 3, '8–12', '75–90 s'),
    exercise('Supino inclinado máquina ou halteres', 3, '10–12', '75 s'),
    exercise('Desenvolvimento sentado na máquina', 3, '10–12', '75 s'),
    exercise('Elevação lateral', 3, '12–15', '45–60 s'),
    exercise('Tríceps corda na polia', 3, '10–15', '60 s'),
    exercise('Prancha', 3, '30–45', '45 s', 's')
  ] },
  { id: 'pernas-a', day: 'Ter', title: 'Pernas A e core', warmup: '5 min de bicicleta e mobilidade leve de quadril e tornozelos.', exercises: [
    exercise('Leg press 45°', 4, '10–12', '90 s'),
    exercise('Cadeira extensora', 3, '12–15', '60 s'),
    exercise('Mesa flexora', 3, '12–15', '60 s'),
    exercise('Afundo guiado ou passada curta', 2, '10 por perna', '60 s'),
    exercise('Panturrilha no leg press', 4, '12–15', '45 s'),
    exercise('Crunch na polia ou abdominal máquina', 3, '12–15', '45 s')
  ] },
  { id: 'costas', day: 'Qua', title: 'Costas e bíceps', warmup: '5 min de elíptico e uma série leve dos dois primeiros exercícios.', exercises: [
    exercise('Puxada frontal', 3, '8–12', '75 s'),
    exercise('Remada baixa', 3, '10–12', '75 s'),
    exercise('Remada apoiada', 3, '10–12', '75 s'),
    exercise('Face pull', 3, '12–15', '60 s'),
    exercise('Rosca direta', 3, '10–12', '60 s'),
    exercise('Rosca martelo', 2, '10–12', '60 s')
  ] },
  { id: 'pernas-b', day: 'Qui', title: 'Pernas B, posterior e glúteos', warmup: '5 min de esteira e mobilidade de quadril.', exercises: [
    exercise('Agachamento no Smith para caixa', 3, '8–10', '75–90 s'),
    exercise('Stiff com halteres', 3, '10–12', '75 s'),
    exercise('Cadeira flexora', 3, '12–15', '60 s'),
    exercise('Hip thrust na máquina ou banco', 3, '10–12', '75 s'),
    exercise('Cadeira abdutora', 3, '12–15', '45–60 s'),
    exercise('Panturrilha em pé', 4, '12–15', '45 s'),
    exercise('Prancha lateral', 2, '30 por lado', '45 s', 's', true)
  ] },
  { id: 'cardio', day: 'Sex', title: 'Cardio, core e mobilidade', warmup: '5 min leves. Cardio em ritmo que permita conversar. Termine com 3 min leves.', exercises: [
    exercise('Cardio contínuo ou combinado', 1, '25 (ou 10 + 10 + 5)', '', 'min'),
    exercise('Abdominal na máquina', 2, '12', '45–60 s'),
    exercise('Pallof press', 2, '10 por lado', '30–45 s'),
    exercise('Mobilidade de ombros', 2, '10'),
    exercise('Mobilidade de tornozelos', 2, '8 por lado')
  ] },
  { id: 'caminhada', day: 'Sáb', title: 'Caminhada opcional', warmup: 'Caminhada leve.', exercises: [
    exercise('Caminhada', 1, 'Livre', '', 'min')
  ] }
];

const alternative = [
  ['Leg press', 'Supino máquina', 'Puxada frontal', 'Mesa flexora', 'Elevação lateral'],
  ['Cadeira extensora', 'Supino inclinado', 'Remada baixa', 'Cadeira flexora', 'Rosca direta'],
  ['Leg press', 'Puxada frontal', 'Supino inclinado', 'Elevação pélvica', 'Panturrilha']
];
export const fullBody = alternative.map((items, i) => ({
  id: 'integral-' + i, day: ['Seg','Qua','Sex'][i], title: 'Corpo inteiro ' + 'ABC'[i],
  warmup: 'Use três dias não consecutivos. Faça o aquecimento antes de começar.',
  exercises: items.map(name => exercise(name, 2, '10–12'))
}));
export const phases = {
  1: 'Semanas 1–2 · Readaptação',
  2: 'Semanas 3–4 · Aumento de volume',
  3: 'Semanas 5–8 · Progressão dupla'
};
export function planFor(workout, phase) {
  return workout.exercises.map((e, i) => ({ ...e, sets: phase === 1 ? Math.min(2, e.sets) : phase === 2 ? Math.min(i < 2 ? 3 : 2, e.sets) : e.sets }));
}
export function dateKey(date = new Date()) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}
export function week(date) {
  const monday = new Date(date + 'T12:00:00');
  monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7);
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday);
    day.setDate(day.getDate() + i);
    return dateKey(day);
  });
}
export function counts(session) {
  const sets = [...session.exercises, ...(session.archivedExercises ?? [])].flatMap(e => e.results);
  return [sets.filter(set => set.done).length, sets.length];
}

export const catalog = [
  'Abdominal na máquina', 'Abdominal infra', 'Agachamento frontal', 'Agachamento goblet',
  'Agachamento livre', 'Agachamento no Smith', 'Afundo com halteres', 'Barra fixa',
  'Cadeira abdutora', 'Cadeira adutora', 'Cadeira extensora', 'Cadeira flexora',
  'Crucifixo com halteres', 'Crucifixo inverso', 'Desenvolvimento com halteres',
  'Desenvolvimento na máquina', 'Elevação frontal', 'Elevação lateral', 'Elevação pélvica',
  'Encolhimento com halteres', 'Face pull', 'Hack squat', 'Leg press 45°',
  'Leg press horizontal', 'Levantamento terra', 'Levantamento terra romeno', 'Mesa flexora',
  'Panturrilha em pé', 'Panturrilha sentada', 'Peck deck', 'Pulldown com corda',
  'Puxada frontal', 'Puxada neutra', 'Remada baixa', 'Remada cavalinho', 'Remada curvada',
  'Remada unilateral', 'Rosca direta', 'Rosca martelo', 'Rosca Scott', 'Stiff com halteres',
  'Supino inclinado', 'Supino máquina', 'Supino reto com barra', 'Supino reto com halteres',
  'Tríceps corda na polia', 'Tríceps francês', 'Tríceps testa'
];

const searchText = value => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
export function findExercises(query) {
  const words = searchText(query).split(/\s+/);
  return catalog.filter(name => words.every(word => searchText(name).includes(word)));
}

export function identifyExercises(workout, exercises) {
  return exercises.map((exercise, index) => ({
    ...exercise, id: exercise.id ?? workout + ':' + index
  }));
}

export function newExercise(id, name, sets, target) {
  const cleanName = name.trim();
  const repetitions = target.trim().match(/^([1-9]\d{0,2})(?:\s*[-–]\s*([1-9]\d{0,2}))?$/);
  if (!cleanName || cleanName.length > 80 || !Number.isInteger(sets) ||
      sets < 1 || sets > 12 || !repetitions ||
      (repetitions[2] && Number(repetitions[2]) < Number(repetitions[1]))) return null;
  return {
    id, name: cleanName, sets, target: repetitions.slice(1).filter(Boolean).join('–'),
    unit: 'reps', rest: '', optional: false
  };
}

export function editExercises(exercises, replacementId, exercise) {
  return replacementId
    ? exercises.map(item => item.id === replacementId ? exercise : item)
    : [...exercises, exercise];
}

const blankSet = () => ({ done: false, amount: '', kg: '' });
const hasResult = set => set.done || (set.amount !== '' && set.amount != null) ||
  (set.kg !== '' && set.kg != null) ||
  Object.keys(set).some(key => !['done','amount','kg'].includes(key));

export function startExercise(exercise) {
  return { ...exercise, results: Array.from({ length: exercise.sets }, blankSet) };
}

export function updateTodaySession(session, workout, before, after) {
  if (session?.workout !== workout) return session;
  const previous = new Map(before.map(item => [item.id, item]));
  const nextIds = new Set(after.map(item => item.id));
  const active = identifyExercises(workout, session.exercises);
  const recorded = new Map(active.map(item => [item.id, item]));
  const archived = [...(session.archivedExercises ?? [])];

  for (const item of active) {
    if (nextIds.has(item.id)) continue;
    const results = item.results.flatMap((set, index) => hasResult(set) ? [{ ...set, number: index + 1 }] : []);
    if (results.length) archived.push({ ...item, results, sets: results.length });
  }

  const exercises = after.map(item => {
    const saved = recorded.get(item.id);
    if (!saved) return startExercise(item);
    const old = previous.get(item.id);
    if (old?.sets === item.sets && old?.target === item.target) return saved;
    const lastRecorded = saved.results.findLastIndex(hasResult) + 1;
    const length = Math.max(item.sets, lastRecorded);
    return {
      ...saved, ...item, sets: length,
      results: Array.from({ length }, (_, index) => saved.results[index] ?? blankSet())
    };
  });
  return { ...session, exercises, archivedExercises: archived };
}
