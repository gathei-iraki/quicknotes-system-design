# QuickNotes Data Model

## Database choice

QuickNotes uses PostgreSQL, a relational SQL database. Notes have clear
ownership and tags form a well-defined many-to-many relationship, so foreign
keys and transactions protect data integrity. SQL also supports the joins,
filtering, sorting, and pagination this application needs. A document database
could store a note and its tags together, but duplicated tag data and weaker
relationship enforcement would make consistent tag updates harder. PostgreSQL
therefore provides the best balance of consistency, query flexibility, and
operational maturity for this workload.

## Entities and columns

### `users`

| Column | Type | Constraints and purpose |
| --- | --- | --- |
| `id` | `BIGINT` | Primary key; generated identity. |
| `email` | `VARCHAR(320)` | Required and unique login identifier. |
| `password_hash` | `VARCHAR(255)` | Required password hash; plaintext passwords are never stored. |
| `display_name` | `VARCHAR(100)` | Required name shown in the application. |
| `created_at` | `TIMESTAMPTZ` | Required creation time; defaults to the current time. |
| `updated_at` | `TIMESTAMPTZ` | Required last-update time; defaults to the current time. |

### `notes`

| Column | Type | Constraints and purpose |
| --- | --- | --- |
| `id` | `BIGINT` | Primary key; generated identity. |
| `user_id` | `BIGINT` | Required foreign key referencing `users(id)`. |
| `title` | `VARCHAR(100)` | Required title containing at least one non-whitespace character. |
| `body` | `TEXT` | Optional note body. |
| `created_at` | `TIMESTAMPTZ` | Required creation time; defaults to the current time. |
| `updated_at` | `TIMESTAMPTZ` | Required last-update time; defaults to the current time. |

### `tags`

| Column | Type | Constraints and purpose |
| --- | --- | --- |
| `id` | `BIGINT` | Primary key; generated identity. |
| `user_id` | `BIGINT` | Required foreign key referencing `users(id)`. |
| `name` | `VARCHAR(50)` | Required tag name; unique for each user. |
| `created_at` | `TIMESTAMPTZ` | Required creation time; defaults to the current time. |

### `note_tags`

| Column | Type | Constraints and purpose |
| --- | --- | --- |
| `note_id` | `BIGINT` | Foreign key referencing `notes(id)` and part of the composite primary key. |
| `tag_id` | `BIGINT` | Foreign key referencing `tags(id)` and part of the composite primary key. |
| `created_at` | `TIMESTAMPTZ` | Required time when the tag was attached to the note. |

## Relationships

- One user can own many notes, while each note belongs to exactly one user.
  This is a one-to-many relationship through `notes.user_id`.
- One user can own many tags, while each tag belongs to exactly one user. This
  is a one-to-many relationship through `tags.user_id`.
- A note can have many tags and a tag can belong to many notes. This
  many-to-many relationship is implemented by the `note_tags` junction table.
- The application must verify that a note and tag have the same `user_id`
  before inserting their association into `note_tags`. This prevents users
  from attaching another user's tag to a note.

Deleting a user cascades to that user's notes and tags. Deleting a note or tag
cascades only to its rows in `note_tags`, preventing orphaned associations.

## SQL schema

The following statements use PostgreSQL syntax:

```sql
CREATE TABLE users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email VARCHAR(320) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL,
    title VARCHAR(100) NOT NULL CHECK (LENGTH(TRIM(title)) > 0),
    body TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notes_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE tags (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name VARCHAR(50) NOT NULL CHECK (LENGTH(TRIM(name)) > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tags_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uq_tags_user_name UNIQUE (user_id, name)
);

CREATE TABLE note_tags (
    note_id BIGINT NOT NULL,
    tag_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (note_id, tag_id),
    CONSTRAINT fk_note_tags_note
        FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
    CONSTRAINT fk_note_tags_tag
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);
```

The API updates `updated_at` whenever it changes a user or note. A database
trigger could enforce this later if writes are allowed from multiple services.

## Indexes

```sql
CREATE INDEX idx_notes_user_updated
    ON notes (user_id, updated_at DESC, id DESC);

CREATE INDEX idx_note_tags_tag
    ON note_tags (tag_id, note_id);
```

`idx_notes_user_updated` supports the most common request: listing one user's
notes from newest to oldest without sorting the entire notes table. Including
`id` gives deterministic ordering when two notes have the same update time and
supports cursor pagination. `idx_note_tags_tag` makes it efficient to find all
notes assigned to a tag; the `note_tags` primary key already supports lookups
beginning with `note_id`.

PostgreSQL automatically creates indexes for primary keys and unique
constraints, including `users.email` and `(tags.user_id, tags.name)`.

## Example queries

### 1. List a user's latest notes

```sql
SELECT id, title, body, created_at, updated_at
FROM notes
WHERE user_id = $1
ORDER BY updated_at DESC, id DESC
LIMIT $2;
```

### 2. Create a note and return it

```sql
INSERT INTO notes (user_id, title, body)
VALUES ($1, $2, $3)
RETURNING id, user_id, title, body, created_at, updated_at;
```

### 3. Retrieve a note with its tags using joins

```sql
SELECT
    n.id,
    n.title,
    n.body,
    n.created_at,
    n.updated_at,
    COALESCE(
        JSON_AGG(
            JSON_BUILD_OBJECT('id', t.id, 'name', t.name)
            ORDER BY t.name
        ) FILTER (WHERE t.id IS NOT NULL),
        '[]'::JSON
    ) AS tags
FROM notes AS n
LEFT JOIN note_tags AS nt ON nt.note_id = n.id
LEFT JOIN tags AS t ON t.id = nt.tag_id
WHERE n.id = $1 AND n.user_id = $2
GROUP BY n.id;
```

### 4. List notes having a selected tag

```sql
SELECT n.id, n.title, n.body, n.updated_at
FROM notes AS n
JOIN note_tags AS nt ON nt.note_id = n.id
JOIN tags AS t ON t.id = nt.tag_id
WHERE n.user_id = $1 AND t.name = $2
ORDER BY n.updated_at DESC, n.id DESC
LIMIT $3;
```

Every ownership-sensitive query includes `user_id`, so the database lookup does
not return another user's resource for the application to filter afterward.
