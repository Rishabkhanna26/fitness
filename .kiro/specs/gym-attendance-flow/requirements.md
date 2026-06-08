# Requirements Document

## Introduction

This feature adds a QR-code-based gym attendance system to the existing Next.js + Supabase gym CRM. A permanent QR code placed inside the gym links to `/checkin`. Members scan it to generate a short-lived 4-character alphanumeric code, then enter that code on their dashboard (`/member`) to mark their attendance. The flow handles both already-logged-in members and members who need to authenticate via mobile number at the check-in page. A reward milestone notification is shown when a visit count matches a loyalty offer threshold.

## Glossary

- **Check-In_Page**: The `/checkin` page reachable by scanning the gym's permanent QR code.
- **Attendance_Code**: A 4-character uppercase alphanumeric code (e.g. `A7K9`) that is valid for 2 minutes and may only be used once.
- **Attendance_Codes_Table**: The `attendance_codes` Supabase table storing `member_id`, `code`, `created_at`, `expires_at`, and `used`.
- **Attendance_Table**: The existing `attendance` Supabase table with a unique constraint on `(member_id, attendance_date)`.
- **Member_Dashboard**: The `/member` page where a logged-in member views their profile and marks attendance.
- **Code_Generator**: The backend service (Next.js API route) responsible for creating Attendance_Codes.
- **Code_Verifier**: The backend service (Next.js API route) responsible for validating and redeeming an Attendance_Code.
- **Mobile_Auth_Flow**: The unauthenticated path on the Check-In_Page where a member supplies their mobile number to identify their account and receive an Attendance_Code.
- **Session**: The `fit_session` cookie holding a base64url-encoded JSON object with `role`, `memberId`, and `name`.
- **Loyalty_Offer**: A row in the `loyalty_offers` table defining a visit milestone and the corresponding renewal discount reward.
- **Visit_Milestone**: A total visit count value at which a Loyalty_Offer reward is triggered.
- **Countdown_Timer**: A 2-minute on-screen timer shown alongside an Attendance_Code.
- **QR_Scan_Flag**: A short-lived server-set cookie (`qr_scanned=1`) that is created only when the member arrives at `/checkin` via the gym's QR code. It expires after 2 minutes and is checked by the Check-In_Page before allowing Attendance_Code generation.
- **Scan_Entry_Route**: The URL embedded in the gym's physical QR code, which is `/checkin?scan=1` (or a dedicated redirect endpoint). Visiting this URL causes the server to set the QR_Scan_Flag cookie and then redirect or render the Check-In_Page.

---

## Requirements

### Requirement 1: Check-In Page Routing

**User Story:** As a gym member, I want to open a single URL by scanning the gym's QR code, so that I can start the attendance check-in process from my phone without knowing the app's internal structure.

#### Acceptance Criteria

1. THE Check-In_Page SHALL be accessible at the path `/checkin`.
2. WHEN a member with a valid Session visits `/checkin`, THE Check-In_Page SHALL skip the Mobile_Auth_Flow and proceed directly to Attendance_Code generation.
3. WHEN a member without a valid Session visits `/checkin`, THE Check-In_Page SHALL display the Mobile_Auth_Flow.
4. THE Check-In_Page SHALL NOT redirect unauthenticated visitors to `/login`; it SHALL handle authentication inline.
5. THE gym's physical QR code SHALL encode the URL `/checkin?scan=1` (the Scan_Entry_Route) so that every real QR scan carries the scan parameter required to set the QR_Scan_Flag.

---

### Requirement 2: Mobile Auth Flow (Unauthenticated Check-In)

**User Story:** As a gym member who is not logged in, I want to identify myself with my mobile number on the check-in page, so that I can generate an attendance code without needing my full login credentials.

#### Acceptance Criteria

1. WHEN an unauthenticated member opens the Check-In_Page, THE Check-In_Page SHALL display a mobile number input field and a "Get Code" button.
2. WHEN the member submits a mobile number, THE Mobile_Auth_Flow SHALL search the `members` table for a record with a matching `phone` value.
3. IF no member record matches the submitted mobile number, THEN THE Mobile_Auth_Flow SHALL display the error message "Mobile number not registered. Please contact the gym."
4. WHEN a matching member record is found, THE Mobile_Auth_Flow SHALL proceed to Attendance_Code generation for that member without creating a persistent Session cookie.

---

### Requirement 3: Attendance Code Generation

**User Story:** As a gym member, I want to receive a unique short code immediately after identifying myself, so that I can quickly mark my attendance on the dashboard.

#### Acceptance Criteria

