# Smart School BD — Integrated Development Package

এই প্যাকেজটি মূল Client ও Server ZIP-এর উপর ভিত্তি করে সমন্বিত Development Build।

## প্রকল্পের নীতি
- বিদ্যমান Client UI/UX রাখা হয়েছে; নতুন প্রয়োজনীয় পেজ একই Tailwind/রং/কম্পোনেন্ট ভাষায় যুক্ত।
- SMS/Notification module ও worker বাদ দেওয়া হয়েছে।
- Role: `teacher`, `school_admin` (প্রধান শিক্ষক), `central_office`।
- Teacher শুধুমাত্র Principal-বরাদ্দকৃত class/section-এ কাজ করতে পারে।
- Principal attendance session যাচাই করে `confirmed: true` দিয়ে submit করে।
- Central Office `/api/central/overview` এবং `/api/central/schools/:schoolId` দিয়ে কেন্দ্রীয় তথ্য পায়।
- নতুন Face Descriptor AES-256-GCM দিয়ে encrypted অবস্থায় সংরক্ষণ করা হয়। পুরোনো plaintext descriptor migration script দেওয়া আছে।

## Setup
### Server
1. `cd server`
2. `npm ci`
3. `.env.example` কপি করে `.env` তৈরি করো।
4. `MONGODB_URI`, `JWT_ACCESS_SECRET`, `CLIENT_URLS` সেট করো।
5. `FACE_DESCRIPTOR_ENCRYPTION_KEY` তৈরি করো:
   `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
6. `npm run dev`

### Client
1. `cd client`
2. `npm ci`
3. `.env.example` কপি করে `.env` তৈরি করো।
4. `VITE_API_BASE_URL=http://localhost:5000/api` সেট করো।
5. `npm run dev`

## গুরুত্বপূর্ণ
- `FACE_DESCRIPTOR_ENCRYPTION_KEY` হারালে encrypted face descriptor decrypt করা যাবে না। নিরাপদ backup ও key rotation policy প্রয়োজন।
- পুরোনো plaintext descriptor থাকলে আগে DB backup, তারপর dry-run:
  `npm run migrate:face-descriptors`
  ফলাফল যাচাই করে apply:
  `npm run migrate:face-descriptors -- --apply`
- Browser camera access production-এ HTTPS এবং localhost-এ অনুমোদিত।
- Face matching সম্ভাব্য মিল দেয়; শিক্ষককে পরিচয় নিশ্চিত করতে হয়।
- এই build-এ server-verified anti-spoof Liveness/PAD এখনো সম্পূর্ণ নয়। তাই Production/Government Pilot-এ ব্যবহারের আগে স্বাধীন PAD implementation, accuracy/bias evaluation, privacy/legal review ও security audit বাধ্যতামূলক।
- AuditEvent append-only application log; এটি cryptographically tamper-evident বা database-admin-proof নয়।
- দেশব্যাপী production scale, MongoDB transaction topology, indexes, backup/restore, monitoring, accessibility ও load testing আলাদাভাবে যাচাই করতে হবে।
