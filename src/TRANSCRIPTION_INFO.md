# Audio Transcription Guide

## Important: OpenAI Credits Required

⚠️ **Transcription requires an OpenAI account with available credits.**

- If you see a "quota exceeded" error, you need to add credits to your OpenAI account
- See **OPENAI_QUOTA_FIX.md** for detailed instructions
- Quick fix: Go to https://platform.openai.com/account/billing and add $5-10 in credits

## How It Works

The usability testing app now automatically transcribes audio recordings using OpenAI's Whisper API.

### Flow:
1. **Participant completes a task** → Audio is recorded locally
2. **Task ends** → Audio file is uploaded to server
3. **Server receives audio** → Automatically sends to OpenAI Whisper API
4. **Whisper transcribes** → Returns text transcript
5. **Server stores** → Saves transcript with recording metadata
6. **Admin dashboard** → Displays transcript alongside audio/video

## Testing Transcription

### 1. Complete a New Task:
- Start the test application
- Grant microphone and screen permissions
- **Speak clearly while completing a task**
- The recording banner will show at the top
- Complete the task

### 2. Check Server Logs:
Open your browser console and look for these messages:
```
🎤 Starting audio transcription with Whisper API...
   Audio buffer size: XXXXX bytes
📤 Sending request to Whisper API...
✅ Transcription complete: XXX characters
📝 Transcript preview: [first 150 characters of transcript]
💾 Storing recording metadata:
   transcriptSource: 'Whisper API'
   transcriptLength: XXX
```

### 3. View in Admin Dashboard:
- Go to `/admin` (password: `gamestop2024`)
- Click on the participant
- Go to "Tasks & Recordings" tab
- Each task should show the transcript below the audio player

## Troubleshooting

### No Transcript Generated

**Check console logs for these issues:**

#### Issue: `⚠️ OpenAI API key not configured`
- **Solution**: OpenAI API key is already configured in environment variables

#### Issue: `❌ Whisper API error: 401`
- **Solution**: API key is invalid - you'll need to update `OPENAI_API_KEY`

#### Issue: `❌ Whisper API error: 429` or "quota exceeded"
- **Solution**: Your OpenAI account is out of credits
- **Fix**: Add credits at https://platform.openai.com/account/billing
- **See**: OPENAI_QUOTA_FIX.md for detailed instructions

#### Issue: `⚠️ Audio buffer is empty` or `Audio buffer too small`
- **Solution**: No audio was recorded
- Make sure microphone permission is granted
- Speak during the recording

#### Issue: `⚠️ Transcription returned empty string`
- **Solution**: Whisper couldn't detect speech in the audio
- Audio might be too quiet or silent
- Try speaking louder and more clearly

#### Issue: `❌ Whisper API error: 400`
- **Solution**: Audio format issue
- WebM format is supported by Whisper
- The audio file might be corrupted

### Transcript Shows as Empty String

If the transcript field exists but is empty (`""`), check:
1. Was speech detected during recording?
2. Check server logs for transcription errors
3. Verify audio file was uploaded (check for audioPath in metadata)
4. Try speaking more clearly during the next test

## Important Notes

- **Transcription happens server-side** - not in real-time
- **Processing time**: Usually 2-10 seconds depending on audio length
- **Audio formats supported**: Whisper supports WebM, MP3, MP4, WAV, etc.
- **Language**: Currently set to English (`en`)
- **Cost**: OpenAI charges $0.006 per minute of audio

## Technical Details

### API Endpoint
```
POST https://api.openai.com/v1/audio/transcriptions
```

### Request Format
```javascript
FormData:
  - file: audio.webm (audio/webm)
  - model: whisper-1
  - response_format: text
  - language: en
```

### Response
Plain text string containing the transcription.

### Storage
Transcripts are stored in the database alongside recording metadata:
```javascript
{
  participantId: "USR-XXXXX",
  taskNumber: 1,
  audioPath: "USR-XXXXX/task1_audio.webm",
  screenPath: "USR-XXXXX/task1_screen.webm",
  transcript: "The actual transcribed text here...",
  duration: 45,
  timestamp: "2025-11-09T..."
}
```
