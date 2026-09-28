# Backend architecture

```text
HTTP request
  -> route
  -> validation / authorization middleware
  -> controller
  -> service
  -> Mongoose model
  -> MongoDB Atlas
```

## Main folders
- `controllers/`: HTTP orchestration only.
- `services/`: business rules and integrations.
- `models/`: one schema/model per file.
- `validators/`: Zod request schemas.
- `routes/`: endpoint mapping only.
- `middleware/`: role auth, CSRF, validation, errors.
- `config/`: environment and database.
- `seed/`: the 12 approved age bands and 17 client competitions.

## Two QR systems
1. **Marketing QR**: Admin creates a campaign; QR points to `/api/campaigns/:code/scan`; backend counts scan and redirects to the public registration form with `?campaign=CODE`.
2. **Event Pass QR**: created only for the participant pass. It carries an opaque random token. Admin scanner submits that token to `/api/admin/check-in/lookup` and `/api/admin/check-in`.

Approval and check-in are intentionally separate.
