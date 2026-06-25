import { Pool } from 'pg';
import { config } from './config';

export const pool = new Pool({
  connectionString: config.databaseUrl,
  ...(config.databaseSsl ? { ssl: config.databaseSsl } : {}),
  max: 10,
});

// Loosen word-similarity threshold (default 0.6) so the <% operator catches
// real typos while still using the trigram GIN index. Applied to every pooled
// connection.
pool.on('connect', (client) => {
  client
    .query('SET pg_trgm.word_similarity_threshold = 0.3')
    .catch((err) => console.error('failed to set trgm threshold', err));
});

pool.on('error', (err) => console.error('unexpected pg pool error', err));
