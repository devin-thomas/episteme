export type PhaseId = 1 | 2 | 3 | 4;

export interface PhaseMeta {
  id: PhaseId;
  code: string;
  title: string;
  epistemicLabel: string;
  summary: string;
  questionPrompt: string;
}

export type ParamType = 'select' | 'text' | 'number' | 'code';

export interface ParamOption {
  label: string;
  value: string;
}

export interface ApiParamDef {
  key: string;
  label: string;
  type: ParamType;
  defaultValue: string;
  placeholder?: string;
  options?: ParamOption[];
  rows?: number;
}

export interface ApiPreset {
  label: string;
  values: Record<string, string>;
}

export type ParamValues = Record<string, string>;

export interface BuiltRequest {
  url: string;
  method: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: unknown;
  localEndpoint?: string;
}

export interface ApiDefinition {
  id: string;
  index: string;
  phase: PhaseId;
  name: string;
  domain: string;
  shortPitch: string;
  epistemicNote: string;
  method: 'GET' | 'POST';
  sdkBadge: string;
  codeLanguage: string;
  docsUrl: string;
  params: ApiParamDef[];
  presets?: ApiPreset[];
  buildRequest: (values: ParamValues) => BuiltRequest;
  buildSdkCode: (values: ParamValues) => string;
  buildCurlCode: (values: ParamValues) => string;
}

export interface ExecutionResult {
  status: number;
  statusText: string;
  latencyMs: number;
  sizeBytes: number;
  contentType: string;
  data: unknown;
  error?: string;
}
