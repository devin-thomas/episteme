import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Menu,
  Moon,
  Play,
  RotateCw,
  Search,
  Sun,
  X,
} from 'lucide-react';
import { APIS, GODBOLT_PRESETS, SPARQL_PRESETS } from './data/apis';
import { PHASES } from './data/phases';
import type { ApiDefinition, ExecutionResult, ParamValues, PhaseId } from './types/api';
import { CodePane } from './components/CodePane';
import { ResponseVisuals } from './components/ResponseVisuals';
import { RawResponsePane } from './components/RawResponsePane';
import { MatrixOverview } from './components/MatrixOverview';

function getDefaultValues(api: ApiDefinition): ParamValues {
  const vals: ParamValues = {};
  for (const p of api.params) {
    vals[p.key] = p.defaultValue;
  }
  return vals;
}

export default function App() {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  const [activeApiId, setActiveApiId] = useState<string>(() => {
    const requested = typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('api');
    return APIS.find((api) => api.id === requested)?.id ?? APIS[0].id;
  });

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('api', activeApiId);
    window.history.replaceState(null, '', url);
  }, [activeApiId]);
  const [viewMode, setViewMode] = useState<'workbench' | 'matrix'>('workbench');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [paramMap, setParamMap] = useState<Record<string, ParamValues>>(() => {
    const initial: Record<string, ParamValues> = {};
    for (const api of APIS) {
      initial[api.id] = getDefaultValues(api);
    }
    return initial;
  });

  const [responseTab, setResponseTab] = useState<'preview' | 'raw'>('preview');
  const [loading, setLoading] = useState<boolean>(false);
  const [resultsByApi, setResultsByApi] = useState<Record<string, ExecutionResult>>({});

  const abortRef = useRef<AbortController | null>(null);

  const activeApi = useMemo(
    () => APIS.find((a) => a.id === activeApiId) ?? APIS[0],
    [activeApiId]
  );

  const activePhase = useMemo(
    () => PHASES.find((p) => p.id === activeApi.phase) ?? PHASES[0],
    [activeApi.phase]
  );

  const activeValues = paramMap[activeApi.id] ?? getDefaultValues(activeApi);

  const builtRequest = useMemo(
    () => activeApi.buildRequest(activeValues),
    [activeApi, activeValues]
  );

  const sdkCode = useMemo(
    () => activeApi.buildSdkCode(activeValues),
    [activeApi, activeValues]
  );

  const curlCode = useMemo(
    () => activeApi.buildCurlCode(activeValues),
    [activeApi, activeValues]
  );

  const executeApi = useCallback(
    async (apiToRun: ApiDefinition, valuesToUse: ParamValues) => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      const req = apiToRun.buildRequest(valuesToUse);

      try {
        let resp: Response;
        if (req.localEndpoint) {
          resp = await fetch(req.localEndpoint, { signal: controller.signal });
        } else {
          resp = await fetch('/api/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              url: req.url,
              method: req.method,
              headers: req.headers,
              body: req.body,
            }),
          });
        }

        const json = (await resp.json()) as ExecutionResult & { error?: string };
        if (controller.signal.aborted) return;

        if (!resp.ok || json.error || json.status >= 400) {
          setResultsByApi((prev) => ({
            ...prev,
            [apiToRun.id]: {
              status: json.status || resp.status,
              statusText: json.statusText || 'Request Error',
              latencyMs: json.latencyMs ?? 0,
              sizeBytes: json.sizeBytes ?? 0,
              contentType: json.contentType ?? 'text/plain',
              data: json.data ?? null,
              error: json.error || `Upstream returned HTTP ${json.status || resp.status} ${json.statusText || ''}`.trim(),
            },
          }));
        } else {
          setResultsByApi((prev) => ({
            ...prev,
            [apiToRun.id]: json,
          }));
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        const message = err instanceof Error ? err.message : 'Network error';
        setResultsByApi((prev) => ({
          ...prev,
          [apiToRun.id]: {
            status: 0,
            statusText: 'Network Error',
            latencyMs: 0,
            sizeBytes: 0,
            contentType: 'text/plain',
            data: null,
            error: message,
          },
        }));
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    },
    []
  );

  // Auto-run when switching APIs if we don't have a cached response yet
  useEffect(() => {
    if (!resultsByApi[activeApi.id]) {
      executeApi(activeApi, activeValues);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeApi.id]);

  const handleSelectApi = (id: string) => {
    setActiveApiId(id);
    setViewMode('workbench');
    setMobileMenuOpen(false);
  };

  const handleSelectPhase = (phaseId: PhaseId) => {
    const firstInPhase = APIS.find((a) => a.phase === phaseId);
    if (firstInPhase) {
      setActiveApiId(firstInPhase.id);
      setViewMode('workbench');
    }
  };

  const updateParam = (key: string, value: string) => {
    setParamMap((prev) => {
      const current = prev[activeApi.id] ?? getDefaultValues(activeApi);
      const nextValues = { ...current, [key]: value };

      // Sync preset code bodies for Godbolt and Wikidata when preset dropdown changes
      if (activeApi.id === 'godbolt-compiler' && key === 'preset' && GODBOLT_PRESETS[value]) {
        nextValues.source = GODBOLT_PRESETS[value].source;
      }
      if (activeApi.id === 'wikidata-sparql' && key === 'preset' && SPARQL_PRESETS[value]) {
        nextValues.sparql = SPARQL_PRESETS[value];
      }

      return {
        ...prev,
        [activeApi.id]: nextValues,
      };
    });
  };

  const applyPreset = (presetValues: Record<string, string>) => {
    const updated = { ...activeValues, ...presetValues };
    setParamMap((prev) => ({
      ...prev,
      [activeApi.id]: updated,
    }));
    executeApi(activeApi, updated);
  };

  const filteredApisByPhase = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return PHASES.map((phase) => ({
      phase,
      items: APIS.filter(
        (a) =>
          a.phase === phase.id &&
          (!q ||
            a.name.toLowerCase().includes(q) ||
            a.domain.toLowerCase().includes(q) ||
            a.sdkBadge.toLowerCase().includes(q) ||
            a.shortPitch.toLowerCase().includes(q))
      ),
    }));
  }, [searchQuery]);

  const activeResult = resultsByApi[activeApi.id];

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Filter ${APIS.length} APIs...`}
            aria-label={`Filter ${APIS.length} APIs`}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-100/80 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600"
          />
        </div>
        <button
          type="button"
          onClick={() => setDarkMode((d) => !d)}
          aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          className="p-2 rounded-md border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
        >
          {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-5" aria-label="API Phases">
        {filteredApisByPhase.map(({ phase, items }) => {
          if (items.length === 0) return null;
          return (
            <div key={phase.id}>
              <div className="px-2 pb-1.5 flex items-baseline justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                <span>
                  {phase.code}. {phase.title}
                </span>
                <span className="tabular-nums font-mono text-[10px] text-slate-400">
                  {items.length}
                </span>
              </div>
              <div className="space-y-0.5">
                {items.map((api) => {
                  const isActive = viewMode === 'workbench' && api.id === activeApi.id;
                  return (
                    <button
                      key={api.id}
                      type="button"
                      onClick={() => handleSelectApi(api.id)}
                      className={`w-full px-2.5 py-2 rounded-md text-left transition-colors flex items-start gap-2.5 cursor-pointer ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                      }`}
                    >
                      <span
                        className={`font-mono text-[11px] tabular-nums pt-0.5 shrink-0 ${
                          isActive ? 'text-blue-100' : 'text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        {api.index}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold truncate">{api.name}</div>
                        <div
                          className={`text-[11px] truncate mt-0.5 ${
                            isActive ? 'text-blue-100/90' : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {api.domain}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f9fb] dark:bg-[#0b0e14] text-slate-900 dark:text-slate-100">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 h-14 bg-white/95 dark:bg-[#0f131c]/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 px-4 lg:px-6 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((o) => !o)}
            aria-label="Toggle API directory"
            className="lg:hidden p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setViewMode('workbench');
            }}
            className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0"
          >
            Episteme
          </a>
        </div>

        {/* Zone 2: Concise Single-Line Phase Nav Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-600 dark:text-slate-400">
          {PHASES.map((p) => {
            const isActive = viewMode === 'workbench' && activeApi.phase === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelectPhase(p.id)}
                className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'border-blue-600 text-slate-900 dark:text-white font-semibold'
                    : 'border-transparent hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {p.title}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setViewMode((m) => (m === 'matrix' ? 'workbench' : 'matrix'))}
            className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              viewMode === 'matrix'
                ? 'border-blue-600 text-slate-900 dark:text-white font-semibold'
                : 'border-transparent hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Quadrant Map
          </button>
        </nav>

        {/* Zone 3: Single Primary Action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => {
              if (viewMode === 'matrix') {
                setViewMode('workbench');
              }
              executeApi(activeApi, activeValues);
            }}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {loading ? (
              <RotateCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span>{loading ? 'Running...' : 'Send Request'}</span>
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 top-14 z-20 bg-white dark:bg-[#0f131c] border-t border-slate-200 dark:border-slate-800 overflow-y-auto">
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => {
                setViewMode(viewMode === 'matrix' ? 'workbench' : 'matrix');
                setMobileMenuOpen(false);
              }}
              className="px-3 py-1.5 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-md whitespace-nowrap shrink-0"
            >
              {viewMode === 'matrix' ? 'Workbench' : 'Quadrant Map'}
            </button>
            {PHASES.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  handleSelectPhase(p.id);
                  setMobileMenuOpen(false);
                }}
                className="px-3 py-1.5 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-md whitespace-nowrap shrink-0"
              >
                {p.code}. {p.title}
              </button>
            ))}
          </div>
          {renderSidebarContent()}
        </div>
      )}

      {/* Main Workspace */}
      <div className="flex-1 flex min-h-0">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex w-72 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f131c] flex-col sticky top-14 h-[calc(100dvh-3.5rem)] self-start">
          {renderSidebarContent()}
        </aside>

        {/* Main Viewport */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 max-w-[1320px]">
          {viewMode === 'matrix' ? (
            <MatrixOverview
              apis={APIS}
              activeApiId={activeApi.id}
              onSelectApi={handleSelectApi}
              onClose={() => setViewMode('workbench')}
            />
          ) : (
            <div className="space-y-6">
              {/* Phase Context Strip */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    Phase {activePhase.code} · {activePhase.title}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{activePhase.epistemicLabel}</span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">
                  Endpoint {activeApi.index} of {APIS.length} · No API key required
                </div>
              </div>

              {/* Active API Header */}
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-baseline justify-between gap-4">
                  <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-slate-900 dark:text-white text-balance">
                    {activeApi.name}
                  </h1>
                  <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 font-mono">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {activeApi.method}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{activeApi.sdkBadge}</span>
                    <span aria-hidden="true">·</span>
                    <span>Zero Auth</span>
                  </div>
                </div>

                <p className="text-sm text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed">
                  {activeApi.shortPitch}{' '}
                  <span className="text-slate-500 dark:text-slate-400">
                    {activeApi.epistemicNote}
                  </span>
                </p>

                <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 rounded-md font-mono text-xs text-slate-600 dark:text-slate-300">
                  <span className="font-semibold text-blue-600 dark:text-blue-400 shrink-0">
                    {builtRequest.method}
                  </span>
                  <span className="truncate flex-1">{builtRequest.url}</span>
                </div>
              </div>

              {/* Interactive Parameters & Presets */}
              <section className="bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Parameters & Query Input
                  </h2>
                  {activeApi.presets && activeApi.presets.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] text-slate-400 mr-1">Presets:</span>
                      {activeApi.presets.map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => applyPreset(preset.values)}
                          className="px-2.5 py-1 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeApi.params.map((param) => {
                    const val = activeValues[param.key] ?? param.defaultValue;
                    if (param.type === 'code') {
                      return (
                        <div key={param.key} className="md:col-span-2 space-y-1.5">
                          <label
                            htmlFor={`param-${param.key}`}
                            className="block text-xs font-medium text-slate-600 dark:text-slate-400"
                          >
                            {param.label}
                          </label>
                          <textarea
                            id={`param-${param.key}`}
                            rows={param.rows || 6}
                            value={val}
                            onChange={(e) => updateParam(param.key, e.target.value)}
                            spellCheck={false}
                            className="w-full p-3 text-xs font-mono leading-5 bg-slate-50 dark:bg-[#0d111a] border border-slate-200 dark:border-slate-800 rounded-md text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600"
                          />
                        </div>
                      );
                    }

                    if (param.type === 'select') {
                      return (
                        <div key={param.key} className="space-y-1.5">
                          <label
                            htmlFor={`param-${param.key}`}
                            className="block text-xs font-medium text-slate-600 dark:text-slate-400"
                          >
                            {param.label}
                          </label>
                          <div className="relative">
                            <select
                              id={`param-${param.key}`}
                              value={val}
                              onChange={(e) => updateParam(param.key, e.target.value)}
                              className="w-full appearance-none px-3 py-2 pr-8 text-xs bg-slate-50 dark:bg-[#0d111a] border border-slate-200 dark:border-slate-800 rounded-md text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600"
                            >
                              {(param.options || []).map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={param.key} className="space-y-1.5">
                        <label
                          htmlFor={`param-${param.key}`}
                          className="block text-xs font-medium text-slate-600 dark:text-slate-400"
                        >
                          {param.label}
                        </label>
                        <input
                          id={`param-${param.key}`}
                          type={param.type === 'number' ? 'number' : 'text'}
                          value={val}
                          placeholder={param.placeholder}
                          onChange={(e) => updateParam(param.key, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              executeApi(activeApi, activeValues);
                            }
                          }}
                          className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-[#0d111a] border border-slate-200 dark:border-slate-800 rounded-md text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600"
                        />
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/70">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Updates SDK &amp; curl snippets automatically as you edit parameters.
                  </span>
                  <button
                    type="button"
                    onClick={() => executeApi(activeApi, activeValues)}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-md hover:opacity-90 disabled:opacity-60 transition-opacity whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {loading ? (
                      <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Play className="w-3.5 h-3.5 fill-current" />
                    )}
                    <span>{loading ? 'Executing...' : 'Execute Query'}</span>
                  </button>
                </div>
              </section>

              {/* 2-Column Split Workbench: SDK Code + Live Response Studio */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
                {/* Left Column: SDK / Query Code Showcase */}
                <div className="xl:col-span-5 flex flex-col min-w-0 min-h-[420px]">
                  <CodePane
                    sdkCode={sdkCode}
                    curlCode={curlCode}
                    sdkBadge={activeApi.sdkBadge}
                    codeLanguage={activeApi.codeLanguage}
                    docsUrl={activeApi.docsUrl}
                  />
                </div>

                {/* Right Column: Live Response Studio */}
                <section className="xl:col-span-7 flex flex-col min-w-0 bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden min-h-[420px]">
                  <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50">
                    <div className="flex items-center gap-1 p-0.5 bg-slate-200/70 dark:bg-slate-800 rounded-md">
                      <button
                        type="button"
                        onClick={() => setResponseTab('preview')}
                        className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          responseTab === 'preview'
                            ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        Visual Preview
                      </button>
                      <button
                        type="button"
                        onClick={() => setResponseTab('raw')}
                        className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          responseTab === 'raw'
                            ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        Raw Payload
                      </button>
                    </div>

                    {activeResult && !loading && (
                      <div className="flex items-center gap-2 text-xs font-mono tabular-nums">
                        <span
                          className={`font-semibold ${
                            activeResult.status >= 200 && activeResult.status < 300
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          HTTP {activeResult.status} {activeResult.statusText}
                        </span>
                        <span className="text-slate-400" aria-hidden="true">·</span>
                        <span className="text-slate-600 dark:text-slate-400">
                          {activeResult.cached ? 'Cached' : `${activeResult.latencyMs} ms`}
                        </span>
                        <span className="text-slate-400" aria-hidden="true">·</span>
                        <span className="text-slate-600 dark:text-slate-400">
                          {(activeResult.sizeBytes / 1024).toFixed(1)} KB
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 flex flex-col min-h-0">
                    {loading ? (
                      <div className="p-6 space-y-4 animate-pulse">
                        <div className="h-5 w-48 bg-slate-200 dark:bg-slate-800 rounded" />
                        <div className="grid grid-cols-3 gap-4">
                          <div className="h-16 bg-slate-100 dark:bg-slate-800/70 rounded" />
                          <div className="h-16 bg-slate-100 dark:bg-slate-800/70 rounded" />
                          <div className="h-16 bg-slate-100 dark:bg-slate-800/70 rounded" />
                        </div>
                        <div className="h-32 bg-slate-100 dark:bg-slate-800/50 rounded" />
                      </div>
                    ) : activeResult?.error && responseTab !== 'raw' ? (
                      <div className="p-6 space-y-3">
                        <div className="text-sm font-semibold text-rose-600 dark:text-rose-400">
                          Request failed ({activeResult.status || 'Network'})
                        </div>
                        <p className="text-xs font-mono text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-3 rounded border border-slate-200 dark:border-slate-800">
                          {activeResult.error}
                        </p>
                        <button
                          type="button"
                          onClick={() => executeApi(activeApi, activeValues)}
                          className="px-3 py-1.5 text-xs font-medium bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded cursor-pointer"
                        >
                          Retry Request
                        </button>
                      </div>
                    ) : activeResult ? (
                      responseTab === 'preview' ? (
                        <ResponseVisuals apiId={activeApi.id} data={activeResult.data} />
                      ) : (
                        <RawResponsePane data={activeResult.data} />
                      )
                    ) : (
                      <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                        Click Execute Query to inspect live data from {activeApi.name}.
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
