# Smart School BD — Registration Workflow (Phase 1)

This update implements the three agreed account roles only:

1. `teacher` — applies for an account using the school code; remains pending until the principal approves.
2. `school_admin` — principal account created with the school application; becomes active only after central-office approval.
3. `central_office` — private account created by a server-side bootstrap script; can approve school applications and view the approved school/geography directory.

No division, district or upazila officer role is created.

## 1. Back up first

- Back up the MongoDB database.
- Keep a copy of the current Client and Server folders.
- Preserve the existing `.env` privately. Never commit or share it.

## 2. Install and configure Server

In the `server` folder:

```bash
npm install
```

Set these values in `.env`:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/smart_school_bd
CLIENT_URL=http://localhost:5173
JWT_ACCESS_SECRET=replace_with_a_random_secret_at_least_32_characters
CENTRAL_OFFICE_NAME=Central Office
CENTRAL_OFFICE_EMAIL=central@example.gov.bd
CENTRAL_OFFICE_PASSWORD=replace_with_a_long_password_at_least_12_characters
```

Use a unique, randomly generated JWT secret and a strong central-office password. Do not use the sample values in production.

## 3. Synchronize the teacher account counter

This is required before enabling teacher applications for an existing database. It counts each school's active and pending teacher accounts and initializes `teacherAccountCount`.

```bash
npm run sync:teacher-counts
```

The application reserves one of the ten school teacher-account slots when an application is submitted. Rejecting a pending teacher application releases the slot.

## 4. Create the first central-office account

```bash
npm run create:central-user
```

The script reads the central-office name, email and password from `.env`. It does not create a public central registration endpoint.

## 5. Start Server and Client

Server:

```bash
npm run dev
```

Client:

```bash
npm install
npm run dev
```

Set `VITE_API_BASE_URL=http://localhost:5000/api` in the Client `.env` if needed.

## 6. Registration workflow

### School / principal
- Submit school name, EIIN/school code, institution type, address, division, district, upazila, principal name, designation, index number (optional), principal email, phone and password.
- School and principal account are created with `pending` status.
- Central office logs in, opens **স্কুল আবেদন**, and approves or rejects.
- Approval activates both the school and its principal account.

### Teacher
- Teacher submits school code, name, designation, index number or teacher code, email, phone and password.
- The application is pending until the principal approves it.
- A school can have at most ten active + pending teacher accounts.
- The limit is enforced with an atomic school counter. Rejected pending applications release a slot.

### Students
- Principal can register/admit students from **শিক্ষার্থী ভর্তি ও নিবন্ধন**.
- Face consent is recorded separately against a student. The signed consent evidence must actually exist and be verified by the school; entering a reference string alone is not proof of consent.
- Student promotion updates class, roll and academic year on the same Student document, retaining the existing Student `_id`.

### Central geography
- The school submits division, district and upazila during registration.
- The central options endpoint builds the dropdown values from approved school records; no separate manual import is needed.

## 7. API endpoints added

- `POST /api/schools/register` — public school/principal application (rate limited)
- `GET /api/schools/pending` — central office only
- `PATCH /api/schools/:id/review` — central office only
- `GET /api/schools/central/options` — central office only; dynamic geography and school list
- `GET /api/schools/central/list` — central office only; filtered school list
- `POST /api/auth/teacher-register` — public teacher application (rate limited)
- `GET /api/auth/teachers/pending` — principal only
- `PATCH /api/auth/teachers/:id/review` — principal only
- `POST /api/auth/login` — school login or central-office login (`centralOffice: true` for central accounts)

## 8. Important readiness limits

This phase implements account registration and approvals plus the principal student-registration surface. It is not yet a complete government deployment. Before a pilot, still complete and test:
- teacher-to-class assignment and class-scoped attendance access;
- actual face enrollment/attendance UI integration for the current uploaded Client;
- encrypted biometric storage and key migration (the current uploaded Server's StudentFace schema still stores the descriptor as a numeric array);
- append-only/tamper-evident audit history for edits and approvals;
- full attendance submission/central reporting API and integration tests;
- email/phone verification, deployment TLS, production rate-limit store, backup/restore drill, security review and load testing.

Do not claim the system is government-ready until those checks pass.
