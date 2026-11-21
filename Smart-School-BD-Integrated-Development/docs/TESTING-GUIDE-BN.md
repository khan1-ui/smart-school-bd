# ধাপে ধাপে Test Plan

## 0. Test Environment
- Production database ব্যবহার করবে না।
- আলাদা test school, teacher, principal ও central office account তৈরি করো।
- অন্তত দুইটি test school রাখো, tenant isolation যাচাইয়ের জন্য।
- শিক্ষার্থীদের আসল biometric data ব্যবহার করবে না; সম্মতিপ্রাপ্ত test volunteers ছাড়া Face Test করবে না।
- Browser camera test HTTPS বা localhost-এ করো।

## 1. Face Registration
1. Principal হিসেবে login।
2. একটি test student তৈরি।
3. guardian consent record তৈরি; evidence reference বাস্তব নথির সঙ্গে মিলিয়ে যাচাই।
4. Face Registration modal খুলে camera permission দাও।
5. তিনটি capture সম্পন্ন করে save।
6. `/api/face/status?studentIds=...` দিয়ে শুধু status দেখো; descriptor ফেরত আসা উচিত নয়।
7. একই student আবার enroll করলে 409 প্রত্যাশিত।
8. consent revoke করলে encrypted descriptor ও legacy descriptor মুছে গেছে কিনা DB-তে যাচাই।
9. Encryption key না থাকলে enrollment fail-closed হয় কিনা যাচাই।

## 2. Teacher Class Assignment
1. Principal একজন active teacher অনুমোদন করবেন।
2. Class/section-এ active student থাকতে হবে।
3. Principal assignment তৈরি করবেন।
4. Teacher `/api/assignments`-এ কেবল নিজের assignment দেখবেন।
5. অন্য স্কুলের teacher/student ID দিয়ে assignment চেষ্টা করলে reject হতে হবে।

## 3. Teacher Attendance
1. Teacher login করে assigned class নির্বাচন।
2. আজকের session তৈরি/পুনরুদ্ধার।
3. Camera চালু করে Face scan।
4. Possible match দেখা গেলে শিক্ষক নিজে পরিচয় নিশ্চিত করবেন।
5. Confirm করলে উপস্থিতি রেকর্ড হবে।
6. Duplicate scan করলে duplicate record তৈরি হবে না।
7. অনুপস্থিত শিক্ষার্থীকে manual absent mark করো।
8. অন্য class-এর student শনাক্ত/মার্ক করার চেষ্টা reject হতে হবে।

## 4. Principal Verification & Submission
1. Principal আজকের session list দেখবেন।
2. Validation-এ সব active student record থাকা চাই।
3. একটি student record বাদ থাকলে submit reject হবে।
4. Principal confirmation checkbox ছাড়া submit reject হবে।
5. Submit সফল হলে session status `submitted` হবে এবং submitter/time সংরক্ষিত থাকবে।
6. Teacher submit endpoint ব্যবহার করতে পারবে না।

## 5. Central Monitoring
1. Central Office login।
2. `/api/central/overview` call।
3. date, school count, active student count, session count ও attendance counts যাচাই।
4. `/api/central/schools/:schoolId` দিয়ে school detail যাচাই।
5. non-central account দিয়ে endpoint access করলে 403 প্রত্যাশিত।

## 6. Security / Privacy
- Cross-school access tests।
- Role escalation tests।
- Face descriptor encryption/tamper test।
- Revoked consent blocks future matching।
- No biometric descriptor in normal API response or logs।
- CORS allowlist পরীক্ষা।
- HTTPS, secure deployment secrets, backup encryption ও access logging।
- Liveness/PAD: এই package-এ সম্পূর্ণ নয়; spoof tests pass না করা পর্যন্ত production approval নয়।

## 7. Final Regression
- Auth, school registration/approval, teacher approval, student create/update, consent, face registration, assignments, attendance, submission, central dashboard।
- Duplicate and concurrent attendance requests।
- MongoDB transaction behavior on replica set.
- Mobile Android Chrome, iOS Safari, desktop Chrome।
- Poor network, permission denied, camera unavailable, model load failure।
- `npm ci`, `npm run build` (client), server syntax and API tests।
- Server-এর standalone crypto test: `npm run test:face-crypto`।
