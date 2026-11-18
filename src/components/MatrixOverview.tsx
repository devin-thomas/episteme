import type { ApiDefinition, PhaseId } from '../types/api';
import { PHASES } from '../data/phases';
import { ArrowRight } from 'lucide-react';

interface MatrixOverviewProps {
  apis: ApiDefinition[];
  activeApiId: string;
  onSelectApi: (apiId: string) => void;
  onClose: () => void;
}

export function MatrixOverview({
  apis,
  activeApiId,
  onSelectApi,
  onClose,
}: MatrixOverviewProps) {
  const getPhaseApis = (phaseId: PhaseId) => apis.filter((a) => a.phase === phaseId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="text-xs font-medium text-blue-600 dark:text-blue-400">
            Epistemic Architecture · 20 Keyless APIs
          </div>
          <h2 className="text-2xl font-display font-bold mt-1 text-slate-900 dark:text-slate-100">
            The Four Quadrants of Open Information
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
            Every integration runs live with zero API keys and zero signup, progressing from familiar daily lookups to frontier capabilities.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-xs font-medium bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-md hover:opacity-90 transition-opacity whitespace-nowrap shrink-0 cursor-pointer"
        >
          Back to Workbench
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {PHASES.map((phase) => {
          const items = getPhaseApis(phase.id);
          return (
            <section
              key={phase.id}
              className="bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 rounded-lg p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-baseline justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800/80">
                  <h3 className="text-lg font-display font-bold text-slate-900 dark:text-slate-100">
                    {phase.code}. {phase.title}
                  </h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {phase.epistemicLabel}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-2.5 mb-4 leading-relaxed">
                  {phase.summary}
                </p>

                <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
                  {items.map((api) => {
                    const isSelected = api.id === activeApiId;
                    return (
                      <button
                        key={api.id}
                        type="button"
                        onClick={() => {
                          onSelectApi(api.id);
                          onClose();
                        }}
                        className={`w-full py-2.5 px-2 -mx-2 rounded flex items-center justify-between gap-3 text-left transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50/70 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-900/50 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-semibold truncate">
                            <span className="font-mono text-xs text-slate-400 mr-2 tabular-nums">
                              {api.index}
                            </span>
                            {api.name}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 pl-6">
                            {api.domain} · {api.sdkBadge}
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
