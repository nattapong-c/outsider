import { edenTreaty } from '@elysiajs/eden';
import type { AppRouter } from '../../../service/src/index';

export const api = edenTreaty<AppRouter>(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001');
