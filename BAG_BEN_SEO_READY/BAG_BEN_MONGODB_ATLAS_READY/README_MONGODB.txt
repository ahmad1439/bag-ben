BAG BEN — MongoDB-ready backend

WHAT CHANGED
- Products are stored in MongoDB Atlas.
- Orders are stored in MongoDB Atlas.
- Store settings are stored in MongoDB Atlas.
- The first successful startup automatically imports the existing data/store.json once.
- Existing frontend/API endpoints are preserved.
- Stock is reduced transactionally when an order is placed.
- /api/health checks the database connection.
- .env is used for secrets and is not included in this package.

SETUP
1. Open Command Prompt in this BAG_BEN folder.
2. Run: npm install
3. Create a file named .env (not .env.txt).
4. Put your private MongoDB connection string in MONGODB_URI.
5. Set MONGODB_DB=bagben
6. Keep ADMIN_KEY equal to your current admin key, or choose a new one.
7. Run: node server.js
8. Open http://localhost:3000
9. Check http://localhost:3000/api/health — it should report database MongoDB Atlas and ok true.

IMPORTANT
- Do not send or publish your .env file.
- Do not put MONGODB_URI in frontend JavaScript.
- Local product images are still stored in /uploads for this local build. For a fully online deployment, images must be moved to persistent cloud storage (or an appropriate Netlify storage solution) before relying on uploads in production.
- MongoDB Atlas alone does NOT keep the backend running after you close the terminal. The next deployment stage is to host the Node.js backend/API online and point the Netlify frontend at it.
