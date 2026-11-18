import type { PhaseMeta } from '../types/api';

export const PHASES: PhaseMeta[] = [
  {
    id: 1,
    code: '01',
    title: 'Known Knowns',
    epistemicLabel: 'Everyday Signals & Immediate Facts',
    summary:
      'Questions you consciously know how to ask against familiar, real-time feeds—weather, markets, live scores, tech headlines, and reference FX rates.',
    questionPrompt: 'Things we know we know — direct lookups with predictable schemas.',
  },
  {
    id: 2,
    code: '02',
    title: 'Known Unknowns',
    epistemicLabel: 'Deep Domain Exploration',
    summary:
      'Specialized catalogs where you know the domain exists and use structured queries—game mechanics, scholarly preprints, and Sentinel-2 satellite passes—to uncover specifics.',
    questionPrompt: 'Things we know we do not know — structured discovery across specialized archives.',
  },
  {
    id: 3,
    code: '03',
    title: 'Unknown Knowns',
    epistemicLabel: 'Latent Infrastructure & Hidden Telemetry',
    summary:
      'Systems, historical snapshots, and physical flows already recorded in the world around us that most engineers never realize can be queried openly without credentials.',
    questionPrompt: 'Things already recorded in plain sight — uncovering latent planetary and digital telemetry.',
  },
  {
    id: 4,
    code: '04',
    title: 'Unknown Unknowns',
    epistemicLabel: 'Frontier Capabilities & Surprise Access',
    summary:
      'Remote x86-64 compilation, atomic 3D protein structures, semantic graph reasoning, L1 Lagrange space weather, and open-weight AI registries—all live with zero keys.',
    questionPrompt: 'Capabilities you did not realize were a single keyless HTTP call away.',
  },
];
