BAG BEN BACKEND

WHAT THIS ADDS
- Admin dashboard
- Add products with images
- Remove products
- Product data saved in data/store.json
- Uploaded images saved in uploads/
- Store settings
- Customer order API
- Order management/status
- Existing frontend remains in index.html
- Existing chatbot/search/price filters remain

REQUIREMENT
Install Node.js 18+ from the official Node.js website.

RUN ON WINDOWS
1. Extract this folder.
2. Open the BAG_BEN folder.
3. Double-click START_BAG_BEN.bat.
4. Wait for "BAG BEN running at http://localhost:3000".
5. Open http://localhost:3000
6. Admin dashboard: http://localhost:3000/admin.html

DEFAULT ADMIN KEY
bagben-admin-2026

IMPORTANT
Change the ADMIN_KEY environment variable before putting the store online.
For example in Command Prompt:
set ADMIN_KEY=your-private-key
node server.js

This is a local backend starter. For public production hosting, use HTTPS, a real database, authentication, and proper payment integration.
