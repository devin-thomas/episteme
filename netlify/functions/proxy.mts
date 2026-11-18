import type { Config } from '@netlify/functions';
import { handleProxy } from '../../lib/api-core.ts';

export default async (req: Request) => {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return Response.json({ error: 'Missing target url' }, { status: 400 });
  }
  return handleProxy(payload);
};

export const config: Config = { path: '/api/proxy', method: 'POST' };
