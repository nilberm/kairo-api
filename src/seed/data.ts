export const SEED_VISION_GOALS = [
  { id: 'v1', title: 'Patrimônio', subtitle: 'US$ 200k investidos (Liberdade Financeira)', currentValue: 0, targetValue: 200000, unit: 'US$', deadline: '2036-12-31', status: 'in_progress' },
  { id: 'v2', title: 'Carreira', subtitle: 'Dev Staff/Principal Internacional (US$ 10k/mês)', currentValue: 0, targetValue: 10000, unit: 'US$/mês', deadline: '2036-12-31', status: 'in_progress' },
  { id: 'v3', title: 'Localização', subtitle: 'Morando no Canadá (PR) ou Europa', currentValue: 0, targetValue: 1, unit: '', deadline: '2036-12-31', status: 'in_progress' },
  { id: 'v4', title: 'Imóvel', subtitle: 'Liquidez equivalente a Casa Própria (~R$ 300k+)', currentValue: 0, targetValue: 300000, unit: 'R$', deadline: '2036-12-31', status: 'in_progress' },
  { id: 'v5', title: 'Família', subtitle: 'Casado e com 1º filho', currentValue: 0, targetValue: 100, unit: '%', deadline: '2036-12-31', status: 'in_progress' },
  { id: 'v6', title: 'Renda Extra', subtitle: 'R$ 5k+/mês recorrente (YouTube/3D)', currentValue: 0, targetValue: 5000, unit: 'R$/mês', deadline: '2036-12-31', status: 'in_progress' },
];

export const SEED_MEDIUM_GOALS = [
  { id: 'm1', title: 'Imigração', costOrValue: 0, deadline: '2030-04-30', isCompleted: false, subtitle: 'Express Entry — mudar antes dos 30 (Abril/2030)' },
  { id: 'm2', title: 'Emprego Remoto Internacional', costOrValue: 0, deadline: '2028-12-31', isCompleted: false, subtitle: '1ª vaga remota internacional (máx. 2 anos)' },
  { id: 'm3', title: 'Casamento', costOrValue: 0, deadline: '2030-12-31', isCompleted: false, subtitle: 'Cerimônia e união' },
  { id: 'm4', title: 'Viagem República Tcheca', costOrValue: 12000, currency: 'R$', deadline: '2030-12-31', isCompleted: false, subtitle: 'Curso na República Tcheca (R$ 12k + custos)' },
];

export const SEED_SHORT_GOALS = [
  { id: 'f1', title: 'Físico', subtitle: 'Perder 10kg (meta: 6 meses)', targetMonths: 6, isCompleted: false },
  { id: 'f2', title: 'Projeto', subtitle: 'Finalizar MVP do Jogo (meta: 3 meses)', targetMonths: 3, isCompleted: false },
  { id: 'f3', title: 'Carreira Atual', subtitle: 'Ser promovido (aumentar senioridade/salário)', isCompleted: false },
];

export const SEED_DAILY_HABITS = [
  { id: 'd1', name: 'Escrituras', frequency: 'daily', type: 'boolean', target: 1, unit: null },
  { id: 'd2', name: 'Água', frequency: 'daily', type: 'counter', target: 3, unit: 'L' },
  { id: 'd3', name: 'Dieta', frequency: 'daily', type: 'counter', target: 5, unit: 'refeições' },
  { id: 'd4', name: 'Pomodoro', frequency: 'daily', type: 'counter', target: 2, unit: 'sessões (Inglês/Code)' },
  { id: 'd5', name: 'Dev Jogo', frequency: 'daily', type: 'boolean', target: 1, unit: null },
];

export const SEED_WEEKLY_HABITS = [
  { id: 'w1', name: 'Academia', frequency: 'weekly', type: 'counter', target: 3, unit: null },
  { id: 'w2', name: 'YouTube', frequency: 'weekly', type: 'counter', target: 1, unit: 'vídeo' },
  { id: 'w3', name: 'Estudo Aprofundado', frequency: 'weekly', type: 'counter', target: 2, unit: 'x (Discursos/Escrituras)' },
];

export const SEED_MONTHLY_HABITS = [
  { id: 'mo1', name: 'Pintura 3D', frequency: 'monthly', type: 'counter', target: 1, unit: null },
  { id: 'mo2', name: 'Jejum', frequency: 'monthly', type: 'counter', target: 1, unit: null },
  { id: 'mo3', name: 'Templo', frequency: 'monthly', type: 'counter', target: 1, unit: null },
  { id: 'mo4', name: 'Ler 1 Livro', frequency: 'monthly', type: 'counter', target: 1, unit: null },
  { id: 'mo5', name: 'Aporte mensal', frequency: 'monthly', type: 'counter', target: 1, unit: '(Casamento/Viagem)' },
];
