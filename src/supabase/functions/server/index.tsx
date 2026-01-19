import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "Cache-Control", "Pragma", "Expires"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: false,
  }),
);

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

// Create storage bucket if it doesn't exist
async function ensureStorageBucket() {
  const bucketName = 'make-b0f3b375-recordings';
  
  try {
    console.log('Checking if storage bucket exists:', bucketName);
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError);
      throw listError;
    }
    
    console.log('Existing buckets:', buckets?.map(b => b.name).join(', ') || 'none');
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
    
    if (!bucketExists) {
      console.log('Creating storage bucket:', bucketName);
      const { data, error: createError } = await supabase.storage.createBucket(bucketName, {
        public: false,
        fileSizeLimit: 52428800, // 50MB - reduced from 500MB
      });
      
      if (createError) {
        console.error('Error creating bucket:', createError);
        // Don't throw on bucket creation errors - continue anyway
        console.log('⚠️ Bucket creation failed, but continuing - bucket may already exist or will be created on first upload');
        return true; // Return success anyway
      }
      
      console.log('✅ Created storage bucket successfully:', bucketName);
    } else {
      console.log('✅ Storage bucket already exists:', bucketName);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Failed to ensure storage bucket:', error);
    return false;
  }
}

// Ensure bucket exists on startup
console.log('🚀 Server starting - initializing storage...');
ensureStorageBucket().then(success => {
  if (success) {
    console.log('✅ Storage initialization complete');
  } else {
    console.log('⚠️ Storage initialization failed - will retry on first upload');
  }
}).catch(err => {
  console.error('❌ Storage initialization error:', err);
});

// Check OpenAI API key on startup
const openaiKey = Deno.env.get('OPENAI_API_KEY');
if (openaiKey) {
  console.log('✅ OpenAI API key configured');
} else {
  console.log('⚠️ OpenAI API key not configured - AI analysis and transcription features will not work');
  console.log('   See OPENAI_SETUP.md for setup instructions');
}

// Function to transcribe audio using OpenAI Whisper API
async function transcribeAudio(audioBuffer: ArrayBuffer): Promise<string> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) {
    console.log('⚠️ OpenAI API key not configured - skipping transcription');
    return '';
  }

  try {
    console.log('🎤 Starting audio transcription with Whisper API...');
    console.log('   Audio buffer size:', audioBuffer.byteLength, 'bytes');
    
    if (audioBuffer.byteLength === 0) {
      console.warn('⚠️ Audio buffer is empty - skipping transcription');
      return '';
    }

    if (audioBuffer.byteLength < 100) {
      console.warn('⚠️ Audio buffer too small - likely no audio recorded');
      return '';
    }
    
    // Create form data with the audio file
    // Whisper supports: mp3, mp4, mpeg, mpga, m4a, wav, webm
    const formData = new FormData();
    const audioBlob = new Blob([audioBuffer], { type: 'audio/webm' });
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'text');
    formData.append('language', 'en');
    
    console.log('📤 Sending request to Whisper API...');
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Whisper API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      
      // Handle specific error types
      if (response.status === 429) {
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.error?.code === 'insufficient_quota') {
            console.error('\n💳 OPENAI QUOTA EXCEEDED 💳');
            console.error('Your OpenAI account has run out of credits.');
            console.error('To fix this:');
            console.error('1. Go to: https://platform.openai.com/account/billing');
            console.error('2. Add credits to your account');
            console.error('3. Try transcribing again\n');
            throw new Error('quota_exceeded: ' + errorText);
          } else if (errorJson.error?.code === 'rate_limit_exceeded') {
            console.error('\n⏱️  RATE LIMIT EXCEEDED ⏱️');
            console.error('OpenAI API rate limit reached (3 requests/minute).');
            console.error('The system should have prevented this.');
            console.error('Waiting and retrying...\n');
            throw new Error('rate_limit_exceeded: ' + errorText);
          }
        } catch (e) {
          if (e instanceof Error && (e.message.includes('quota_exceeded') || e.message.includes('rate_limit_exceeded'))) {
            throw e; // Re-throw our custom errors
          }
          // Other parsing errors, just continue
        }
      }
      
      return '';
    }

    const transcript = await response.text();
    console.log('✅ Transcription complete:', transcript.length, 'characters');
    
    if (transcript.length > 0) {
      console.log('📝 Transcript preview:', transcript.substring(0, 150));
    } else {
      console.warn('⚠️ Transcription returned empty string - audio may be silent or inaudible');
    }
    
    return transcript.trim();
  } catch (error) {
    console.error('❌ Error transcribing audio:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return '';
  }
}

// Health check endpoint
app.get("/make-server-b0f3b375/health", (c) => {
  return c.json({ status: "ok" });
});

// Generate participant ID in format USR-XXXXX
function generateParticipantId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `USR-${timestamp}-${random}`;
}

// Get client IP address
function getClientIP(c: any): string {
  return c.req.header('x-forwarded-for') || 
         c.req.header('x-real-ip') || 
         'unknown';
}

// Check if participant already submitted (by IP)
app.post("/make-server-b0f3b375/check-participant", async (c) => {
  try {
    console.log('\n=== 🔍 CHECK-PARTICIPANT REQUEST ===');
    const clientIP = getClientIP(c);
    console.log('📍 Client IP:', clientIP);
    
    // Check if this IP has already submitted
    console.log('🔎 Checking for existing participants...');
    const existingParticipants = await kv.getByPrefix('participant:');
    console.log('📊 Found', existingParticipants?.length || 0, 'existing participants');
    
    // Note: getByPrefix returns values directly, not {key, value} objects
    const hasSubmitted = existingParticipants.some((p: any) => 
      p && p.ipAddress === clientIP && p.submitted === true
    );
    
    if (hasSubmitted) {
      console.log('🚫 IP has already submitted - blocking');
      return c.json({ 
        allowed: false, 
        message: 'You have already completed this test. Thank you for your participation!' 
      });
    }
    
    // Generate new participant ID
    const participantId = generateParticipantId();
    const timestamp = new Date().toISOString();
    
    console.log('✅ New participant allowed');
    console.log('🆔 Generated participant ID:', participantId);
    console.log('📅 Timestamp:', timestamp);
    
    // Store initial participant record
    const initialData = {
      participantId,
      ipAddress: clientIP,
      startedAt: timestamp,
      submitted: false,
      userAgent: c.req.header('user-agent') || 'unknown',
      referrer: c.req.header('referer') || c.req.header('referrer') || 'Direct'
    };
    
    console.log('💾 Storing initial participant record...');
    console.log('🔗 Referrer:', initialData.referrer);
    await kv.set(`participant:${participantId}`, initialData);
    console.log('✅ Initial participant record stored');
    
    const response = { 
      allowed: true, 
      participantId,
      timestamp
    };
    
    console.log('📤 Returning response:', response);
    console.log('=== CHECK-PARTICIPANT COMPLETE ===\n');
    
    return c.json(response);
  } catch (error) {
    console.error('❌ Error checking participant:', error);
    return c.json({ error: 'Failed to validate participant' }, 500);
  }
});

