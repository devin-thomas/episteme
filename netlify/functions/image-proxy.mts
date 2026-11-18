import type { Config } from '@netlify/functions';
import { handleImageProxy } from '../../lib/api-core.ts';

export default async (req: Request) => {
  return handleImageProxy(new URL(req.url).searchParams.get('url'));
};

export const config: Config = { path: '/api/image-proxy', method: 'GET' };
