# Laravel API Initialization Prompt

> Paste this into any AI chat or agent to scaffold the Laravel backend.

---

Create a Laravel 11 API project for saving AI chat conversations tied to Apify scrape runs.

## Requirements

### Database — single `conversations` table migration

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `apify_run_id` | string | Indexed |
| `messages` | JSON | Array of `{ role, content }` |
| `created_at` / `updated_at` | timestamps | |

### Model: `Conversation`

- `$fillable`: `apify_run_id`, `messages`
- Cast `messages` to `array`
- UUID primary key (`$incrementing = false`, `$keyType = 'string'`)
- Auto-generate UUID in `boot()` via `creating` event

### Routes (`routes/api.php`)

```
GET    /conversations?run_id={apify_run_id}   → return conversation or 404
POST   /conversations                          → create
PUT    /conversations/{id}                     → update messages
```

### Controller: `ConversationController`

- `index(Request $request)` — find by `apify_run_id`, return JSON or 404
- `store(Request $request)` — validate `apify_run_id` (required|string) and `messages` (required|array), create and return 201
- `update(Request $request, $id)` — validate `messages` (required|array), update and return 200

### CORS (`config/cors.php`)

- Allow all origins for development (`'*'`)
- Paths: `['api/*']`

### Response format

```json
{
  "id": "uuid",
  "apify_run_id": "string",
  "messages": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ],
  "created_at": "...",
  "updated_at": "..."
}
```

## Environment

Use **MySQL**. Set up `.env` with:

```env
APP_NAME=ListeningToolAPI
APP_URL=http://localhost:8000

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=listening_tool
DB_USERNAME=root
DB_PASSWORD=

FRONTEND_URL=http://localhost:3000
```

Also provide a `.env.example` with the same keys but empty values.

No auth required for now.
