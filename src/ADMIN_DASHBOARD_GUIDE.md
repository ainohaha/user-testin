# Admin Dashboard Guide

## Accessing the Dashboard

1. **Navigate to the admin dashboard:**
   - Add `?admin=true` to your application URL
   - Example: `https://your-app-url.com?admin=true`

2. **Enter the password:**
   - Default password: `gamestop2024`
   - You can change this in `/App.tsx` (search for "gamestop2024")

## Dashboard Features

### Overview Statistics
- **Total Participants:** Count of all users who made meaningful progress (at least halfway through)
- **Completed:** Number of users who finished all sections
- **Abandoned:** Users who made it at least halfway but did not complete the test

Note: Participants who barely started (didn't reach demographics or tasks) are automatically filtered out to reduce dashboard clutter.

### Participant List
Each participant card shows:
- Unique Participant ID (e.g., P7A3F2B)
- Device type (Mobile, Tablet, or Desktop)
- Start and completion timestamps
- Status badge (Completed or Abandoned)
- Star marker (if flagged as important)
- Bucket assignment (if organized into buckets)

**Important:** Only participants who made it at least halfway through the test are shown. This includes anyone who completed:
- Demographics section, OR
- At least one task

Participants who only viewed the intro/consent or screening are automatically hidden to keep the dashboard focused on meaningful data.

### Viewing Participant Details
Click on any participant to expand their full session:

1. **AI-Generated Analysis** (for completed sessions)
   - Executive Summary: High-level overview of their experience
   - Key Findings: 4-6 significant insights from behavior and feedback
   - Key Moments: 3-5 specific notable interactions with timestamps
   - Pain Points: Usability problems encountered
   - Positive Highlights: Features that worked well
   - Recommendations: Actionable improvements

2. **Think-Aloud Transcripts**
   - Voice recordings transcribed for each task
   - Duration of each recording
   - Full text of participant's verbal feedback

3. **Recordings**
   - Audio files (voice recordings)
   - Screen recordings (if captured)
   - Associated transcripts

4. **Demographics**
   - Age, location, collector type
   - Selling experience

5. **Screening Responses**
   - Card collecting experience
   - Brand familiarity
   - App usage patterns

6. **Task Responses**
   - All 6 task flows with follow-up questions
   - Ratings, ease scores, feedback

7. **Survey Data**
   - Quantitative ratings (NPS, feature ratings)
   - Qualitative feedback
   - Wrap-up questions

## AI Analysis

### How It Works
- Analysis is generated on-demand using OpenAI GPT-4o
- Cross-references transcripts and survey responses
- Stored for future viewing (generates once)
- Focuses on actionable UX insights

### Generating Analysis
1. Expand a completed participant session
2. Click "Generate Analysis" button
3. Wait 10-30 seconds for AI processing
4. Analysis is permanently stored and instantly viewable next time

### Requirements
- OpenAI API key must be configured in environment variables
- Only works for completed sessions (not abandoned)

## Data Export

### Export All Participants (CSV)
- Click "Export CSV" button in header
- Downloads: participant ID, IP, timestamps, demographics
- Useful for spreadsheet analysis

### Export Individual Participant (JSON)
- Click "Export" button next to any completed participant
- Downloads full session data including transcripts
- Format: JSON for programmatic analysis

## Tips

1. **Refresh Data:** Click the "Refresh" button to get latest participant submissions
2. **Monitor in Real-Time:** Refresh periodically to see new completions
3. **Analysis Best Practices:** Generate analysis after test completion for comprehensive insights
4. **Key Moments:** Pay special attention to key moments - they highlight critical UX issues
5. **Cross-Reference:** Use AI insights alongside raw transcripts for full context

## Troubleshooting

**No participants showing:**
- Verify participants have started the test
- Check that they're accessing the main app (without `?admin=true`)
- Click Refresh button

**AI analysis fails:**
- Ensure OpenAI API key is configured
- Check browser console for error messages
- Verify participant has completed the session

**Can't access dashboard:**
- Ensure URL includes `?admin=true`
- Use correct password: `gamestop2024`
- Clear browser cache if issues persist

## Data Privacy

- All data is stored in Supabase database
- IP addresses used only for duplicate prevention
- Participant IDs are randomly generated
- Audio/screen recordings stored securely in private storage bucket
- AI analysis happens server-side, no data sent to client unnecessarily

## Next Steps

After collecting usability test data:
1. Review AI analysis for each participant
2. Look for patterns across multiple sessions
3. Prioritize issues by frequency and severity
4. Use recommendations to guide design iterations
5. Export data for detailed reporting