// Submit test responses
app.post("/make-server-b0f3b375/submit-response", async (c) => {
  try {
    console.log('\n=== 📥 SUBMIT-RESPONSE REQUEST RECEIVED ===');
    
    // Parse the JSON and log the raw body
    const body = await c.req.json();
    console.log('📋 Raw request body keys:', Object.keys(body));
    console.log('📋 Raw request body:', JSON.stringify(body).substring(0, 500));
    
    const { participantId, responses } = body;
    console.log('📋 Participant ID:', participantId);
    console.log('📋 Participant ID type:', typeof participantId);
    console.log('📋 Participant ID is undefined?', participantId === undefined);
    console.log('📋 Participant ID is null?', participantId === null);
    console.log('📋 Participant ID is empty string?', participantId === '');
    console.log('📋 Participant ID truthiness:', !!participantId);
    console.log('📋 Response keys:', Object.keys(responses || {}));
    console.log('📋 Full responses:', JSON.stringify(responses, null, 2));
    
    if (!participantId) {
      console.error('❌ No participant ID provided');
      console.error('❌ participantId value:', participantId);
      console.error('❌ Request body had participantId key?', 'participantId' in body);
      return c.json({ error: 'Participant ID required' }, 400);
    }
    
    // Get existing participant data
    console.log('🔍 Looking up participant:', `participant:${participantId}`);
    let participantData = await kv.get(`participant:${participantId}`);
    console.log('Existing participant data:', participantData ? 'FOUND' : 'NOT FOUND');
    
    if (!participantData) {
      console.warn('⚠️ Participant not found in KV store, creating fallback record');
      console.warn('⚠️ This can happen if session was lost or fallback ID was used');
      
      // Create a minimal participant record for fallback submissions
      const clientIP = getClientIP(c);
      participantData = {
        participantId,
        ipAddress: clientIP,
        startedAt: new Date().toISOString(),
        submitted: false,
        userAgent: c.req.header('user-agent') || 'unknown',
        isFallback: true // Mark as fallback
      };
      
      console.log('💾 Storing fallback participant record:', participantId);
      await kv.set(`participant:${participantId}`, participantData);
      console.log('✅ Fallback participant record created');
    }
    
    // Extract demographics from responses for separate storage
    const { demographics, screening, tasks, quantSurvey, qualitativeDeepDive, wrapUp, taskTimings, testSession, ...otherResponses } = responses;
    
    // Combine all closing survey parts
    const closingData = {
      quantSurvey: quantSurvey || null,
      qualitativeDeepDive: qualitativeDeepDive || null,
      wrapUp: wrapUp || null
    };
    
    // Update with full submission - ensure submitted is explicitly true (boolean)
    const submittedTimestamp = new Date().toISOString();
    const updatedData = {
      ...participantData,
      demographics: demographics || null,
      screening: screening || null,
      tasks: tasks || null,
      closing: closingData,
      taskTimings: taskTimings || null,
      testSession: testSession || null,
      responses: responses, // Keep full responses for backward compatibility
      submittedAt: submittedTimestamp,
      submitted: true // Explicitly set as boolean true
    };
    
    console.log('💾 Saving updated participant data...');
    console.log('Submitted status:', updatedData.submitted, 'Type:', typeof updatedData.submitted);
    console.log('Submitted at:', updatedData.submittedAt);
    console.log('Has demographics:', !!updatedData.demographics);
    console.log('Has screening:', !!updatedData.screening);
    console.log('Has tasks:', !!updatedData.tasks);
    console.log('Has closing data:', !!updatedData.closing);
    console.log('Has task timings:', !!updatedData.taskTimings);
    console.log('Has test session:', !!updatedData.testSession);
    console.log('Closing sections:', {
      quantSurvey: !!closingData.quantSurvey,
      qualitativeDeepDive: !!closingData.qualitativeDeepDive,
      wrapUp: !!closingData.wrapUp
    });
    
    await kv.set(`participant:${participantId}`, updatedData);
    
    // Verify the save immediately
    const verifyData = await kv.get(`participant:${participantId}`);
    console.log('✅ Verification - Data retrieved from KV:');
    console.log('  - Submitted:', verifyData?.submitted, 'Type:', typeof verifyData?.submitted);
    console.log('  - SubmittedAt:', verifyData?.submittedAt);
    console.log('  - Has demographics:', !!verifyData?.demographics);
    console.log('  - Has screening:', !!verifyData?.screening);
    console.log('  - Has tasks:', !!verifyData?.tasks);
    console.log('  - Has closing:', !!verifyData?.closing);
    
    if (verifyData?.submitted !== true) {
      console.error('⚠️ WARNING: Submitted status was not saved correctly!');
      console.error('  Expected: true (boolean), Got:', verifyData?.submitted, typeof verifyData?.submitted);
    } else {
      console.log('✅ ✅ ✅ PARTICIPANT MARKED AS COMPLETED SUCCESSFULLY ✅ ✅ ✅');
    }
    
    console.log('=== SUBMIT-RESPONSE REQUEST COMPLETE ===\n');
    
    return c.json({ success: true, submitted: true });
  } catch (error) {
    console.error('❌ Error submitting response:', error);
    return c.json({ error: 'Failed to submit response' }, 500);
  }
});

// Update individual task data (when user goes back and edits)
app.put("/make-server-b0f3b375/participant/:participantId/task/:taskNumber", async (c) => {
  try {
    const participantId = c.req.param('participantId');
    const taskNumber = c.req.param('taskNumber');
    const { taskData, timing } = await c.req.json();
    
    console.log(`📝 Updating Task ${taskNumber} for participant ${participantId}`);
    
    // Get existing participant data
    const participantData = await kv.get(`participant:${participantId}`);
    if (!participantData) {
      return c.json({ error: 'Participant not found' }, 404);
    }
    
    // Update the specific task data
    if (!participantData.tasks) {
      participantData.tasks = {};
    }
    participantData.tasks[`task${taskNumber}`] = taskData;
    
    // Update timing if provided
    if (timing) {
      if (!participantData.taskTimings) {
        participantData.taskTimings = {};
      }
      participantData.taskTimings[`task${taskNumber}`] = timing;
    }
    
    // Save back to database
    await kv.set(`participant:${participantId}`, participantData);
    
    console.log(`✅ Task ${taskNumber} updated successfully`);
    return c.json({ success: true });
  } catch (error) {
    console.error('❌ Error updating task data:', error);
    return c.json({ error: 'Failed to update task data' }, 500);
  }
});

// Participant exit - delete their test data
app.delete("/make-server-b0f3b375/participant/:id", async (c) => {
  try {
    const participantId = c.req.param('id');
    
    if (!participantId) {
      return c.json({ error: 'Participant ID required' }, 400);
    }
    
    console.log('🚪 Participant exit - deleting data for:', participantId);
    
    // Check if participant exists
    const participantData = await kv.get(`participant:${participantId}`);
    if (!participantData) {
      console.log('⚠️ Participant not found, returning success anyway');
      return c.json({ success: true });
    }
    
    // Delete participant data
    await kv.del(`participant:${participantId}`);
    console.log('✅ Deleted participant data');
    
    // Delete all recordings for this participant
    const recordings = await kv.getByPrefix(`recording:${participantId}:`);
    if (recordings && recordings.length > 0) {
      const recordingKeys = [];
      for (let i = 1; i <= 6; i++) {
        recordingKeys.push(`recording:${participantId}:task${i}`);
      }
      await kv.mdel(recordingKeys);
      console.log(`✅ Deleted ${recordings.length} recordings`);
      
      // Also delete files from storage if they exist
      const bucketName = 'make-b0f3b375-recordings';
      for (const recording of recordings) {
        if (recording.audioPath) {
          try {
            await supabase.storage.from(bucketName).remove([recording.audioPath]);
          } catch (err) {
            console.warn('Could not delete audio file:', recording.audioPath);
          }
        }
        if (recording.screenPath) {
          try {
            await supabase.storage.from(bucketName).remove([recording.screenPath]);
          } catch (err) {
            console.warn('Could not delete screen file:', recording.screenPath);
          }
        }
      }
    }
    
    // Delete all transcripts for this participant
    const transcripts = await kv.getByPrefix(`transcript:${participantId}:`);
    if (transcripts && transcripts.length > 0) {
      const transcriptKeys = [];
      for (let i = 1; i <= 6; i++) {
        transcriptKeys.push(`transcript:${participantId}:task${i}`);
      }
      await kv.mdel(transcriptKeys);
      console.log(`✅ Deleted ${transcripts.length} transcripts`);
    }
    
    // Delete AI analysis if it exists
    const analysis = await kv.get(`analysis:${participantId}`);
    if (analysis) {
      await kv.del(`analysis:${participantId}`);
      console.log('✅ Deleted AI analysis');
    }
    
    console.log(`✅ Participant exited - all data deleted for: ${participantId}`);
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting participant data during exit:', error);
    // Return success even on error so user can still exit
    return c.json({ success: true });
  }
});

// Store individual transcripts
app.post("/make-server-b0f3b375/store-transcript", async (c) => {
  try {
    const { participantId, taskNumber, transcript, duration } = await c.json();
    
    if (!participantId || !taskNumber) {
      return c.json({ error: 'Participant ID and task number required' }, 400);
    }
    
    await kv.set(`transcript:${participantId}:task${taskNumber}`, {
      participantId,
      taskNumber,
      transcript,
      duration,
      timestamp: new Date().toISOString()
    });
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Error storing transcript:', error);
    return c.json({ error: 'Failed to store transcript' }, 500);
  }
});