1. WHEN Attendance_Code generation is triggered for a member, THE Code_Generator SHALL create a 4-character uppercase alphanumeric code containing only characters from the set `[A-Z0-9]`.
2. THE Code_Generator SHALL store the Attendance_Code in the Attendance_Codes_Table with `member_id`, `code`, `created_at`, `expires_at` set to `NOW() + 2 minutes`, and `used` set to `false`.
3. THE Code_Generator SHALL ensure the generated `code` value is unique among all rows in the Attendance_Codes_Table where `used = false` and `expires_at > NOW()`.
4. WHEN a new Attendance_Code is successfully stored, THE Code_Generator SHALL return the `code` and `expires_at` values to the client.
5. IF the Attendance_Codes_Table insertion fails, THEN THE Code_Generator SHALL return an error response with HTTP status 500 and a human-readable message.

---

### Requirement 4: Code Display with Countdown Timer

**User Story:** As a gym member, I want to see my attendance code with a live countdown, so that I know how much time I have before it expires.

#### Acceptance Criteria

1. WHEN an Attendance_Code is received by the client, THE Check-In_Page SHALL display the 4-character code in a large, clearly readable format.
2. THE Check-In_Page SHALL display a Countdown_Timer counting down from 2 minutes to zero using the `expires_at` value returned by the Code_Generator.
3. WHILE the Countdown_Timer is running, THE Check-In_Page SHALL update the displayed remaining time every second.
4. WHEN the Countdown_Timer reaches zero, THE Check-In_Page SHALL display an expiry message (e.g. "Code expired. Tap to generate a new one.") and offer a button to generate a new Attendance_Code.
5. THE Check-In_Page SHALL NOT automatically generate a new Attendance_Code after expiry; a member action SHALL be required.

---

### Requirement 5: Today's Attendance Section on Member Dashboard

**User Story:** As a gym member, I want a dedicated section on my dashboard to enter my attendance code, so that I can mark my attendance in one place without navigating elsewhere.

#### Acceptance Criteria

1. THE Member_Dashboard SHALL display a "Today's Attendance" section containing a text input field and a "Mark Attendance" button ONLY WHEN a valid, unexpired, unused Attendance_Code exists in the Attendance_Codes_Table for the logged-in member (i.e. `member_id` matches, `used = false`, and `expires_at > NOW()`).
2. WHEN no valid unexpired Attendance_Code exists for the logged-in member (either none was generated or all have expired/been used), THE Member_Dashboard SHALL display only the member's attendance statistics (last visit, total visits, this month) without a code-entry field.
3. WHEN today's attendance has already been marked for the logged-in member, THE Member_Dashboard SHALL display a confirmation message (e.g. "Attendance marked for today ✓") in place of the input field and button, regardless of whether a valid code exists.
4. THE Member_Dashboard SHALL determine whether today's attendance is already marked by querying the Attendance_Table for a row matching the member's `id` and today's date on initial page load.
5. THE Member_Dashboard SHALL determine whether a valid unexpired Attendance_Code exists by querying the Attendance_Codes_Table for a row matching `member_id`, `used = false`, and `expires_at > NOW()` on initial page load.

---

### Requirement 6: Attendance Code Verification and Redemption

**User Story:** As a gym member, I want my submitted code to be fully validated before my attendance is recorded, so that invalid, expired, or already-used codes are rejected.

#### Acceptance Criteria

1. WHEN a member submits a code via the "Mark Attendance" button, THE Code_Verifier SHALL check that a row exists in the Attendance_Codes_Table with the submitted `code` value.
2. WHEN the code exists, THE Code_Verifier SHALL verify that the `member_id` on the Attendance_Code row matches the `memberId` from the member's Session.
3. WHEN the member_id matches, THE Code_Verifier SHALL verify that `expires_at > NOW()`.
4. WHEN the code is not expired, THE Code_Verifier SHALL verify that `used = false`.
5. WHEN all prior verifications pass, THE Code_Verifier SHALL verify that no row exists in the Attendance_Table with the same `member_id` and today's server-side `attendance_date` (enforcing the one-attendance-per-day rule; this check is also backed by the unique constraint on `(member_id, attendance_date)` at the database level).
6. IF any verification in criteria 1–5 fails, THEN THE Code_Verifier SHALL return an HTTP 400 response with one of the following distinct error messages:
   - "Invalid code." (code not found)
   - "This code does not belong to your account." (member_id mismatch)
   - "Code has expired. Please generate a new one." (expired)
   - "Code has already been used." (used = true)
   - "Attendance already marked for today." (duplicate attendance)
7. WHEN all verifications pass, THE Code_Verifier SHALL insert a row into the Attendance_Table with `member_id`, `attendance_date` set to the server-side current date in the gym's configured timezone (never a client-supplied value), and `status` set to `"Present"`.
8. WHEN the Attendance_Table row is inserted, THE Code_Verifier SHALL update the Attendance_Code row in the Attendance_Codes_Table by setting `used = true`.
9. THE Code_Verifier SHALL perform steps 7 and 8 atomically such that a partial success (attendance inserted but code not marked used, or vice versa) does not persist.

---

### Requirement 7: Visit Count and Reward Milestone

**User Story:** As a gym member, I want to see a congratulations message when I reach a visit milestone, so that I feel recognised for my consistency and know what reward I have unlocked.

