# QuickNotes API Design

## Overview

QuickNotes exposes a versioned REST API for authenticated users to create,
read, update, delete, and tag their notes. The examples below use the base URL
`https://api.quicknotes.example/api/v1`.

Clients send and receive JSON and must include these headers when a request has
a body:

```http
Authorization: Bearer <access-token>
Content-Type: application/json
Accept: application/json
```

Every notes endpoint is scoped to the authenticated user. A user cannot read or
change another user's notes, even if they know a note ID.

## Endpoints

| Method | Path | Description | Success status |
| --- | --- | --- | --- |
| `GET` | `/notes` | List the current user's notes, with pagination and optional tag filtering. | `200 OK` |
| `POST` | `/notes` | Create a note for the current user. | `201 Created` |
| `GET` | `/notes/{noteId}` | Retrieve one note owned by the current user. | `200 OK` |
| `PATCH` | `/notes/{noteId}` | Update a note's title or body. | `200 OK` |
| `DELETE` | `/notes/{noteId}` | Permanently delete a note. | `204 No Content` |
| `GET` | `/tags` | List the current user's tags. | `200 OK` |
| `POST` | `/tags` | Create a tag for the current user. | `201 Created` |
| `PUT` | `/notes/{noteId}/tags/{tagId}` | Add an existing tag to a note. | `204 No Content` |
| `DELETE` | `/notes/{noteId}/tags/{tagId}` | Remove a tag from a note. | `204 No Content` |

## Listing notes

### Request

```http
GET /api/v1/notes?page=1&limit=20&tag=work HTTP/1.1
Host: api.quicknotes.example
Authorization: Bearer <access-token>
Accept: application/json
```

`page` defaults to `1`, and `limit` defaults to `20` with a maximum of `100`.
The optional `tag` parameter filters notes by tag name. Notes are returned in
descending `updatedAt` order.

### Response

```http
HTTP/1.1 200 OK
Content-Type: application/json
```

```json
{
  "data": [
    {
      "id": "8b5ea6b1-52c1-4ca9-a812-18a14ca8a901",
      "title": "Sprint planning",
      "body": "Prepare estimates for the next sprint.",
      "tags": [
        {
          "id": "f6a91045-bbe0-4719-9f27-0cb9c78c86a4",
          "name": "work"
        }
      ],
      "createdAt": "2026-10-17T08:30:00Z",
      "updatedAt": "2026-10-17T09:15:00Z"
    },
    {
      "id": "0b28fe51-1680-4efb-8c4b-1c417bc2d0df",
      "title": "Shopping list",
      "body": "Coffee, rice, and fruit.",
      "tags": [],
      "createdAt": "2026-10-16T15:10:00Z",
      "updatedAt": "2026-10-16T15:10:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalItems": 2,
    "totalPages": 1
  }
}
```

An empty result uses `200 OK` and returns an empty `data` array rather than a
`404 Not Found` response.

## Creating a note

The title is required after trimming whitespace and must contain no more than
100 characters. The body is optional.

### Request

```http
POST /api/v1/notes HTTP/1.1
Host: api.quicknotes.example
Authorization: Bearer <access-token>
Content-Type: application/json
Accept: application/json
```

```json
{
  "title": "Architecture review",
  "body": "Review caching and database replication decisions."
}
```

### Response

```http
HTTP/1.1 201 Created
Location: /api/v1/notes/7fcb6af4-3c33-4d9d-bdc6-189b64047a72
Content-Type: application/json
```

```json
{
  "data": {
    "id": "7fcb6af4-3c33-4d9d-bdc6-189b64047a72",
    "title": "Architecture review",
    "body": "Review caching and database replication decisions.",
    "tags": [],
    "createdAt": "2026-10-17T10:00:00Z",
    "updatedAt": "2026-10-17T10:00:00Z"
  }
}
```

## Updating a note

`PATCH /notes/{noteId}` accepts one or both editable fields. Omitted fields are
left unchanged.

```json
{
  "title": "Updated architecture review",
  "body": "Review caching, replication, and failover decisions."
}
```

The response is `200 OK` with the updated note in the same `data` shape used by
the create response.

## Deleting a note

A successful `DELETE /notes/{noteId}` returns `204 No Content` with no response
body. Deleting the note also removes its `note_tags` associations. Repeating the
request for the deleted ID returns `404 Not Found`.

## Error responses

All errors use a consistent JSON structure. `requestId` lets support engineers
correlate a client-visible error with server logs. Validation errors may also
include a `details` array.

| Status | Meaning | Typical cause |
| --- | --- | --- |
| `400 Bad Request` | The request is malformed or fails validation. | Invalid JSON, a missing title, or a title over 100 characters. |
| `401 Unauthorized` | Authentication is missing or invalid. | Missing, expired, or malformed access token. |
| `403 Forbidden` | The authenticated user is not allowed to perform the action. | Account restrictions or insufficient permissions. |
| `404 Not Found` | The requested resource does not exist or is not visible to the user. | Unknown note or tag ID. |
| `409 Conflict` | The request conflicts with existing data. | Creating a duplicate tag name for the same user. |
| `429 Too Many Requests` | The client exceeded its rate limit. | Too many requests in a short period. |
| `500 Internal Server Error` | An unexpected server failure occurred. | Database, application, or dependency failure. |

Example validation error:

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json
```

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid fields.",
    "details": [
      {
        "field": "title",
        "message": "Title is required and must be 100 characters or fewer."
      }
    ],
    "requestId": "req_01JA5PN7THV3H2RQX6QMD0B7K9"
  }
}
```

Unexpected errors return a generic message and do not expose stack traces,
database details, or other internal information.