// Admin: Get all participants
app.get("/make-server-b0f3b375/admin/participants", async (c) => {
  try {
    console.log('📊 Admin participants endpoint called');
    const participants = await kv.getByPrefix('participant:');
    console.log('Raw participants from KV:', participants?.length || 0);
    
    // Note: getByPrefix returns the values directly, not {key, value} objects
    // Log each entry for debugging
    if (participants && participants.length > 0) {
      console.log('Sample entry structure:', JSON.stringify(participants[0]).substring(0, 300));
      participants.forEach((p: any, idx: number) => {
        if (p) {
          console.log(`Participant ${idx + 1}:`, {
            id: p.participantId,
            submitted: p.submitted,
            startedAt: p.startedAt,
            submittedAt: p.submittedAt,
            hasScreening: !!p.screening,
            hasTasks: !!p.tasks,
            hasClosing: !!p.closing
          });
        } else {
          console.log(`Participant ${idx + 1}: NULL`);
        }
      });
    }
    
    // Sort by timestamp - participants is already an array of values
    const sorted = participants
      .filter((p: any) => {
        // More lenient filter - only remove truly invalid entries
        if (p === null || p === undefined) {
          console.log('⚠️ Filtering out NULL/UNDEFINED entry');
          return false;
        }
        
        // Log entries that are missing participantId but might have data
        if (!p.participantId) {
          console.log('⚠️ Entry missing participantId but has:', Object.keys(p));
          // Still include it if it has any data
          return Object.keys(p).length > 0;
        }
        
        return true;
      })
      .sort((a: any, b: any) => {
        const aTime = a.startedAt ? new Date(a.startedAt).getTime() : 0;
        const bTime = b.startedAt ? new Date(b.startedAt).getTime() : 0;
        return bTime - aTime;
      });
    
    console.log('✅ Total entries before filter:', participants?.length || 0);
    console.log('✅ Entries after filter:', sorted?.length || 0);
    console.log(`✅ Filtered out: ${(participants?.length || 0) - (sorted?.length || 0)} entries`);
    
    // Detailed logging for each participant's submitted status
    sorted.forEach((p: any, idx: number) => {
      console.log(`Participant ${idx + 1} (${p.participantId}):`, {
        submitted: p.submitted,
        submittedType: typeof p.submitted,
        submittedAt: p.submittedAt,
        hasSubmittedAt: !!p.submittedAt,
        // Use strict equality to check
        isStrictlyTrue: p.submitted === true,
        isTruthy: !!p.submitted
      });
    });
    
    const completedCount = sorted.filter((p: any) => p.submitted === true).length;
    const inProgressCount = sorted.filter((p: any) => p.submitted !== true).length;
    
    console.log('Completed count (strict):', completedCount);
    console.log('In progress count (strict):', inProgressCount);
    
    if (sorted[0]) {
      console.log('First participant sample:', JSON.stringify(sorted[0]).substring(0, 300));
    }
    
    return c.json({ participants: sorted });
  } catch (error) {
    console.error('❌ Error fetching participants:', error);
    return c.json({ error: `Failed to fetch participants: ${error}` }, 500);
  }
});

