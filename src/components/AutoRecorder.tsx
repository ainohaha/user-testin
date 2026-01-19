import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Card } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Monitor, Loader2, AlertTriangle } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { recordingQueue } from '../utils/recording-queue';

interface AutoRecorderProps {
  taskNumber: number;
  participantId: string;
  screenStream: MediaStream;
  onRecordingComplete: () => void;
}

export interface AutoRecorderRef {
  stopRecording: () => Promise<void>;
}

export const AutoRecorder = forwardRef<AutoRecorderRef, AutoRecorderProps>(({ 
  taskNumber, 
  participantId, 
  screenStream,
  onRecordingComplete 
}, ref) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveComplete, setSaveComplete] = useState(false);
  const [error, setError] = useState<string>('');
  const [currentScreenStream, setCurrentScreenStream] = useState<MediaStream>(screenStream);
  
  const screenRecorderRef = useRef<MediaRecorder | null>(null);
  const screenChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const dataRequestInterval = useRef<NodeJS.Timeout | null>(null);

  useImperativeHandle(ref, () => ({
    stopRecording: async () => {
      return stopRecording();
    }
  }));

  // Auto-start recording when component mounts
  useEffect(() => {
    console.log('🔍 AutoRecorder mount - checking screen stream...');
    console.log('  - currentScreenStream exists?', !!currentScreenStream);
    console.log('  - currentScreenStream value:', currentScreenStream);
    
    if (!currentScreenStream) {
      console.error('❌ Screen stream is not available');
      setError('Screen stream is not available');
      return;
    }
    
    console.log('  - currentScreenStream.active?', currentScreenStream.active);
    console.log('  - currentScreenStream.id:', currentScreenStream.id);
    console.log('  - currentScreenStream tracks:', currentScreenStream.getTracks().length);
    currentScreenStream.getTracks().forEach((track, idx) => {
      console.log(`    Track ${idx}:`, {
        kind: track.kind,
        enabled: track.enabled,
        muted: track.muted,
        readyState: track.readyState,
        label: track.label
      });
    });
    
    if (!currentScreenStream.active) {
      console.error('❌ Screen stream is not active');
      setError('Screen stream is not active');
      return;
    }

    console.log('✅ Screen stream is valid - starting recording');
    startRecording();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentScreenStream]);

  const startRecording = async () => {
    try {
      setError('');
      screenChunksRef.current = [];

      console.log('🎬 ============ STARTING SCREEN RECORDING ============');
      console.log('Task number:', taskNumber);
      console.log('Participant ID:', participantId);

      // Start screen recording - FIREFOX FIX: Use simplest possible config
      // Firefox MediaRecorder has issues with specific codecs and bitrates
      console.log('🔍 Testing MediaRecorder mime type support:');
      console.log('  - video/webm:', MediaRecorder.isTypeSupported('video/webm'));
      console.log('  - video/webm;codecs=vp8:', MediaRecorder.isTypeSupported('video/webm;codecs=vp8'));
      console.log('  - video/webm;codecs=vp9:', MediaRecorder.isTypeSupported('video/webm;codecs=vp9'));
      
      // Try simplest config first - just video/webm with NO codec specification
      const screenRecorder = new MediaRecorder(currentScreenStream, { 
        mimeType: 'video/webm'
        // NO videoBitsPerSecond - let Firefox choose!
      });
      screenRecorderRef.current = screenRecorder;
      
      console.log('✅ MediaRecorder created with mimeType:', screenRecorder.mimeType);

      console.log('📝 Setting up ondataavailable handler...');
      screenRecorder.ondataavailable = (event) => {
        console.log('🎉 ondataavailable FIRED! Event:', event);
        console.log('   - event.data:', event.data);
        console.log('   - event.data.size:', event.data.size);
        console.log('   - event.data.type:', event.data.type);
        
        if (event.data.size > 0) {
          console.log('📹 Data chunk received, size:', event.data.size);
          screenChunksRef.current.push(event.data);
          console.log('📹 Total chunks now:', screenChunksRef.current.length);
        } else {
          console.warn('⚠️ ondataavailable fired but data.size is 0');
        }
      };
      console.log('✅ ondataavailable handler registered');
      console.log('   - Handler exists?', !!screenRecorder.ondataavailable);
      console.log('   - Handler function:', screenRecorder.ondataavailable);

      // SET UP ONSTOP HANDLER HERE - when recording starts, not when it stops!
      let onstopFired = false;
      screenRecorder.onstop = async () => {
        if (onstopFired) {
          console.log('⚠️ onstop already fired, skipping duplicate');
          return;
        }
        onstopFired = true;
        
        console.log('📹 MediaRecorder stopped event fired');
        console.log('💾 Saving recordings with', screenChunksRef.current.length, 'chunks');
        
        // Create and add upload promise to queue
        const uploadPromise = saveRecordings();
        recordingQueue.addUpload(uploadPromise);
        
        await uploadPromise;
      };

      screenRecorder.onerror = (event: any) => {
        console.error('Screen recorder error:', event);
        setError('Screen recording error occurred');
      };

      // CRITICAL FIX FOR FIREFOX: Start WITHOUT timeslice, then manually request data
      // Firefox has a bug where ondataavailable doesn't fire reliably with small timeslices
      console.log('🚀 Starting MediaRecorder WITHOUT timeslice (will request data manually)');
      screenRecorder.start(); // No timeslice parameter!
      
      // IMMEDIATELY test if recording actually started
      console.log('📊 MediaRecorder state after start():', screenRecorder.state);
      
      // Request data IMMEDIATELY to test if it works
      setTimeout(() => {
        if (screenRecorderRef.current && screenRecorderRef.current.state === 'recording') {
          console.log('🧪 TEST: Requesting initial data chunk to verify recording works...');
          screenRecorderRef.current.requestData();
        }
      }, 100); // Request after 100ms

      // MANUALLY request data every 500ms to work around Firefox bug
      dataRequestInterval.current = setInterval(() => {
        if (screenRecorderRef.current && screenRecorderRef.current.state === 'recording') {
          console.log('🔔 Manually requesting data from MediaRecorder');
          screenRecorderRef.current.requestData();
        }
      }, 500); // Request data every 500ms

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      setIsRecording(true);
      console.log('🎬 Screen recorder started for task', taskNumber);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      setError('Failed to start recording');
    }
  };

  const stopRecording = (): Promise<void> => {
    console.log('🛑 ============ STOP RECORDING CALLED ============');
    console.log('Task number:', taskNumber);
    console.log('Participant ID:', participantId);
    console.log('Chunks collected so far:', screenChunksRef.current.length);
    
    return new Promise<void>((resolve) => {
      // Clear all intervals
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (dataRequestInterval.current) {
        console.log('🛑 Stopping manual data request interval');
        clearInterval(dataRequestInterval.current);
      }

      setIsSaving(true);

      // Stop the MediaRecorder - onstop handler (set up in startRecording) will save it
      if (screenRecorderRef.current && screenRecorderRef.current.state !== 'inactive') {
        console.log('📹 Stopping MediaRecorder (current state:', screenRecorderRef.current.state, ')');
        
        // Set a timeout as backup in case onstop never fires
        const onstopTimeout = setTimeout(() => {
          console.warn('⚠️⚠️⚠️ onstop event did not fire within 2 seconds - uploading anyway!');
          console.log('💾 Saving recordings with', screenChunksRef.current.length, 'chunks (timeout fallback)');
          
          const uploadPromise = saveRecordings();
          recordingQueue.addUpload(uploadPromise);
        }, 2000); // 2 second timeout
        
        // Override onstop to also clear timeout
        const originalOnstop = screenRecorderRef.current.onstop;
        screenRecorderRef.current.onstop = (event) => {
          clearTimeout(onstopTimeout);
          if (originalOnstop) {
            (originalOnstop as any).call(screenRecorderRef.current, event);
          }
        };
        
        screenRecorderRef.current.stop();
      } else {
        console.warn('⚠️ MediaRecorder already inactive or missing');
        // Upload immediately with whatever we have
        const uploadPromise = saveRecordings();
        recordingQueue.addUpload(uploadPromise);
      }
      
      // Resolve immediately - the onstop handler or timeout will take care of saving
      resolve();
    });
  };

  const saveRecordings = async () => {
    try {
      const screenBlob = new Blob(screenChunksRef.current, { type: 'video/webm' });

      console.log('💾 ============ SAVING RECORDINGS ============');
      console.log('Recording metadata:', {
        participantId,
        taskNumber,
        screenSize: screenBlob.size,
        screenBlobType: screenBlob.type,
        screenChunks: screenChunksRef.current.length
      });

      // Verify blob has data
      if (screenBlob.size === 0) {
        console.error('❌ CRITICAL: Screen blob is empty - no screen recording data captured');
        setError('Screen recording did not capture any data.');
        return;
      }

      // Upload to server
      const formData = new FormData();
      formData.append('participantId', participantId);
      formData.append('taskNumber', taskNumber.toString());
      formData.append('screenBlob', screenBlob, `${participantId}_task${taskNumber}_screen.webm`);
      formData.append('duration', recordingTime.toString());

      console.log('📤 Uploading screen recording to server...');
      console.log('📤 Upload URL:', `https://${projectId}.supabase.co/functions/v1/make-server-b0f3b375/upload-recording`);
      console.log('📤 Blob size:', screenBlob.size, 'bytes');
      console.log('📤 FormData contents:', {
        participantId,
        taskNumber,
        hasSreenBlob: !!screenBlob,
        duration: recordingTime
      });
      
      // Create an AbortController with a longer timeout for large files
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.error('⏱️ Upload timeout after 2 minutes');
        controller.abort();
      }, 120000); // 2 minute timeout
      
      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-b0f3b375/upload-recording`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
            },
            body: formData,
            signal: controller.signal,
            mode: 'cors', // Explicitly set CORS mode
            credentials: 'omit' // Don't send credentials
          }
        );
        
        clearTimeout(timeoutId);

        console.log('📥 Server response status:', response.status);
        const responseText = await response.text();
        console.log('📥 Server response body:', responseText);

        if (!response.ok) {
          console.error('❌ Upload failed with status:', response.status);
          throw new Error(`Upload failed: ${responseText}`);
        }

        const responseData = JSON.parse(responseText);
        console.log('✅ Upload successful! Server returned:', responseData);
        console.log('✅ Screen saved:', !!responseData.screenPath);

        setIsSaving(false);
        setSaveComplete(true);
        onRecordingComplete();
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        // Detailed error logging
        console.error('❌ Fetch error occurred:', fetchError);
        console.error('❌ Error name:', fetchError.name);
        console.error('❌ Error message:', fetchError.message);
        console.error('❌ Error type:', typeof fetchError);
        
        if (fetchError.name === 'AbortError') {
          console.error('❌ Upload was aborted (timeout or cancellation)');
          throw new Error('Upload timeout - recording was too large or connection too slow');
        } else if (fetchError.name === 'TypeError' && fetchError.message.includes('NetworkError')) {
          console.error('❌ NetworkError - this usually means CORS or the request was blocked');
          console.error('Possible causes:');
          console.error('  1. Supabase edge function is not responding');
          console.error('  2. CORS preflight failed');
          console.error('  3. Request body too large');
          console.error('  4. Browser security policy blocked the request');
          throw new Error('Network error during upload - server may be unavailable');
        }
        
        throw fetchError;
      }
    } catch (error) {
      console.error('❌ CRITICAL ERROR saving recordings:', error);
      console.error('❌ Error details:', error instanceof Error ? error.message : String(error));
      setError('Failed to save recording');
      setIsSaving(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // No visible UI - recording happens silently in background
  return null;
});

AutoRecorder.displayName = 'AutoRecorder';