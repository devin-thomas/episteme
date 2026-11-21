import type { ApiDefinition, BuiltRequest, ParamValues } from '../types/api';

type ExampleDefinition = Omit<ApiDefinition, 'buildSdkCode' | 'buildCurlCode' | 'sdkBadge' | 'codeLanguage'>;

export function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

export function curlExample(request: BuiltRequest): string {
  const headers: Record<string, string> = { Accept: 'application/json', ...request.headers };
  const parts = ['curl --fail-with-body --silent --show-error --max-time 20', `  --request ${request.method}`, `  ${shellQuote(request.url)}`];
  if (request.body !== undefined && typeof request.body !== 'string' && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  for (const [key, value] of Object.entries(headers)) parts.push(`  --header ${shellQuote(`${key}: ${value}`)}`);
  if (request.body !== undefined) {
    parts.push(`  --data-raw ${shellQuote(typeof request.body === 'string' ? request.body : JSON.stringify(request.body))}`);
  }
  return parts.join(' \\\n');
}

export function typescriptExample(request: BuiltRequest, usage = 'console.log(data);'): string {
  const headers: Record<string, string> = { Accept: 'application/json', ...request.headers };
  const options: Record<string, unknown> = { method: request.method, headers };
  if (request.body !== undefined) {
    options.body = typeof request.body === 'string' ? request.body : JSON.stringify(request.body);
    if (typeof request.body !== 'string' && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  }
  return `// Node.js 22.18+; save as example.mts, run: node example.mts\n// No packages or API key required.\nconst response = await fetch(${JSON.stringify(request.url)}, {\n  ...${JSON.stringify(options, null, 2)},\n  signal: AbortSignal.timeout(20_000),\n});\nif (!response.ok) {\n  throw new Error(\`HTTP \${response.status}: \${await response.text()}\`);\n}\nconst data = await response.json();\n${usage}`;
}

// One request builder drives execution and both copyable examples.
export function withExamples(definition: ExampleDefinition, usage?: string | ((values: ParamValues) => string)): ApiDefinition {
  return {
    ...definition,
    sdkBadge: 'TypeScript · fetch',
    codeLanguage: 'typescript',
    buildSdkCode: (values) => typescriptExample(definition.buildRequest(values), typeof usage === 'function' ? usage(values) : usage),
    buildCurlCode: (values) => curlExample(definition.buildRequest(values)),
  };
}
