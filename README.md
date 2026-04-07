# ICRB Portal

Official portal for the International Committee of Roblox Businesses.

Files included:

- `index.html`
- `portal.html`
- `styles.css`
- `firebase.js`
- `ui.js`
- `auth.js`
- `business.js`
- `employees.js`
- `app.js`
- `portal.js`

Current structure:

- `index.html` is the secure login and first-run owner bootstrap page.
- `portal.html` is the authenticated dashboard.
- Business records are stored in the `businesses` collection.
- Employee records are stored in the `employees` collection.
- Bootstrap and member identity records are stored in `settings`, `members`, and `auditLogs`.

Important notes:

- The Firestore reserved `__init__` issue has been fixed by using `_init`.
- This is designed for GitHub Pages plus Firebase.
- After initial owner bootstrap, rotate the bootstrap key and tighten Firebase rules.