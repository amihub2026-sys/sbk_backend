# SBK Chithiram Thiruvila API contract

## Public / participant
- `GET /api/event`
- `POST /api/registrations`
- `GET /api/registrations/me`
- `POST /api/registrations/:id/checkout`
- `POST /api/registrations/lookup/start`
- `POST /api/registrations/lookup/verify`
- `GET /api/campaigns/:code/scan` — records marketing QR scan then redirects to `/register?campaign=CODE`.

## Authentication
- `GET /api/auth/csrf`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`

## Admin
All routes require an authenticated `admin` session.
- `GET /api/admin/state`
- `POST /api/admin/registrations/offline`
- `PUT /api/admin/registrations/:id`
- `POST /api/admin/registrations/:id/review`
- `POST /api/admin/registrations/:id/send-pass`
- `PATCH /api/admin/registrations/:id/attendance`
- `POST /api/admin/check-in/lookup`
- `POST /api/admin/check-in`
- `PUT /api/admin/settings`
- `PUT /api/admin/categories/:id`
- `PUT /api/admin/slots/:id`
- `DELETE /api/admin/slots/:id`
- `PUT /api/admin/competitions/:id`
- `DELETE /api/admin/competitions/:id`
- `PUT /api/admin/judges/:id`
- `DELETE /api/admin/judges/:id`
- `GET /api/admin/qr-campaigns`
- `POST /api/admin/qr-campaigns`
- `PUT /api/admin/qr-campaigns/:id`
- `GET /api/admin/qr-campaigns/:id/qr`
- `GET /api/admin/reports/dashboard`

## Judge
- `GET /api/judge/state`
- `PUT /api/judge/scores/:id`

## Payment
- `POST /api/payments/razorpay/webhook`

## Authority rules
- Server calculates age/category, fees, capacity, application number, QR token and timestamps.
- Maximum 2 client-eligible competitions.
- Online registration never trusts a client-supplied payment success flag.
- Approval requires confirmed payment and complete non-overlapping schedule.
- Event-pass QR does not approve a participant; check-in verifies approval/payment/schedule again.
- Check-in time is stored in UTC and displayed in `Asia/Kolkata` by Angular.
- Judge can score only assigned competitions and approved participants.
