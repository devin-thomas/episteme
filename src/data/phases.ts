import type { PhaseMeta } from '../types/api';

export const PHASES: PhaseMeta[] = [
  {
    id: 1,
    code: '01',
    title: 'Known Knowns',
    epistemicLabel: 'Everyday Signals & Immediate Facts',
    summary:
      'Direct lookups for weather, markets, sports, news, exchange rates, television, holidays, postal codes, words, and music.',
    questionPrompt: 'Things we know we know — direct lookups with predictable schemas.',
  },
  {
    id: 2,
    code: '02',
    title: 'Known Unknowns',
    epistemicLabel: 'Deep Domain Exploration',
    summary:
      'Search specialized catalogs of games, research, satellite scenes, books, artists, museum collections, space imagery, and anime.',
    questionPrompt: 'Things we know we do not know — structured discovery across specialized archives.',
  },
  {
    id: 3,
    code: '03',
    title: 'Unknown Knowns',
    epistemicLabel: 'Latent Infrastructure & Hidden Telemetry',
    summary:
      'Inspect recorded earthquakes, web history, internet routing, biodiversity, electricity, economic indicators, weather alerts, food labels, software usage, and public debt.',
    questionPrompt: 'Things already recorded in plain sight — uncovering latent planetary and digital telemetry.',
  },
  {
    id: 4,
    code: '04',
    title: 'Unknown Unknowns',
    epistemicLabel: 'Frontier Capabilities & Surprise Access',
    summary:
      'Try remote compilation, protein structures, graph queries, space weather, model catalogs, vulnerability lookup, chemistry, astronomical SQL, map queries, and public randomness.',
    questionPrompt: 'Capabilities you did not realize were a single keyless HTTP call away.',
  },
];
