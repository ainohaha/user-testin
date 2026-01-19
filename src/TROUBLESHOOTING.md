# Admin Dashboard Troubleshooting Guide

## Issue: "Nothing shows on the admin side"

### Step 1: Verify You're Accessing Admin Mode
1. Your URL should look like: `https://your-app.com/?admin=true`
2. Make sure the `?admin=true` parameter is included
3. Check the browser console (F12) for this log: `"App.tsx useEffect - admin param: true"`

### Step 2: Check Password Screen
1. You should see a password prompt screen
2. The screen should say "Admin Access" at the top
3. If you don't see this, check the console for errors

### Step 3: Enter Password
1. Password: `gamestop2024` (all lowercase, no spaces)
2. Press Enter or click "Access Dashboard"
3. Check console for: `"Password correct, setting isAdmin to true"`

### Step 4: Check If Dashboard Renders
1. After entering the password, you should see the Admin Dashboard
2. Check console for: `"Rendering AdminDashboard component"`
3. You should see a yellow "Debug Info" bar at the top

### Step 5: Check Debug Info
1. Click on "Debug Info (Click to expand)" at the top of the page
2. Verify:
   - **Project ID**: Should be a valid Supabase project ID
   - **Loading**: Should change from "Yes" to "No"
   - **Error**: Should be "None" (or show specific error)
   - **Participants Count**: Number of participants
   - **API URL**: Should be a valid URL

### Step 6: Check Console Logs
Open browser console (F12) and look for:

**When page loads:**
```
App.tsx useEffect - admin param: true
Admin mode detected, showing password prompt
```

**After entering password:**
```
Attempting admin login...
Password entered: 12 characters
Password correct, setting isAdmin to true
Rendering AdminDashboard component
```

**When dashboard loads:**
```
Fetching participants from server...
Project ID: xxxxxxxxxxxxx
Fetch URL: https://xxxxx.supabase.co/functions/v1/make-server-b0f3b375/admin/participants
Response status: 200
Response OK: true
Participants data: {participants: Array(0)}
Number of participants: 0
```

### Common Issues & Solutions

#### Issue: Password screen doesn't appear
**Problem:** URL missing `?admin=true`
**Solution:** Add `?admin=true` to your URL

#### Issue: "Incorrect password" error
**Problem:** Password typed incorrectly
**Solution:** Type exactly: `gamestop2024` (all lowercase)

#### Issue: Dashboard shows but says "No participants"
**Possible reasons:**
1. **No one has started the test yet**
   - Solution: Have someone access the app WITHOUT `?admin=true`
   - Or click "Create Test Participant" button in the dashboard

2. **Database connection issue**
   - Check console for errors
   - Verify Supabase credentials are configured
   - Check the API URL in Debug Info

3. **Server not running**
   - Check console for network errors
   - Verify Supabase Edge Function is deployed

#### Issue: Error message appears
**Check the error message in:**
1. Red alert box on the page
2. Browser console (F12)
3. Debug Info section

**Common errors:**
- `Failed to fetch` → Network issue or server down
- `404` → API endpoint not found (check server deployment)
- `500` → Server error (check server logs)

### Testing the Connection

#### Create a Test Participant
1. Click "Create Test Participant" button in the dashboard header
2. This will create a dummy participant in the database
3. Click "Refresh" to see it appear
4. If this works, your database connection is fine

#### Check Server Health
1. Open this URL in a new tab:
   ```
   https://YOUR-PROJECT-ID.supabase.co/functions/v1/make-server-b0f3b375/health
   ```
2. You should see: `{"status":"ok"}`
3. If you get an error, the server isn't running

### Get Detailed Logs

#### Frontend Logs
1. Open browser console (F12)
2. Go to Console tab
3. Look for logs starting with:
   - "App.tsx useEffect"
   - "Fetching participants"
   - "Response status"
   - "Error fetching"

#### Server Logs (if you have access)
1. Go to Supabase Dashboard
2. Navigate to Edge Functions
3. Click on "make-server-b0f3b375"
4. Check the Logs tab
5. Look for:
   - "Admin participants endpoint called"
   - "Raw participants from KV"
   - Any error messages

### OpenAI API Quota Error

#### Issue: "OpenAI API quota exceeded" or "insufficient_quota"

**What this means:**
- The OpenAI API key has run out of credits
- This ONLY affects the AI analysis feature
- All other features work normally

**What still works:**
✅ Admin dashboard access
✅ Viewing all participant data
✅ Accessing transcripts and recordings
✅ Exporting data to CSV/JSON
✅ All survey responses and demographics
✅ Task completion data

**What doesn't work:**
❌ AI-generated analysis and insights

**Solutions:**

**Option 1: Continue without AI Analysis (Recommended)**
- The app works fully without AI analysis
- You can manually review all participant data
- All transcripts and responses are accessible
- Simply don't click "Generate AI Analysis" button

**Option 2: Add OpenAI Credits**
1. Go to https://platform.openai.com/account/billing
2. Add credits to your account ($5-10 is usually enough)
3. Wait a few minutes for quota to refresh
4. Try generating analysis again

**Option 3: Update API Key**
1. Create a new OpenAI API key at https://platform.openai.com/api-keys
2. Update the `OPENAI_API_KEY` environment variable
3. Restart the application

See `OPENAI_SETUP.md` for detailed instructions.

### Still Not Working?

**Collect this information:**
1. Full URL you're using
2. Screenshot of the page
3. Console logs (copy all text from console)
4. Debug Info (expand and screenshot)
5. Any error messages

**Then:**
- Check if Supabase project is active
- Verify environment variables are set
- Make sure Edge Function is deployed
- Try refreshing the page (Ctrl+R)
- Try in an incognito window
- Try a different browser