#### Acceptance Criteria

1. WHEN attendance is successfully marked, THE Code_Verifier SHALL retrieve the member's current total visit count from the `members` table (`total_visits` column, or count of `Present` rows in the Attendance_Table if `total_visits` is null).
2. WHEN the total visit count is retrieved, THE Code_Verifier SHALL increment it by 1 and return the updated value in the success response.
3. WHEN the success response is received by the client, THE Member_Dashboard SHALL check the updated visit count against all active Loyalty_Offer records whose `interval_value` matches the updated visit count when `interval_unit = 'visits'`.
4. IF the updated visit count equals a Visit_Milestone defined by an active Loyalty_Offer, THEN THE Member_Dashboard SHALL display a congratulations modal with the message: "You've completed [N] visits. [Offer Title] Unlocked!"
5. WHERE the Loyalty_Offer `offer_type` is `"percentage"`, THE Member_Dashboard SHALL include the text "[amount]% Membership Renewal Discount Unlocked" in the congratulations modal.
6. WHERE the Loyalty_Offer `offer_type` is `"fixed"`, THE Member_Dashboard SHALL include the text "₹[amount] Membership Renewal Discount Unlocked" in the congratulations modal.
7. WHEN no Visit_Milestone is matched, THE Member_Dashboard SHALL display only a standard success message (e.g. "Attendance marked successfully!") without a modal.

---

### Requirement 8: Middleware and Route Protection

**User Story:** As a system operator, I want the `/checkin` route to be publicly accessible while all other protected routes remain secure, so that members can scan and check in without logging in first.

#### Acceptance Criteria

1. THE middleware SHALL permit unauthenticated requests to `/checkin` (with or without query parameters, including `?scan=1`) without redirecting to `/login`.
2. THE middleware SHALL continue to protect all existing admin and member routes according to the current access-control rules.
3. WHEN an authenticated member with `role = "member"` navigates to `/checkin`, THE middleware SHALL NOT redirect the member away from `/checkin`.
4. WHEN a request arrives at the Scan_Entry_Route (`/checkin?scan=1`), THE middleware (or the `/checkin` route handler) SHALL set the QR_Scan_Flag cookie (`qr_scanned=1`) with an `HttpOnly`, `SameSite=Strict` attribute and a `Max-Age` of 120 seconds (2 minutes), then allow the request to proceed to the Check-In_Page.
5. THE middleware SHALL NOT set the QR_Scan_Flag cookie for requests to `/checkin` that do not include the `scan=1` query parameter.

---

### Requirement 9: New Database Table — attendance_codes

**User Story:** As a developer, I want the `attendance_codes` table to exist in Supabase with the correct schema, so that the Code_Generator and Code_Verifier can persist and query codes reliably.

#### Acceptance Criteria

1. THE Attendance_Codes_Table SHALL contain the columns: `id` (UUID primary key), `member_id` (UUID, foreign key to `members.id`, on delete cascade), `code` (text, not null), `created_at` (timestamptz, default now()), `expires_at` (timestamptz, not null), `used` (boolean, default false, not null).
2. THE Attendance_Codes_Table SHALL have an index on `code` to support fast lookup during verification.
3. THE Attendance_Codes_Table SQL definition SHALL be added to `supabase-schema.sql` so the schema remains the single source of truth for the database structure.

---

### Requirement 10: QR Scan Enforcement

**User Story:** As a gym operator, I want the check-in flow to only work when a member physically scans the QR code at the gym, so that members cannot mark attendance by typing or pasting the URL from outside the gym.

#### Acceptance Criteria

1. WHEN a member visits `/checkin` without the QR_Scan_Flag cookie present, THE Check-In_Page SHALL NOT generate or display an Attendance_Code; it SHALL display the message "Please scan the QR code at the gym to check in." instead.
2. WHEN a member visits `/checkin` without the QR_Scan_Flag cookie present, THE Check-In_Page SHALL NOT display the Mobile_Auth_Flow or any code-generation UI; only the informational message SHALL be shown.
3. WHEN a request arrives at the Scan_Entry_Route (`/checkin?scan=1`), THE server SHALL set the QR_Scan_Flag cookie (`qr_scanned=1`) with `HttpOnly`, `SameSite=Strict`, and `Max-Age=120` before rendering or redirecting to the Check-In_Page.
4. WHEN the QR_Scan_Flag cookie is present and valid (not expired), THE Check-In_Page SHALL proceed with the normal authentication and code-generation flow as defined in Requirements 1–4.
5. IF a member submits their mobile number or requests code generation while the QR_Scan_Flag cookie is absent, THEN THE Code_Generator SHALL return an HTTP 403 response with the message "QR scan required. Please scan the gym QR code to proceed."
6. THE QR_Scan_Flag cookie SHALL expire after 120 seconds from the time it is set, matching the Attendance_Code validity window, so that a single QR scan cannot be reused indefinitely.
