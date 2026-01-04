# Debatrium: AI Agent Coding Instructions

**Debatrium** is a full-stack AI-powered document analysis platform that transforms PDFs into structured summaries and debate-style insights. This document guides AI agents on architecture, patterns, and workflows.

## Architecture Overview

Debatrium follows a **three-tier architecture** with clear separation of concerns:

- **Frontend** (React + Vite): Dashboard, authentication UI, PDF cards, AI-powered summary/debate views
- **Backend** (Node.js + Express): REST API, business logic, JWT auth, file handling, AI orchestration
- **Database** (MongoDB): Users, PDF metadata, session tokens
- **External Services**: Google Gemini API (AI analysis), Cloudinary (PDF storage), Nodemailer (email)

### Key Data Flow
1. **Upload**: User uploads PDF → Multer validates → Cloudinary stores → PDF text extracted → Metadata in MongoDB
2. **Analysis**: Text → Debate Gate service (schema validation) → Gemini API → Structured output
3. **Auth**: Login → JWT generated → Stored in httpOnly cookies → Passed in Authorization header

## Backend Patterns

### Error Handling: ApiError & ApiResponse
Located in [backend/utils/](backend/utils/) — **all endpoints MUST use these**:
- Throw `ApiError(statusCode, message, details?)` for errors
- Return `res.json(new ApiResponse(statusCode, data, message))` for success
- Error middleware catches thrown errors automatically

### Async Handler Wrapper
All route handlers use `asyncHandler()` from [backend/utils/asyncHandler.js](backend/utils/asyncHandler.js):
```javascript
export const signup = asyncHandler(async (req, res) => {
  // Errors thrown here are caught by middleware
});
```

### Authentication & Authorization
- [backend/middleware/authMiddleware.js](backend/middleware/authMiddleware.js): JWT verification, extracts user to `req.user`
- Tokens stored in httpOnly cookies + Authorization header as backup
- Protected routes import `verifyJwt` and add to middleware chain
- Special: `verifyOptionalJwt` for routes that work authenticated or anonymous