// Upload recording with audio and screen capture
app.post("/make-server-b0f3b375/upload-recording", async (c) => {
  try {
    console.log('🎬 ============ UPLOAD RECORDING STARTED ============');
    const formData = await c.req.formData();
    const participantId = formData.get('participantId') as string;
    const taskNumber = formData.get('taskNumber') as string;
    const audioBlob = formData.get('audioBlob') as Blob;
    const screenBlob = formData.get('screenBlob') as Blob;
    const transcript = formData.get('transcript') as string;
    const duration = formData.get('duration') as string;

    console.log('📋 Upload recording request:', {
      participantId,
      taskNumber,
      audioSize: audioBlob?.size || 0,
      screenSize: screenBlob?.size || 0,
      transcriptLength: transcript?.length || 0,
      duration
    });

    if (!participantId || !taskNumber) {
      console.error('Missing required fields:', { participantId, taskNumber });
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const bucketName = 'make-b0f3b375-recordings';
    
    // Ensure bucket exists before attempting upload
    console.log('Ensuring bucket exists before upload...');
    const bucketReady = await ensureStorageBucket();
    if (!bucketReady) {
      console.warn('⚠️ Bucket may not be ready, but attempting upload anyway');
    }
    
    // Upload audio file and transcribe it
    let audioPath = null;
    let generatedTranscript = '';
    if (audioBlob && audioBlob.size > 0) {
      audioPath = `${participantId}/task${taskNumber}_audio.webm`;
      console.log('Uploading audio to:', audioPath, 'Size:', audioBlob.size, 'bytes');
      
      // Check file size (50MB limit)
      const maxSize = 50 * 1024 * 1024; // 50MB in bytes
      if (audioBlob.size > maxSize) {
        console.error('❌ Audio file too large:', audioBlob.size, 'bytes (max:', maxSize, ')');
        return c.json({ error: 'Audio file exceeds 50MB limit' }, 413);
      }
      
      const audioBuffer = await audioBlob.arrayBuffer();
      const { data: audioData, error: audioError } = await supabase.storage
        .from(bucketName)
        .upload(audioPath, audioBuffer, {
          contentType: 'audio/webm',
          upsert: true
        });
      
      if (audioError) {
        console.error('Error uploading audio:', audioError);
        // Don't fail the whole request, just log the error
      } else {
        console.log('✅ Audio uploaded successfully:', audioData);
        
        // Transcribe the audio using OpenAI Whisper
        console.log('🎤 Transcribing audio for task', taskNumber);
        generatedTranscript = await transcribeAudio(audioBuffer);
        if (generatedTranscript) {
          console.log('✅ Transcription successful:', generatedTranscript.length, 'characters');
        } else {
          console.log('⚠️ No transcript generated (API key may not be configured or audio was silent)');
        }
      }
    } else {
      console.warn('No audio blob to upload or empty');
    }

    // Upload screen recording file
    let screenPath = null;
    if (screenBlob && screenBlob.size > 0) {
      screenPath = `${participantId}/task${taskNumber}_screen.webm`;
      console.log('Uploading screen recording to:', screenPath, 'Size:', screenBlob.size, 'bytes');
      
      // Check file size (50MB limit)
      const maxSize = 50 * 1024 * 1024; // 50MB in bytes
      if (screenBlob.size > maxSize) {
        console.error('❌ Screen recording too large:', screenBlob.size, 'bytes (max:', maxSize, ')');
        return c.json({ error: 'Screen recording exceeds 50MB limit' }, 413);
      }
      
      const screenBuffer = await screenBlob.arrayBuffer();
      console.log('Screen buffer size:', screenBuffer.byteLength, 'bytes');
      const { data: screenData, error: screenError } = await supabase.storage
        .from(bucketName)
        .upload(screenPath, screenBuffer, {
          contentType: 'video/webm',
          upsert: true
        });
      
      if (screenError) {
        console.error('Error uploading screen recording:', screenError);
        // Don't fail the whole request, just log the error
      } else {
        console.log('✅ Screen recording uploaded successfully:', screenData);
      }
    } else {
      console.warn('No screen blob to upload or empty. Size:', screenBlob?.size);
    }

    // Store recording metadata with generated transcript
    const finalTranscript = generatedTranscript || transcript || '';
    const metadata = {
      participantId,
      taskNumber: parseInt(taskNumber),
      audioPath,
      screenPath,
      transcript: finalTranscript,
      duration: parseInt(duration),
      timestamp: new Date().toISOString()
    };
    console.log('💾 Storing recording metadata:', {
      participantId,
      taskNumber,
      hasAudioPath: !!audioPath,
      hasScreenPath: !!screenPath,
      transcriptLength: finalTranscript.length,
      transcriptPreview: finalTranscript.substring(0, 100) || 'EMPTY',
      transcriptSource: generatedTranscript ? 'Whisper API' : (transcript ? 'Client' : 'None')
    });
    
    const kvKey = `recording:${participantId}:task${taskNumber}`;
    console.log('🔑 Saving to KV store with key:', kvKey);
    console.log('📦 Metadata to save:', JSON.stringify(metadata, null, 2));
    
    await kv.set(kvKey, metadata);
    
    console.log('✅ Metadata saved to KV store successfully');
    console.log('🎬 ============ UPLOAD RECORDING COMPLETE ============');

    return c.json({ 
      success: true, 
      audioPath, 
      screenPath,
      audioSize: audioBlob?.size || 0,
      screenSize: screenBlob?.size || 0,
      transcriptGenerated: !!generatedTranscript,
      transcriptLength: finalTranscript.length
    });
  } catch (error) {
    console.error('❌ ============ UPLOAD RECORDING FAILED ============');
    console.error('❌ Error uploading recording:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return c.json({ error: `Failed to upload recording: ${error}` }, 500);
  }
});

// Get signed URL for recording playback
app.post("/make-server-b0f3b375/get-recording-url", async (c) => {
  try {
    const { path } = await c.json();
    
    if (!path) {
      return c.json({ error: 'Path required' }, 400);
    }

    const bucketName = 'make-b0f3b375-recordings';
    const { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(path, 3600); // 1 hour expiry

    if (error) {
      console.error('Error creating signed URL:', error);
      return c.json({ error: 'Failed to create signed URL' }, 500);
    }

    return c.json({ url: data.signedUrl });
  } catch (error) {
    console.error('Error getting recording URL:', error);
    return c.json({ error: 'Failed to get recording URL' }, 500);
  }
});

// Admin: Get participant details with transcripts and recordings
app.get("/make-server-b0f3b375/admin/participant/:id", async (c) => {
  try {
    const participantId = c.req.param('id');
    
    console.log('📊 Fetching details for participant:', participantId);
    
    const participantData = await kv.get(`participant:${participantId}`);
    if (!participantData) {
      console.error('Participant not found:', participantId);
      return c.json({ error: 'Participant not found' }, 404);
    }
    
    console.log('Participant data:', {
      id: participantData.participantId,
      submitted: participantData.submitted,
      submittedType: typeof participantData.submitted,
      submittedAt: participantData.submittedAt
    });
    
    // Get all recordings for this participant
    // Note: getByPrefix returns values directly, not {key, value} objects
    const recordings = await kv.getByPrefix(`recording:${participantId}:`);
    const recordingData = recordings
      .filter((r: any) => r !== null)
      .sort((a: any, b: any) => a.taskNumber - b.taskNumber);
    
    console.log('Found recordings:', recordingData.length);
    recordingData.forEach((rec: any, idx: number) => {
      console.log(`Recording ${idx + 1} (Task ${rec.taskNumber}):`, {
        hasTranscript: !!rec.transcript,
        transcriptLength: rec.transcript?.length || 0,
        transcriptPreview: rec.transcript?.substring(0, 50) || 'EMPTY',
        hasAudioPath: !!rec.audioPath,
        hasScreenPath: !!rec.screenPath
      });
    });
    
    // Generate signed URLs for recordings
    const bucketName = 'make-b0f3b375-recordings';
    const recordingsWithUrls = await Promise.all(
      recordingData.map(async (recording: any) => {
        const result = { ...recording };
        
        // Generate signed URL for audio if it exists
        if (recording.audioPath) {
          try {
            const { data: audioData, error: audioError } = await supabase.storage
              .from(bucketName)
              .createSignedUrl(recording.audioPath, 3600); // 1 hour expiry
            
            if (!audioError && audioData?.signedUrl) {
              result.audioUrl = audioData.signedUrl;
              console.log(`✅ Generated audio URL for task ${recording.taskNumber}`);
            } else {
              console.error(`❌ Error generating audio URL for task ${recording.taskNumber}:`, audioError);
            }
          } catch (err) {
            console.error(`Error creating audio signed URL:`, err);
          }
        }
        
        // Generate signed URL for screen recording if it exists
        if (recording.screenPath) {
          try {
            const { data: screenData, error: screenError } = await supabase.storage
              .from(bucketName)
              .createSignedUrl(recording.screenPath, 3600); // 1 hour expiry
            
            if (!screenError && screenData?.signedUrl) {
              result.screenUrl = screenData.signedUrl;
              console.log(`✅ Generated screen URL for task ${recording.taskNumber}`);
            } else {
              console.error(`❌ Error generating screen URL for task ${recording.taskNumber}:`, screenError);
            }
          } catch (err) {
            console.error(`Error creating screen signed URL:`, err);
          }
        }
        
        return result;
      })
    );
    
    // Get all transcripts for this participant (legacy support)
    const transcripts = await kv.getByPrefix(`transcript:${participantId}:`);
    const transcriptData = transcripts
      .filter((t: any) => t !== null)
      .sort((a: any, b: any) => a.taskNumber - b.taskNumber);
    
    console.log('Found transcripts:', transcriptData.length);
    
    return c.json({ 
      participant: participantData,
      recordings: recordingsWithUrls,
      transcripts: transcriptData
    });
  } catch (error) {
    console.error('Error fetching participant details:', error);
    return c.json({ error: 'Failed to fetch participant details' }, 500);
  }
});

// Check if AI analysis exists for a participant (without generating)
app.get("/make-server-b0f3b375/admin/check-analysis/:id", async (c) => {
  try {
    const participantId = c.req.param('id');
    
    const existingAnalysis = await kv.get(`analysis:${participantId}`);
    
    if (existingAnalysis) {
      return c.json({ exists: true, analysis: existingAnalysis });
    }
    
    return c.json({ exists: false });
  } catch (error) {
    console.error('Error checking analysis:', error);
    return c.json({ exists: false }, 200); // Return false instead of error
  }
});

// Generate AI analysis for a participant
app.post("/make-server-b0f3b375/admin/generate-analysis/:id", async (c) => {
  try {
    const participantId = c.req.param('id');
    
    // Check if analysis already exists
    const existingAnalysis = await kv.get(`analysis:${participantId}`);
    if (existingAnalysis) {
      return c.json({ analysis: existingAnalysis });
    }
    
    // Get participant data
    const participantData = await kv.get(`participant:${participantId}`);
    if (!participantData) {
      return c.json({ error: 'Participant not found' }, 404);
    }
    
    // Get all recordings/transcripts
    // Note: getByPrefix returns values directly, not {key, value} objects
    const recordings = await kv.getByPrefix(`recording:${participantId}:`);
    const recordingData = recordings
      .filter((r: any) => r !== null)
      .sort((a: any, b: any) => a.taskNumber - b.taskNumber);
    
    // Build context for AI
    const context = {
      demographics: participantData.demographics,
      screening: participantData.screening,
      tasks: participantData.tasks,
      closing: participantData.closing,
      transcripts: recordingData.map((r: any) => ({
        task: r.taskNumber,
        transcript: r.transcript
      }))
    };
    
    console.log('Generating AI analysis for participant:', participantId);
    
    // Call OpenAI API
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      console.error('OpenAI API key not configured');
      return c.json({ error: 'AI analysis not configured' }, 500);
    }
    
    const prompt = `Analyze this usability test session for the GameStop ProVault mobile app. The app allows collectors to list, sell, and manage their trading card collections with features like bundle creation, seller dashboard, and in-store rewards.

PARTICIPANT DATA:
${JSON.stringify(context, null, 2)}

Please provide a comprehensive analysis with:

1. EXECUTIVE SUMMARY (2-3 sentences)
- Overall impression of the participant's experience
- Key success indicators and pain points

2. KEY FINDINGS (4-6 bullet points)
- Most significant insights from their behavior and feedback
- Patterns in their interactions across tasks
- Notable quotes from transcripts that reveal insights

3. KEY MOMENTS (3-5 specific moments)
- Timestamp/task where something significant happened
- What happened and why it's important
- Direct quote or behavioral observation

4. PAIN POINTS (3-4 issues)
- Specific usability problems encountered
- Confusion or frustration points
- Areas where the participant struggled

5. POSITIVE HIGHLIGHTS (3-4 items)
- Features or flows that worked well
- Positive feedback or smooth interactions
- Moments of delight or satisfaction

6. RECOMMENDATIONS (3-5 actionable items)
- Specific improvements based on this session
- Priority areas to address
- Design or UX suggestions

Format your response as JSON with the following structure:
{
  "executiveSummary": "...",
  "keyFindings": ["...", "..."],
  "keyMoments": [
    {"task": 1, "moment": "...", "quote": "...", "significance": "..."},
    ...
  ],
  "painPoints": ["...", "..."],
  "positiveHighlights": ["...", "..."],
  "recommendations": ["...", "..."]
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a UX research expert analyzing usability test sessions. Provide detailed, actionable insights based on participant behavior and feedback.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      
      let errorMessage = 'Failed to generate analysis';
      let isQuotaError = false;
      
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error?.code === 'insufficient_quota') {
          errorMessage = 'OpenAI API quota exceeded. Please add billing credits to your OpenAI account at https://platform.openai.com/account/billing';
          isQuotaError = true;
          console.log('⚠️ OpenAI API quota exceeded - AI analysis unavailable. Participant data is still fully accessible.');
        } else if (errorData.error?.message) {
          errorMessage = errorData.error.message;
          console.error('OpenAI API error:', errorData.error);
        }
      } catch (e) {
        // If error text is not JSON, use default message
        console.error('OpenAI API error (unparseable):', errorText);
      }
      
      return c.json({ 
        error: errorMessage,
        needsApiKey: isQuotaError || errorText.includes('quota') || errorText.includes('billing'),
        quotaExceeded: isQuotaError
      }, response.status);
    }
    
    const data = await response.json();
    const analysisText = data.choices[0].message.content;
    const analysis = JSON.parse(analysisText);
    
    // Add metadata
    const fullAnalysis = {
      ...analysis,
      participantId,
      generatedAt: new Date().toISOString(),
      model: 'gpt-4o'
    };
    
    // Store analysis
    await kv.set(`analysis:${participantId}`, fullAnalysis);
    
    console.log('AI analysis generated successfully for:', participantId);
    
    return c.json({ analysis: fullAnalysis });
  } catch (error) {
    console.error('Error generating AI analysis:', error);
    return c.json({ error: `Failed to generate analysis: ${error}` }, 500);
  }
});

// Generate AI analysis for all completed participants
app.post("/make-server-b0f3b375/admin/generate-all-analyses", async (c) => {
  try {
    console.log('Starting bulk AI analysis generation...');
    
    // Check if OpenAI API key is configured
    if (!openaiApiKey) {
      console.error('OpenAI API key not configured');
      return c.json({ 
        error: 'OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.',
        errorType: 'no_api_key'
      }, 500);
    }
    
    // Get all participants
    const allParticipants = await kv.getByPrefix('participant:');
    
    // Filter to only completed participants
    const completedParticipants = allParticipants.filter((p: any) => p.submitted === true);
    
    console.log(`Found ${completedParticipants.length} completed participants`);
    
    const results = {
      total: completedParticipants.length,
      generated: 0,
      skipped: 0,
      errors: 0
    };
    
    for (const participant of completedParticipants) {
      try {
        const participantId = participant.participantId;
        
        // Check if analysis already exists
        const existingAnalysis = await kv.get(`analysis:${participantId}`);
        if (existingAnalysis) {
          console.log(`Skipping ${participantId} - analysis already exists`);
          results.skipped++;
          continue;
        }
        
        console.log(`Generating analysis for ${participantId}...`);
        
        // Get participant data
        const demographics = participant.demographics || {};
        const screening = participant.screening || {};
        const tasks = participant.tasks || {};
        const closing = participant.closing || {};
        
        // Get transcripts
        const transcripts: any = {};
        for (let i = 1; i <= 6; i++) {
          const transcript = await kv.get(`transcript:${participantId}:task${i}`);
          if (transcript) {
            transcripts[`task${i}`] = transcript;
          }
        }
        
        // Create analysis prompt
        const prompt = `You are a UX research analyst. Analyze this participant's usability test session for the GameStop ProVault mobile prototype and provide detailed insights.

PARTICIPANT DATA:
${JSON.stringify({ demographics, screening, tasks, closing, transcripts }, null, 2)}

Provide a comprehensive analysis in the following JSON format:
{
  "executiveSummary": "2-3 sentence high-level summary",
  "keyFindings": ["finding 1", "finding 2", "finding 3"],
  "painPoints": ["pain point 1", "pain point 2"],
  "positiveHighlights": ["positive 1", "positive 2"],
  "recommendations": ["recommendation 1", "recommendation 2"],
  "keyMoments": [
    {
      "task": "Task name",
      "moment": "What happened",
      "significance": "Why it matters",
      "quote": "Relevant quote from transcript if available"
    }
  ]
}`;

        // Call OpenAI API
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiApiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4',
            messages: [
              {
                role: 'system',
                content: 'You are a UX research analyst specializing in usability testing analysis. Provide insights in valid JSON format only.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.7,
            max_tokens: 2000
          })
        });
        
        if (!openaiResponse.ok) {
          const errorText = await openaiResponse.text();
          
          // Check for quota errors
          try {
            const errorData = JSON.parse(errorText);
            if (errorData.error?.type === 'insufficient_quota' || errorData.error?.code === 'insufficient_quota') {
              console.log('⚠️ OpenAI API quota exceeded - stopping bulk generation');
              return c.json({ 
                error: 'OpenAI API quota exceeded',
                errorType: 'quota_exceeded',
                results,
                message: `Generated ${results.generated} analyses before quota limit. Already-analyzed participants will be skipped if you run this again.`
              }, 429);
            }
          } catch (e) {
            // Not JSON, continue with error
          }
          
          console.error(`Error generating analysis for ${participantId}:`, errorText);
          results.errors++;
          continue;
        }
        
        const openaiData = await openaiResponse.json();
        const analysisText = openaiData.choices[0].message.content;
        
        // Parse JSON from response
        let analysis;
        try {
          const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            analysis = JSON.parse(jsonMatch[0]);
          } else {
            analysis = JSON.parse(analysisText);
          }
        } catch (e) {
          console.error(`Failed to parse analysis JSON for ${participantId}`);
          results.errors++;
          continue;
        }
        
        // Add metadata
        const fullAnalysis = {
          ...analysis,
          generatedAt: new Date().toISOString(),
          model: 'gpt-4',
          participantId
        };
        
        // Store analysis
        await kv.set(`analysis:${participantId}`, fullAnalysis);
        
        console.log(`✅ Generated analysis for ${participantId}`);
        results.generated++;
        
      } catch (error) {
        console.error(`Error processing participant:`, error);
        results.errors++;
      }
    }
    
    console.log('Bulk AI analysis complete:', results);
    
    return c.json({
      success: true,
      message: `AI analysis generation complete. Generated ${results.generated}, skipped ${results.skipped}, errors ${results.errors}.`,
      results
    });
    
  } catch (error) {
    console.error('Error in bulk AI analysis:', error);
    return c.json({ error: `Failed to generate analyses: ${error}` }, 500);
  }
});

// Star/unstar a participant
app.post("/make-server-b0f3b375/admin/star-participant", async (c) => {
  try {
    const { participantId, starred } = await c.json();
    
    if (!participantId) {
      return c.json({ error: 'Participant ID required' }, 400);
    }
    
    console.log(`${starred ? 'Starring' : 'Unstarring'} participant:`, participantId);
    
    // Get existing participant data
    const participantData = await kv.get(`participant:${participantId}`);
    if (!participantData) {
      return c.json({ error: 'Participant not found' }, 404);
    }
    
    // Update with starred status
    const updatedData = {
      ...participantData,
      starred: starred === true
    };
    
    await kv.set(`participant:${participantId}`, updatedData);
    
    console.log(`✅ Participant ${participantId} ${starred ? 'starred' : 'unstarred'}`);
    
    return c.json({ success: true, starred: starred === true });
  } catch (error) {
    console.error('Error starring participant:', error);
    return c.json({ error: 'Failed to update star status' }, 500);
  }
});

// Delete a participant and all associated data
app.delete("/make-server-b0f3b375/admin/delete-participant/:id", async (c) => {
  try {
    const participantId = c.req.param('id');
    
    if (!participantId) {
      return c.json({ error: 'Participant ID required' }, 400);
    }
    
    console.log('🗑️ Deleting participant:', participantId);
    
    // Check if participant exists
    const participantData = await kv.get(`participant:${participantId}`);
    if (!participantData) {
      return c.json({ error: 'Participant not found' }, 404);
    }
    
    // Delete participant data
    await kv.del(`participant:${participantId}`);
    console.log('✅ Deleted participant data');
    
    // Delete all recordings for this participant
    const recordings = await kv.getByPrefix(`recording:${participantId}:`);
    if (recordings && recordings.length > 0) {
      const recordingKeys = [];
      for (let i = 1; i <= 6; i++) {
        recordingKeys.push(`recording:${participantId}:task${i}`);
      }
      await kv.mdel(recordingKeys);
      console.log(`✅ Deleted ${recordings.length} recordings`);
      
      // Also delete files from storage if they exist
      const bucketName = 'make-b0f3b375-recordings';
      for (const recording of recordings) {
        if (recording.audioPath) {
          try {
            await supabase.storage.from(bucketName).remove([recording.audioPath]);
          } catch (err) {
            console.warn('Could not delete audio file:', recording.audioPath);
          }
        }
        if (recording.screenPath) {
          try {
            await supabase.storage.from(bucketName).remove([recording.screenPath]);
          } catch (err) {
            console.warn('Could not delete screen file:', recording.screenPath);
          }
        }
      }
    }
    
    // Delete all transcripts for this participant (legacy)
    const transcripts = await kv.getByPrefix(`transcript:${participantId}:`);
    if (transcripts && transcripts.length > 0) {
      const transcriptKeys = [];
      for (let i = 1; i <= 6; i++) {
        transcriptKeys.push(`transcript:${participantId}:task${i}`);
      }
      await kv.mdel(transcriptKeys);
      console.log(`✅ Deleted ${transcripts.length} transcripts`);
    }
    
    // Delete AI analysis if it exists
    const analysis = await kv.get(`analysis:${participantId}`);
    if (analysis) {
      await kv.del(`analysis:${participantId}`);
      console.log('✅ Deleted AI analysis');
    }
    
    console.log(`✅ Successfully deleted all data for participant: ${participantId}`);
    
    return c.json({ 
      success: true,
      message: 'Participant and all associated data deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting participant:', error);
    return c.json({ error: `Failed to delete participant: ${error}` }, 500);
  }
});

// Bulk delete participants
app.post("/make-server-b0f3b375/admin/bulk-delete", async (c) => {
  try {
    const { participantIds } = await c.json();
    
    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      return c.json({ error: 'Valid participant IDs array required' }, 400);
    }
    
    console.log(`🗑️ Bulk deleting ${participantIds.length} participants...`);
    
    const bucketName = 'make-b0f3b375-recordings';
    const results = {
      success: 0,
      failed: 0,
      errors: []
    };
    
    for (const participantId of participantIds) {
      try {
        console.log(`Deleting participant: ${participantId}`);
        
        // Get participant data
        const participantData = await kv.get(`participant:${participantId}`);
        if (!participantData) {
          results.failed++;
          results.errors.push({ participantId, error: 'Not found' });
          continue;
        }
        
        // Delete main participant record
        await kv.del(`participant:${participantId}`);
        
        // Delete recordings metadata and files
        const recordings = await kv.getByPrefix(`recording:${participantId}:`);
        if (recordings && recordings.length > 0) {
          const recordingKeys = [];
          for (let i = 1; i <= 6; i++) {
            recordingKeys.push(`recording:${participantId}:task${i}`);
          }
          await kv.mdel(recordingKeys);
          
          // Delete storage files
          for (const recording of recordings) {
            if (recording?.audioPath) {
              try {
                await supabase.storage.from(bucketName).remove([recording.audioPath]);
              } catch (err) {
                console.warn('Could not delete audio file:', recording.audioPath);
              }
            }
            if (recording?.screenPath) {
              try {
                await supabase.storage.from(bucketName).remove([recording.screenPath]);
              } catch (err) {
                console.warn('Could not delete screen file:', recording.screenPath);
              }
            }
          }
        }
        
        // Delete transcripts
        const transcriptKeys = [];
        for (let i = 1; i <= 6; i++) {
          transcriptKeys.push(`transcript:${participantId}:task${i}`);
        }
        await kv.mdel(transcriptKeys);
        
        // Delete AI analysis
        await kv.del(`analysis:${participantId}`);
        
        results.success++;
        console.log(`✅ Deleted participant: ${participantId}`);
      } catch (error) {
        results.failed++;
        results.errors.push({ participantId, error: String(error) });
        console.error(`❌ Failed to delete ${participantId}:`, error);
      }
    }
    
    console.log(`✅ Bulk delete complete: ${results.success} success, ${results.failed} failed`);
    
    return c.json({ 
      success: true,
      results
    });
  } catch (error) {
    console.error('Error in bulk delete:', error);
    return c.json({ error: `Failed to bulk delete: ${error}` }, 500);
  }
});

// Bulk star/unstar participants
app.post("/make-server-b0f3b375/admin/bulk-star", async (c) => {
  try {
    const { participantIds, starred } = await c.json();
    
    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      return c.json({ error: 'Valid participant IDs array required' }, 400);
    }
    
    if (typeof starred !== 'boolean') {
      return c.json({ error: 'Starred status (true/false) required' }, 400);
    }
    
    console.log(`⭐ Bulk ${starred ? 'starring' : 'unstarring'} ${participantIds.length} participants...`);
    
    const results = {
      success: 0,
      failed: 0,
      errors: []
    };
    
    for (const participantId of participantIds) {
      try {
        console.log(`${starred ? 'Starring' : 'Unstarring'} participant: ${participantId}`);
        
        // Get participant data
        const participantData = await kv.get(`participant:${participantId}`);
        if (!participantData) {
          results.failed++;
          results.errors.push({ participantId, error: 'Not found' });
          continue;
        }
        
        // Update with starred status
        const updatedData = {
          ...participantData,
          starred: starred
        };
        
        await kv.set(`participant:${participantId}`, updatedData);
        results.success++;
        console.log(`✅ ${starred ? 'Starred' : 'Unstarred'} participant: ${participantId}`);
      } catch (error) {
        results.failed++;
        results.errors.push({ participantId, error: String(error) });
        console.error(`❌ Failed to update ${participantId}:`, error);
      }
    }
    
    console.log(`✅ Bulk star complete: ${results.success} success, ${results.failed} failed`);
    
    return c.json({ 
      success: true,
      results
    });
  } catch (error) {
    console.error('Error in bulk star:', error);
    return c.json({ error: `Failed to bulk star: ${error}` }, 500);
  }
});

// Get all buckets
app.get("/make-server-b0f3b375/admin/buckets", async (c) => {
  try {
    const bucketsData = await kv.get('admin:buckets');
    const buckets = bucketsData || [];
    return c.json({ buckets });
  } catch (error) {
    console.error('Error getting buckets:', error);
    return c.json({ error: 'Failed to get buckets' }, 500);
  }
});

// Create a new bucket
app.post("/make-server-b0f3b375/admin/buckets", async (c) => {
  try {
    const { name, color } = await c.json();
    
    if (!name || !name.trim()) {
      return c.json({ error: 'Bucket name required' }, 400);
    }
    
    const bucketsData = await kv.get('admin:buckets');
    const buckets = bucketsData || [];
    
    // Check for duplicate name
    if (buckets.some((b: any) => b.name.toLowerCase() === name.trim().toLowerCase())) {
      return c.json({ error: 'Bucket name already exists' }, 400);
    }
    
    const newBucket = {
      id: 'bucket-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      name: name.trim(),
      color: color || '#3b82f6', // default blue
      createdAt: new Date().toISOString()
    };
    
    buckets.push(newBucket);
    await kv.set('admin:buckets', buckets);
    
    console.log('✅ Created bucket:', newBucket.name);
    
    return c.json({ bucket: newBucket });
  } catch (error) {
    console.error('Error creating bucket:', error);
    return c.json({ error: 'Failed to create bucket' }, 500);
  }
});

// Update bucket
app.put("/make-server-b0f3b375/admin/buckets/:id", async (c) => {
  try {
    const bucketId = c.req.param('id');
    const { name, color } = await c.json();
    
    const bucketsData = await kv.get('admin:buckets');
    const buckets = bucketsData || [];
    
    const bucketIndex = buckets.findIndex((b: any) => b.id === bucketId);
    if (bucketIndex === -1) {
      return c.json({ error: 'Bucket not found' }, 404);
    }
    
    // Check for duplicate name (excluding current bucket)
    if (name && buckets.some((b: any, i: number) => i !== bucketIndex && b.name.toLowerCase() === name.trim().toLowerCase())) {
      return c.json({ error: 'Bucket name already exists' }, 400);
    }
    
    if (name) buckets[bucketIndex].name = name.trim();
    if (color) buckets[bucketIndex].color = color;
    buckets[bucketIndex].updatedAt = new Date().toISOString();
    
    await kv.set('admin:buckets', buckets);
    
    console.log('✅ Updated bucket:', buckets[bucketIndex].name);
    
    return c.json({ bucket: buckets[bucketIndex] });
  } catch (error) {
    console.error('Error updating bucket:', error);
    return c.json({ error: 'Failed to update bucket' }, 500);
  }
});

// Delete bucket
app.delete("/make-server-b0f3b375/admin/buckets/:id", async (c) => {
  try {
    const bucketId = c.req.param('id');
    
    const bucketsData = await kv.get('admin:buckets');
    const buckets = bucketsData || [];
    
    const bucketIndex = buckets.findIndex((b: any) => b.id === bucketId);
    if (bucketIndex === -1) {
      return c.json({ error: 'Bucket not found' }, 404);
    }
    
    const deletedBucket = buckets[bucketIndex];
    buckets.splice(bucketIndex, 1);
    await kv.set('admin:buckets', buckets);
    
    // Remove bucket assignment from all participants
    const participants = await kv.getByPrefix('participant:');
    if (participants && participants.length > 0) {
      for (const participant of participants) {
        if (participant?.bucketId === bucketId) {
          const updatedParticipant = { ...participant };
          delete updatedParticipant.bucketId;
          await kv.set(`participant:${participant.participantId}`, updatedParticipant);
        }
      }
    }
    
    console.log('✅ Deleted bucket:', deletedBucket.name);
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting bucket:', error);
    return c.json({ error: 'Failed to delete bucket' }, 500);
  }
});

// Assign participant(s) to bucket
app.post("/make-server-b0f3b375/admin/assign-bucket", async (c) => {
  try {
    const { participantIds, bucketId } = await c.json();
    
    if (!participantIds || !Array.isArray(participantIds)) {
      return c.json({ error: 'Valid participant IDs array required' }, 400);
    }
    
    // Verify bucket exists (unless removing from bucket)
    if (bucketId) {
      const bucketsData = await kv.get('admin:buckets');
      const buckets = bucketsData || [];
      if (!buckets.some((b: any) => b.id === bucketId)) {
        return c.json({ error: 'Bucket not found' }, 404);
      }
    }
    
    console.log(`📂 Assigning ${participantIds.length} participants to bucket:`, bucketId || 'none');
    
    for (const participantId of participantIds) {
      const participantData = await kv.get(`participant:${participantId}`);
      if (participantData) {
        const updatedData = { ...participantData };
        if (bucketId) {
          updatedData.bucketId = bucketId;
        } else {
          delete updatedData.bucketId;
        }
        await kv.set(`participant:${participantId}`, updatedData);
      }
    }
    
    console.log('✅ Bucket assignment complete');
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Error assigning bucket:', error);
    return c.json({ error: 'Failed to assign bucket' }, 500);
  }
});

// Helper function to delay execution (for rate limiting)
async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Retroactively transcribe all existing recordings with rate limiting
app.post("/make-server-b0f3b375/admin/transcribe-all", async (c) => {
  try {
    console.log('🎤 Starting retroactive transcription of all recordings...');
    console.log('⏱️  Rate Limit: 3 requests per minute (20 seconds between requests)');
    
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      return c.json({ 
        error: 'OpenAI API key not configured. Cannot transcribe recordings.',
        errorType: 'no_api_key'
      }, 400);
    }

    // Get all recordings
    const allRecordings = await kv.getByPrefix('recording:');
    console.log(`Found ${allRecordings.length} recording records`);
    
    if (!allRecordings || allRecordings.length === 0) {
      return c.json({ 
        message: 'No recordings found',
        processed: 0,
        transcribed: 0,
        skipped: 0,
        errors: 0
      });
    }

    // Filter to only recordings that need transcription
    const recordingsToProcess = allRecordings.filter(r => 
      r && r.audioPath && (!r.transcript || r.transcript.length === 0)
    );
    
    console.log(`Found ${recordingsToProcess.length} recordings that need transcription`);
    console.log(`⏱️  Estimated time: ${Math.ceil(recordingsToProcess.length * 20 / 60)} minutes`);

    const bucketName = 'make-b0f3b375-recordings';
    const results = {
      processed: 0,
      transcribed: 0,
      skipped: 0,
      errors: 0,
      details: [] as any[]
    };

    let consecutiveErrors = 0;

    for (const recording of allRecordings) {
      if (!recording) continue;
      
      results.processed++;
      const { participantId, taskNumber, audioPath, transcript } = recording;
      
      console.log(`\n📋 [${results.processed}/${allRecordings.length}] Processing ${participantId} - Task ${taskNumber}`);
      console.log(`   Has audio: ${!!audioPath}`);
      console.log(`   Current transcript length: ${transcript?.length || 0}`);
      
      // Skip if no audio or already has transcript
      if (!audioPath) {
        console.log('   ⏭️  Skipping - no audio file');
        results.skipped++;
        results.details.push({
          participantId,
          taskNumber,
          status: 'skipped',
          reason: 'No audio file'
        });
        continue;
      }
      
      if (transcript && transcript.length > 0) {
        console.log('   ⏭️  Skipping - already has transcript');
        results.skipped++;
        results.details.push({
          participantId,
          taskNumber,
          status: 'skipped',
          reason: 'Already has transcript'
        });
        continue;
      }

      try {
        // Download audio from storage
        console.log(`   📥 Downloading audio from: ${audioPath}`);
        const { data: audioData, error: downloadError } = await supabase.storage
          .from(bucketName)
          .download(audioPath);
        
        if (downloadError || !audioData) {
          console.error('   ❌ Failed to download audio:', downloadError);
          results.errors++;
          results.details.push({
            participantId,
            taskNumber,
            status: 'error',
            reason: `Download failed: ${downloadError?.message || 'Unknown error'}`
          });
          continue;
        }

        console.log(`   ✅ Downloaded ${audioData.size} bytes`);
        
        // Convert blob to ArrayBuffer
        const audioBuffer = await audioData.arrayBuffer();
        
        // Transcribe using Whisper
        console.log('   🎤 Transcribing with Whisper API...');
        const generatedTranscript = await transcribeAudio(audioBuffer);
        
        if (!generatedTranscript || generatedTranscript.length === 0) {
          console.warn('   ⚠️  Transcription returned empty - audio may be silent or API error occurred');
          results.errors++;
          consecutiveErrors++;
          results.details.push({
            participantId,
            taskNumber,
            status: 'error',
            reason: 'Transcription returned empty (may be quota issue or silent audio)'
          });
          
          // If we've hit multiple errors in a row, likely a quota/rate limit issue
          if (consecutiveErrors >= 2) {
            console.error('❌ Multiple consecutive transcription failures - likely rate limit or quota issue. Stopping.');
            return c.json({
              error: 'Multiple transcription failures. This may be a rate limit or quota issue. Please wait a few minutes and try again.',
              errorType: 'quota_exceeded',
              results
            }, 429);
          }
          
          continue;
        }

        // Reset consecutive errors on success
        consecutiveErrors = 0;

        // Update the recording with transcript
        console.log(`   💾 Saving transcript (${generatedTranscript.length} chars)`);
        const updatedRecording = {
          ...recording,
          transcript: generatedTranscript
        };
        
        await kv.set(`recording:${participantId}:task${taskNumber}`, updatedRecording);
        
        results.transcribed++;
        results.details.push({
          participantId,
          taskNumber,
          status: 'success',
          transcriptLength: generatedTranscript.length
        });
        
        console.log(`   ✅ Successfully transcribed and saved`);
        
        // Rate limiting: Wait 20 seconds between API calls (3 per minute limit)
        // Only delay if there are more recordings to process
        const remainingToTranscribe = recordingsToProcess.length - results.transcribed;
        if (remainingToTranscribe > 0) {
          const estimatedMinutesRemaining = Math.ceil(remainingToTranscribe * 20 / 60);
          console.log(`   ⏱️  Rate limiting: Waiting 20 seconds before next request...`);
          console.log(`   📊 Progress: ${results.transcribed}/${recordingsToProcess.length} transcribed`);
          console.log(`   ⏳ Estimated time remaining: ~${estimatedMinutesRemaining} minute${estimatedMinutesRemaining !== 1 ? 's' : ''}`);
          await delay(20000); // 20 seconds
        }
        
      } catch (error: any) {
        console.error(`   ❌ Error processing recording:`, error);
        
        // Check if it's a rate limit error
        if (error?.message?.includes('rate_limit_exceeded')) {
          console.error('   🚨 Rate limit detected - this should not happen with our pacing!');
          console.error('   ⏱️  Waiting 60 seconds to be safe...');
          await delay(60000); // Wait 60 seconds to be extra safe
          consecutiveErrors = 0; // Reset error counter after waiting
        } else if (error?.message?.includes('quota_exceeded')) {
          console.error('   💳 Quota exceeded - stopping transcription process.');
          return c.json({
            error: 'OpenAI quota exceeded. Please add credits at https://platform.openai.com/account/billing',
            errorType: 'quota_exceeded',
            results
          }, 429);
        } else {
          consecutiveErrors++;
        }
        
        results.errors++;
        results.details.push({
          participantId,
          taskNumber,
          status: 'error',
          reason: String(error)
        });
        
        // Stop if too many consecutive errors (but not rate limit errors)
        if (consecutiveErrors >= 2 && !error?.message?.includes('rate_limit')) {
          console.error('❌ Too many consecutive errors - stopping transcription.');
          return c.json({
            error: 'Multiple errors occurred. Please check console logs and try again.',
            errorType: 'multiple_errors',
            results
          }, 500);
        }
      }
    }

    console.log('\n📊 Transcription Summary:');
    console.log(`   Total processed: ${results.processed}`);
    console.log(`   Successfully transcribed: ${results.transcribed}`);
    console.log(`   Skipped: ${results.skipped}`);
    console.log(`   Errors: ${results.errors}`);
    
    return c.json({
      success: true,
      message: `Processed ${results.processed} recordings. Transcribed ${results.transcribed}, skipped ${results.skipped}, errors ${results.errors}.`,
      results
    });
    
  } catch (error) {
    console.error('❌ Error in retroactive transcription:', error);
    return c.json({ 
      error: `Failed to transcribe recordings: ${error}` 
    }, 500);
  }
});

// Admin: Diagnostic endpoint to check all KV store data
app.get("/make-server-b0f3b375/admin/diagnostic", async (c) => {
  try {
    console.log('🔍 DIAGNOSTIC: Checking all KV store data...');
    
    // Get all participants
    const allParticipants = await kv.getByPrefix('participant:');
    console.log('📊 Total entries with prefix "participant:":', allParticipants?.length || 0);
    
    // Log each participant in detail
    const participantDetails = allParticipants.map((p: any, idx: number) => {
      if (!p) {
        console.log(`Entry ${idx + 1}: NULL or UNDEFINED`);
        return { index: idx + 1, status: 'NULL' };
      }
      
      const details = {
        index: idx + 1,
        participantId: p.participantId || 'MISSING',
        ipAddress: p.ipAddress || 'MISSING',
        submitted: p.submitted,
        submittedType: typeof p.submitted,
        submittedAt: p.submittedAt || 'MISSING',
        startedAt: p.startedAt || 'MISSING',
        hasDemographics: !!p.demographics,
        hasScreening: !!p.screening,
        hasTasks: !!p.tasks,
        hasClosing: !!p.closing,
        hasResponses: !!p.responses,
        isFallback: !!p.isFallback,
        declined: !!p.declined,
        allKeys: Object.keys(p)
      };
      
      console.log(`\nParticipant ${idx + 1}:`, JSON.stringify(details, null, 2));
      return details;
    });
    
    // Count by status
    const stats = {
      total: allParticipants?.length || 0,
      nullEntries: allParticipants.filter((p: any) => !p).length,
      withParticipantId: allParticipants.filter((p: any) => p && p.participantId).length,
      missingParticipantId: allParticipants.filter((p: any) => p && !p.participantId).length,
      submitted: allParticipants.filter((p: any) => p && p.submitted === true).length,
      notSubmitted: allParticipants.filter((p: any) => p && p.submitted !== true).length,
      withDemographics: allParticipants.filter((p: any) => p && p.demographics).length,
      withTasks: allParticipants.filter((p: any) => p && p.tasks).length,
      withResponses: allParticipants.filter((p: any) => p && p.responses).length,
      declined: allParticipants.filter((p: any) => p && p.declined).length,
      fallback: allParticipants.filter((p: any) => p && p.isFallback).length
    };
    
    console.log('\n📊 STATISTICS:', JSON.stringify(stats, null, 2));
    
    return c.json({
      message: 'Diagnostic complete - check server logs',
      stats,
      participants: participantDetails
    });
  } catch (error) {
    console.error('❌ Diagnostic error:', error);
    return c.json({ error: `Diagnostic failed: ${error}` }, 500);
  }
});

// Recovery/Debug endpoint to find lost recordings
app.get("/make-server-b0f3b375/admin/recovery/check-recordings", async (c) => {
  try {
    console.log('🔍 ============ RECOVERY CHECK STARTED ============');
    
    // Import recovery functions
    const { listAllRecordings, listAllStorageFiles, findOrphanedFiles, findMissingFiles } = await import('./recovery.tsx');
    
    const kvRecordings = await listAllRecordings();
    const storageFiles = await listAllStorageFiles();
    const orphanedFiles = await findOrphanedFiles();
    const missingFiles = await findMissingFiles();
    
    const summary = {
      kvRecordingsCount: kvRecordings.length,
      storageFilesCount: storageFiles.length,
      orphanedFilesCount: orphanedFiles.length,
      missingFilesCount: missingFiles.length,
      kvRecordings: kvRecordings.map((r: any) => ({
        participantId: r.participantId,
        taskNumber: r.taskNumber,
        hasAudio: !!r.audioPath,
        hasScreen: !!r.screenPath,
        hasTranscript: !!r.transcript,
        timestamp: r.timestamp
      })),
      storageFiles: storageFiles.map((f: any) => ({
        name: f.name,
        size: f.metadata?.size || 0,
        created: f.created_at
      })),
      orphanedFiles: orphanedFiles.map((f: any) => f.name),
      missingFiles
    };
    
    console.log('🔍 ============ RECOVERY CHECK COMPLETE ============');
    console.log('Summary:', JSON.stringify(summary, null, 2));
    
    return c.json(summary);
  } catch (error) {
    console.error('❌ Recovery check error:', error);
    return c.json({ error: `Recovery check failed: ${error}` }, 500);
  }
});

// Repair orphaned files by creating database entries
app.post("/make-server-b0f3b375/admin/recovery/repair-orphaned", async (c) => {
  try {
    console.log('🔧 ============ REPAIR ORPHANED FILES STARTED ============');
    
    const { repairOrphanedFiles } = await import('./repair.tsx');
    const repaired = await repairOrphanedFiles();
    
    console.log('🔧 ============ REPAIR COMPLETE ============');
    console.log(`Repaired ${repaired.length} recordings`);
    
    return c.json({ 
      success: true, 
      repaired: repaired.length,
      recordings: repaired 
    });
  } catch (error) {
    console.error('❌ Repair error:', error);
    return c.json({ error: `Repair failed: ${error}` }, 500);
  }
});

// Sync database with storage (remove missing file paths)
app.post("/make-server-b0f3b375/admin/recovery/sync", async (c) => {
  try {
    console.log('🔄 ============ SYNC DATABASE WITH STORAGE STARTED ============');
    
    const { syncDatabaseWithStorage } = await import('./repair.tsx');
    const updated = await syncDatabaseWithStorage();
    
    console.log('🔄 ============ SYNC COMPLETE ============');
    console.log(`Updated ${updated.length} database entries`);
    
    return c.json({ 
      success: true, 
      updated: updated.length,
      recordings: updated 
    });
  } catch (error) {
    console.error('❌ Sync error:', error);
    return c.json({ error: `Sync failed: ${error}` }, 500);
  }
});

// Clean up database entries with missing files
app.post("/make-server-b0f3b375/admin/recovery/cleanup", async (c) => {
  try {
    console.log('🧹 ============ CLEANUP STARTED ============');
    
    const { cleanupMissingFiles } = await import('./repair.tsx');
    const deleted = await cleanupMissingFiles();
    
    console.log('🧹 ============ CLEANUP COMPLETE ============');
    console.log(`Deleted ${deleted.length} database entries`);
    
    return c.json({ 
      success: true, 
      deleted: deleted.length,
      recordings: deleted 
    });
  } catch (error) {
    console.error('❌ Cleanup error:', error);
    return c.json({ error: `Cleanup failed: ${error}` }, 500);
  }
});

Deno.serve(app.fetch);