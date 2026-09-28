# SBK Chithiram Thiruvila — Corporate Backend

Production-structured Node.js + Express + MongoDB backend for the SBK VIBGYOR School / Star Guru Charitable Foundation event platform.

## Structure

```text
src/
  config/
  constants/
  controllers/
  middleware/
  models/
  routes/
  seed/
  services/
  utils/
  validators/
  app.js
  server.js
```

Routes contain endpoint wiring only. Controllers handle HTTP concerns. Services contain business rules. Models are separated by domain.

## First run

```powershell
npm install
Copy-Item .env.example .env
```

Fill `.env` with `MONGODB_URI` and a `SESSION_SECRET` of at least 32 characters. For the first administrator also set `ADMIN_PASSWORD` to at least 10 characters.

```powershell
npm run seed
npm run setup:admin
npm run dev
```

Backend: `http://localhost:5000`
Health: `http://localhost:5000/api/health`

## Frontend development
Run the Angular API build separately on port 4200. It proxies `/api` and `/media` to port 5000.

## Important production setup
- MongoDB Atlas production cluster / backups.
- SMTP/Brevo credentials for OTP and event-pass email.
- Razorpay credentials + webhook for online payment.
- HTTPS and real `FRONTEND_ORIGIN`, `APP_BASE_URL`, `API_BASE_URL`.
- Replace local upload storage with S3/Cloudinary/object storage before multi-instance deployment.
- Never expose `.env` or commit credentials.

See `docs/API_CONTRACT.md` and `docs/ARCHITECTURE.md`.