### Validation Patterns
- Email/password validation: [backend/regex/regexRules.js](backend/regex/regexRules.js)
- Schema validation in controllers (required fields, type checks) before DB operations
- Gemini responses validated for JSON schema in [backend/services/ai/debateGate.services.js](backend/services/ai/debateGate.services.js#L28-L40)

### Rate Limiting Strategy
[backend/middleware/rateLimiter.js](backend/middleware/rateLimiter.js) defines specialized limiters per route:
- `signupLimiter`, `loginLimiter`, `forgotPasswordLimiter` — prevent abuse
- `globalLimiter` applied at app level for all requests
- Configure in route definitions, not controller

## Frontend Patterns

### Auth Context (Single Source of Truth)
[frontend/src/context/AuthContext.jsx](frontend/src/context/AuthContext.jsx):
- Manages `user`, `isAuthenticated`, `loading` globally
- `fetchMe()` called once on app load to restore session from cookies
- Components import `useAuth()` hook — **never directly manage auth state**
- Logout clears user and removes tokens

### Protected & Public Routes
- [frontend/src/routes/ProtectedRoutes.jsx](frontend/src/routes/ProtectedRoutes.jsx): Redirects unauthenticated users
- [frontend/src/routes/PublicOnlyRoutes.jsx](frontend/src/routes/PublicOnlyRoutes.jsx): Redirects authenticated users (login/signup pages)

### API Communication
[frontend/src/api/axiosCongfig.js](frontend/src/api/axiosCongfig.js):
- Axios instance configured with base URL and credentials
- **Always use withCredentials: true** for authenticated requests to include cookies

### State & Hooks
- PDF list: [frontend/src/hooks/useMyPdfs.js](frontend/src/hooks/useMyPdfs.js) — custom hook for fetching user's PDFs
- Username validation: [frontend/src/hooks/usernameAvailibility.js](frontend/src/hooks/usernameAvailibility.js)
- Toast notifications via `react-hot-toast` for user feedback

## AI Pipeline

### Debate Gate Service
[backend/services/ai/debateGate.services.js](backend/services/ai/debateGate.services.js):
- Determines if extracted text is suitable for debate format
- Uses `loadPrompt()` to inject text into template at `{{TEXT}}`
- Returns schema: `{ isDebate, confidence, reason, detectedTopic }`
- **Critical**: Validate Gemini JSON output; clean markdown formatting first

### Prompt Management
Prompts stored as templates in [backend/services/ai/prompts/](backend/services/ai/prompts/):
- [counterDebate.prompt.txt](backend/services/ai/prompts/counterDebate.prompt.txt)
- [debateAnalysis.prompt.txt](backend/services/ai/prompts/debateAnalysis.prompt.txt)
- Use `{{TEXT}}` placeholder for injection

## Development Workflows

### Starting the Stack
```bash
# Backend (port 4000)
cd backend && npm run dev

# Frontend (port 5173)
cd frontend && npm run dev

# Docker (production simulation)
docker build -t debatrium . && docker run -p 80:80 debatrium
```

### Environment Variables Required
- **Backend**: `MONGODB_URI`, `GEMINI_API_KEY`, `JWT_SECRET`, `CLOUDINARY_*`, `SMTP_*`
- **Frontend**: Hardcoded to `localhost:4000` for dev — update for production

### Database Schema
[backend/models/User.js](backend/models/User.js):
- Methods: `generateAccessToken()`, `generateRefreshToken()`, `matchPassword()`, `generateTemporaryToken()`
- Password hashed with bcrypt on save; **never store plaintext**

[backend/models/pdf.model.js](backend/models/pdf.model.js):
- Links PDFs to users; stores Cloudinary references and extracted metadata

## Cross-Component Communication

### Email Service
[backend/mail/mailgen.js](backend/mail/mailgen.js):
- `sendEmail({ email, subject, mailgenContent })` wrapper around Nodemailer
- Content templates in [backend/mail/mailgencontent.js](backend/mail/mailgencontent.js)

### File Uploads
[backend/middleware/multer.middleware.js](backend/middleware/multer.middleware.js):
- Handles multipart/form-data validation
- [backend/controllers/upload.controller.js](backend/controllers/upload.controller.js) orchestrates Cloudinary operations

### PDF Text Extraction
[backend/utils/extractPdfText.js](backend/utils/extractPdfText.js):
- `pdf-parse` library extracts text from uploaded PDFs
- Called before sending text to Gemini

## Testing & Debugging

- **No unit tests yet** — focus on integration testing via API calls
- Use `console.log` sparingly (backend has logging in dev)
- Check browser console for frontend errors; backend logs to stdout
- Validate JSON responses match expected schemas before parsing

## Docker & Deployment

[Dockerfile](Dockerfile):
- Multi-stage build: frontend → build artifact; backend → runtime
- Frontend served via Nginx; backend as Node process on port 4000
- [nginx.conf](nginx.conf) proxies API calls to backend

## Project-Specific Conventions

1. **Barrel Exports**: [backend/utils/utilBarrel.js](backend/utils/utilBarrel.js) re-exports common utilities — import from barrel, not individual files
2. **Naming**: Routes are `camelCase`, models are `PascalCase`, utilities are `camelCase`
3. **HTTP Methods**: 
   - POST for creation/state changes
   - GET for retrieval
   - DELETE for removal
   - PATCH for partial updates
4. **Response Status Codes**: 201 for created, 200 for success, 4xx for client errors, 5xx for server errors
5. **JWT Expiry**: Access tokens short-lived (15m typical); refresh tokens in DB for validation

## Common Tasks

### Adding an API Endpoint
1. Create controller in [backend/controllers/](backend/controllers/) using `asyncHandler`
2. Define route in [backend/routes/](backend/routes/), add rate limiter if needed
3. Import route into [backend/app.js](backend/app.js)
4. Test with curl or frontend axios call with credentials

### Modifying AI Behavior
1. Edit prompt template in [backend/services/ai/prompts/](backend/services/ai/prompts/)
2. Test Gemini response schema in `debateGate.services.js`
3. Update response validation if schema changes

### Adding Frontend Pages
1. Create `.jsx` in [frontend/src/pages/](frontend/src/pages/)
2. Add route to router config (typically in main routing file)
3. Use `useAuth()` if needing user context
4. Fetch data via axios with `withCredentials: true`

## Known Limitations & Future Work

- **RAG not yet implemented** — currently sends full extracted text to Gemini
- **No vector embeddings** — planned for semantic search
- **Async job queue** — needed for large PDF processing
- **Tests absent** — focus on code quality and manual validation
