import type { Config } from '@netlify/functions';
import { handleHnStories } from '../../lib/api-core.ts';

export default async (req: Request) => {
  const params = new URL(req.url).searchParams;
  return handleHnStories(params.get('feed'), params.get('limit'));
};

export const config: Config = { path: '/api/hn-stories', method: 'GET' };
