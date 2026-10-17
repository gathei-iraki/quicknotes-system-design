# QuickNotes System Design

QuickNotes is a small API client and backend system-design project for an
online note-taking service intended to support one million registered users.
The browser client demonstrates `GET`, `POST`, and `DELETE` requests with the
[JSONPlaceholder](https://jsonplaceholder.typicode.com/) practice API. The
design documents describe the REST API, PostgreSQL data model, and scalable
architecture a production QuickNotes backend could use.

## Features

- Loads ten notes from an API.
- Creates a note after validating its title.
- Deletes a note from the displayed list.
- Shows loading, success, error, and empty states.
- Disables the relevant action button while a request is running.
- Inserts API-provided text safely with `textContent`.
- Documents a production API, relational data model, and scalable architecture.

## Project structure

```text
.
├── api.js
├── index.html
├── style.css
├── README.md
└── docs
    ├── api-design.md
    ├── architecture.md
    └── data-model.md
```

## Run the API client

No package installation or build step is required. Clone the repository and
start a local static-file server:

```bash
git clone https://github.com/gathei-iraki/quicknotes-system-design.git
cd quicknotes-system-design
python3 -m http.server 8000
```

Open [http://localhost:8000](http://localhost:8000) in a browser. Click **Load
notes** to fetch ten sample notes. Use the form to create a sample note and each
note's **Delete** button to remove it from the page.

JSONPlaceholder simulates successful writes but does not permanently store
created or deleted notes. The client therefore updates the displayed list
locally after successful POST and DELETE responses.

Stop the development server with `Ctrl+C`.

## Design documents

- [API design](docs/api-design.md) describes the production REST endpoints,
  payloads, status codes, authentication, pagination, and error format.
- [Data model](docs/data-model.md) defines the users, notes, tags, and note-tags
  relationship using PostgreSQL tables, indexes, and example queries.
- [Architecture](docs/architecture.md) covers requirements, capacity estimates,
  components, request flows, trade-offs, and failure resilience for one million
  users.

## What I learned

- How to build a reusable Fetch API helper that checks HTTP status codes and
  supports multiple request methods.
- How to represent loading, success, error, validation, and empty states in an
  accessible browser interface.
- Why untrusted API and user content should be inserted with `textContent`
  instead of `innerHTML`.
- How REST resource design, relational constraints, indexes, and API response
  formats work together.
- How capacity estimates guide decisions about caching, read replicas, queues,
  horizontal scaling, and failure recovery.
