import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';

import * as schema from '../database/schema';

export type DrizzleDBType = NeonHttpDatabase<typeof schema>;
