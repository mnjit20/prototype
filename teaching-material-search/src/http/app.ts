import express from 'express';
import { z } from 'zod';
import { env } from '../config/env';
import { closePool, pool } from '../db/pool';
import { getFacets, searchResources } from '../repositories/resourceRepository';

const SearchQuerySchema = z.object({
  q: z.string().optional(),
  subject: z.string().optional(),
  grade: z.coerce.number().int().min(1).max(13).optional(),
  schoolType: z.string().optional(),
  materialType: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(env.DEFAULT_SEARCH_LIMIT),
  offset: z.coerce.number().int().min(0).default(0)
});

export function createApp(): express.Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));

  app.get('/', (_request, response) => {
    response.type('html').send(renderSearchPage());
  });

  app.get('/health', async (_request, response, next) => {
    try {
      await pool.query('SELECT 1');
      response.json({ status: 'ok' });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/search', async (request, response, next) => {
    try {
      const parsed = SearchQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        response.status(400).json({
          error: 'invalid_query',
          details: parsed.error.flatten().fieldErrors
        });
        return;
      }

      const results = await searchResources(parsed.data);
      response.json(results);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/facets', async (_request, response, next) => {
    try {
      response.json(await getFacets());
    } catch (error) {
      next(error);
    }
  });

  app.use(
    (
      error: unknown,
      _request: express.Request,
      response: express.Response,
      _next: express.NextFunction
    ) => {
      console.error(error);
      response.status(500).json({ error: 'internal_server_error' });
    }
  );

  return app;
}

export async function shutdown(): Promise<void> {
  await closePool();
}

function renderSearchPage(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Teaching Material Search</title>
    <style>
      body { font-family: system-ui, sans-serif; max-width: 920px; margin: 2rem auto; padding: 0 1rem; }
      input, select, button { font: inherit; margin: .25rem; padding: .4rem; }
      article { border-top: 1px solid #ddd; padding: 1rem 0; }
      img { width: 120px; height: 90px; object-fit: cover; background: #eee; float: right; margin-left: 1rem; }
      mark { background: #fef08a; }
      .meta { color: #555; font-size: .9rem; }
    </style>
  </head>
  <body>
    <h1>Teaching Material Search</h1>
    <form id="search-form">
      <input name="q" size="42" placeholder="Try: mathe klasse 6, religion ethik, Sonnenenergie" autofocus />
      <input name="subject" placeholder="Subject" />
      <input name="grade" placeholder="Grade" size="5" />
      <button>Search</button>
    </form>
    <p id="summary"></p>
    <main id="results"></main>
    <script>
      const form = document.querySelector('#search-form');
      const results = document.querySelector('#results');
      const summary = document.querySelector('#summary');

      function escapeHtml(value) {
        return String(value ?? '')
          .replaceAll('&', '&amp;')
          .replaceAll('<', '&lt;')
          .replaceAll('>', '&gt;')
          .replaceAll('"', '&quot;')
          .replaceAll("'", '&#039;');
      }

      function safeSnippet(value) {
        return escapeHtml(value).replaceAll('&lt;mark&gt;', '<mark>').replaceAll('&lt;/mark&gt;', '</mark>');
      }

      async function search(event) {
        event?.preventDefault();
        const params = new URLSearchParams(new FormData(form));
        for (const [key, value] of [...params.entries()]) {
          if (!value) params.delete(key);
        }
        const response = await fetch('/api/search?' + params.toString());
        const payload = await response.json();
        summary.textContent = response.ok
          ? payload.total + ' result(s) for "' + payload.query + '"'
          : JSON.stringify(payload);
        results.innerHTML = response.ok
          ? payload.results.map((item) => \`
            <article>
              \${item.previewImageUrl ? '<img alt="" src="' + escapeHtml(item.previewImageUrl) + '">' : ''}
              <h2>\${escapeHtml(item.title || item.id)}</h2>
              <p>\${item.snippet ? safeSnippet(item.snippet) : escapeHtml(item.description || '')}</p>
              <p class="meta">
                Subjects: \${escapeHtml(item.subjects.join(', ') || '-')} |
                Grades: \${escapeHtml(item.grades.join(', ') || '-')} |
                Types: \${escapeHtml(item.materialTypes.join(', ') || '-')} |
                Score: \${Number(item.score).toFixed(3)}
              </p>
            </article>
          \`).join('')
          : '';
      }

      form.addEventListener('submit', search);
      search();
    </script>
  </body>
</html>`;
}
