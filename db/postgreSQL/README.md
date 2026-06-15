# PostgreSQL Learning Scripts

This repository contains a collection of PostgreSQL queries and examples used for learning and experimenting with PostgreSQL functions, string manipulation, set-returning functions, arrays, and basic Full Text Search concepts.

## Prerequisites

* PostgreSQL 12+
* psql, pgAdmin, DBeaver, Beekeeper Studio, or any PostgreSQL client

---

# 1. Generate Random Numbers

```sql
SELECT random(), random(), trunc(random()*19900000);
```

### Purpose

Demonstrates PostgreSQL's built-in random number generation.

### Functions Used

| Function   | Description                            |
| ---------- | -------------------------------------- |
| `random()` | Returns a random value between 0 and 1 |
| `trunc()`  | Removes decimal places                 |

### Example Output

```text
0.34567 | 0.89123 | 12345678
```

---

# 2. Repeat a String

```sql
SELECT repeat('Neon ', 6);
```

### Purpose

Repeats a string multiple times.

### Example Output

```text
Neon Neon Neon Neon Neon Neon
```

### Functions Used

| Function          | Description                |
| ----------------- | -------------------------- |
| `repeat(text, n)` | Repeats a string `n` times |

---

# 3. Generate Multiple Rows Using generate_series()

```sql
SELECT
    random(),
    random(),
    trunc(random()*1990000000),
    generate_series(1,500);
```

### Purpose

Creates 500 rows of sample data.

### Functions Used

| Function                     | Description                 |
| ---------------------------- | --------------------------- |
| `generate_series(start,end)` | Produces a sequence of rows |
| `random()`                   | Generates random numbers    |

### Common Use Cases

* Creating test datasets
* Performance testing
* Benchmarking queries
* Simulating large tables

---

# 4. Extract Unique Words from a Sentence

```sql
SELECT DISTINCT(
    unnest(
        string_to_array(
            'manjeet verma is my name',
            ' '
        )
    )
);
```

### Purpose

Splits a sentence into words and returns unique values.

### Processing Steps

1. Convert sentence into an array using `string_to_array()`
2. Convert array elements into rows using `unnest()`
3. Remove duplicates using `DISTINCT`

### Example Output

```text
manjeet
verma
is
my
name
```

### Functions Used

| Function            | Description               |
| ------------------- | ------------------------- |
| `string_to_array()` | Splits text into an array |
| `unnest()`          | Expands array into rows   |
| `DISTINCT`          | Removes duplicate values  |

---

# 5. Create Documents Table

```sql
CREATE TABLE docs (
    id SERIAL,
    doc TEXT,
    PRIMARY KEY(id)
);
```

### Purpose

Stores text documents that can later be indexed or searched.

### Table Structure

| Column | Type   | Description                   |
| ------ | ------ | ----------------------------- |
| id     | SERIAL | Auto-incrementing primary key |
| doc    | TEXT   | Document content              |

---

# 6. Insert Sample Documents

```sql
INSERT INTO docs (doc) VALUES
('This is SQL and Python and other fun teaching stuff'),
('More people should learn SQL from UMSI'),
('UMSI also teaches Python and also SQL');
```

### Purpose

Adds sample text data for search experiments.

### Sample Data

| id | doc                                                 |
| -- | --------------------------------------------------- |
| 1  | This is SQL and Python and other fun teaching stuff |
| 2  | More people should learn SQL from UMSI              |
| 3  | UMSI also teaches Python and also SQL               |

---

# 7. Create Inverted Index Table

```sql
CREATE TABLE docs_gin (
    keyword TEXT,
    doc_id INTEGER REFERENCES docs(id) ON DELETE CASCADE
);
```

### Purpose

Represents a simplified inverted index structure similar to what PostgreSQL's GIN indexes use internally.

### Table Structure

| Column  | Type    | Description           |
| ------- | ------- | --------------------- |
| keyword | TEXT    | Indexed word/token    |
| doc_id  | INTEGER | Reference to document |

### Foreign Key Behavior

```sql
ON DELETE CASCADE
```

When a document is deleted from `docs`, all related keyword entries are automatically removed.

---

# 8. View Indexed Keywords

```sql
SELECT * FROM docs_gin;
```

### Purpose

Displays all keyword-to-document mappings.

### Example

| keyword | doc_id |
| ------- | ------ |
| sql     | 1      |
| sql     | 2      |
| sql     | 3      |
| python  | 1      |
| python  | 3      |

---

# 9. View Documents

```sql
SELECT * FROM docs;
```

### Purpose

Displays all stored documents.

---

# Learning Concepts Covered

This exercise introduces several important PostgreSQL concepts:

* Random data generation
* String functions
* Arrays
* Array expansion with `unnest()`
* Set-returning functions
* `generate_series()`
* Table creation
* Primary keys
* Foreign keys
* Cascading deletes
* Basic document storage
* Foundations of Full Text Search
* Understanding how inverted indexes work

---

# Next Steps

After completing these exercises, consider learning:

1. `tsvector`
2. `tsquery`
3. GIN indexes
4. Full Text Search
5. Ranking search results
6. JSONB indexing
7. PostgreSQL extensions
8. Vector search with PostgreSQL

Example:

```sql
SELECT to_tsvector(
    'This is SQL and Python and other fun teaching stuff'
);
```

This is the foundation of PostgreSQL's powerful Full Text Search capabilities.
