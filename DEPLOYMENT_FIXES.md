# Vercel Deployment Fixes Summary

## Issues Fixed

### 1. ✅ Created Missing `/api/create_design.js` Endpoint
- **Problem**: Workflows were calling `/api/create_design` but this endpoint didn't exist
- **Solution**: Created `api/create_design.js` that wraps the existing `/agent/command` endpoint
- **Location**: `api/create_design.js`

### 2. ✅ Fixed Workflow Path in `vercel.json`
- **Problem**: `vercel.json` had incorrect path `"workflow/**/*.js"` (singular)
- **Solution**: Changed to `"workflows/**/*.js"` (plural) to match actual directory
- **Location**: `vercel.json` line 8-10

### 3. ✅ Removed Duplicate Workflow Implementation
- **Problem**: Two workflow files existed: `canva-template-generator.js` and `canva-template.js`
- **Solution**: Kept `canva-template-generator.js` (more complete implementation), removed `canva-template.js`
- **Location**: Deleted `workflows/canva-template.js`

## Files Modified

1. **api/create_design.js** (NEW)
   - Wraps `/agent/command` endpoint for workflow compatibility
   - Handles POST requests with name, width, height parameters
   - Returns design data from Canva API

2. **vercel.json** (MODIFIED)
   - Fixed workflows path: `"workflow/**/*.js"` → `"workflows/**/*.js"`
   - Added workflows section back to configuration

3. **workflows/canva-template.js** (DELETED)
   - Removed duplicate implementation

## Required Environment Variables for Vercel

Before deploying, configure these environment variables in your Vercel project settings:

### Required for Workflows:
- `WORKFLOW_VERCEL_AUTH_TOKEN` - Your Vercel API token
- `WORKFLOW_VERCEL_PROJECT` - Your Vercel project ID
- `WORKFLOW_VERCEL_TEAM` - Your Vercel team ID (optional if personal account)
- `WORKFLOW_VERCEL_ENV` - Environment (e.g., "production", "preview")

### Required for Canva Integration:
- `CANVA_CLIENT_ID` - Your Canva app client ID
- `CANVA_CLIENT_SECRET` - Your Canva app client secret
- `CANVA_REDIRECT_URI_PROD` - Production callback URL (e.g., `https://your-app.vercel.app/callback`)
- `CANVA_ACCESS_TOKEN` - (Optional) If using static tokens

## Deployment Steps

1. **Configure Environment Variables**
   - Go to your Vercel project dashboard
   - Navigate to Settings > Environment Variables
   - Add all required variables listed above

2. **Deploy**
   ```bash
   git add .
   git commit -m "Fix deployment issues: add create_design endpoint, fix workflow path, remove duplicate workflow"
   git push origin main
   ```

3. **Verify Deployment**
   - Check that workflows appear in Vercel Dashboard > Workflows tab
   - Test the endpoint: `POST /api/create_design` with JSON body:
     ```json
     {
       "name": "Test Banner",
       "width": 1200,
       "height": 600
     }
     ```

## Testing the Workflow

You can test your workflow by calling:
```bash
curl -X POST https://your-app.vercel.app/api/start-workflow \
  -H "Content-Type: application/json" \
  -d '{"name": "My Banner", "width": 1200, "height": 600}'
```

## Current Project Structure

```
c:/Users/Benjamin/Desktop/canva-backend/
├── api/
│   ├── create_design.js       ✅ NEW
│   ├── index.js
│   ├── server.js
│   └── start-workflow.js
├── workflows/
│   └── canva-template-generator.js  ✅ KEPT
├── package.json
├── vercel.json                ✅ FIXED
└── tokens.json
```

## Workflow Implementation Details

The remaining workflow (`canva-template-generator.js`):
- Uses the "use workflow" directive required by Vercel
- Accepts input: `{ name, width, height }`
- Calls the new `/api/create_design` endpoint
- Returns the created design data
- Includes a 2-second delay for UI visibility

## Notes

- The `workflow` package is on a beta version (4.0.1-beta.11). Consider updating when stable versions are available.
- The API now properly handles both local development and Vercel deployment environments.
- All tokens are handled safely with read-only file system checks on Vercel.