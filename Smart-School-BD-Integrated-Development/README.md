# Smart School BD — Integrated Development Build

এই প্যাকেজে Client, Server এবং বাংলা Setup/Testing Guide একসঙ্গে আছে।

## Included
- Original Client UI/UX ভিত্তি রেখে Teacher Attendance, Face Registration, Class Assignment, Principal Verification, Central Monitoring ও Audit UI/API সংযোজন।
- SMS/notification workflow সম্পূর্ণ বাদ।
- Teacher class assignment enforcement, principal-only attendance submission confirmation, central office monitoring endpoints।
- Face Descriptor AES-256-GCM encryption at rest, consent revoke/delete flow, migration script।
- Camera model assets (`server/public/vendor` এবং `server/public/models`)।

## Important status
এটি একটি **Integrated Development / Test Candidate**, Production Release নয়।
- Server JavaScript syntax checks: pass
- Client JSX syntax parse: pass
- Local import path checks: pass
- AES-256-GCM round-trip and tamper test: pass
- Full `npm ci` / Vite production build and live MongoDB integration were not completed in this environment.
- Server-verified anti-spoof Liveness/PAD is not implemented to production standard. Do not use real student biometric data or deploy for a government pilot until the documented security, privacy, PAD, accuracy and load tests pass.

Read `docs/README-BN.md` and `docs/TESTING-GUIDE-BN.md` before setup.
