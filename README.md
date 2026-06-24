# prototype

##  Search Technical challenge

The senior backend challenge solution lives in [`teaching-material-search`](./teaching-material-search).

It contains a Node.js + TypeScript + PostgreSQL search MVP with:

- deterministic legacy metadata normalization,
- PostgreSQL full-text search and trigram fallback,
- ingestion scripts,
- API examples,
- user stories,
- target AWS production architecture,
- zero-downtime migration notes,
- AI tool usage documentation.

### Docker files
`cd FOLDER_NAME`
`docker compose -f postgres.yml up`
