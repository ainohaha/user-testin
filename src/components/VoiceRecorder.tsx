import { useState, useRef, useEffect } from 'react';
import { Card } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob, duration: number, transcript: string) => void;
  taskNumber: number;
  participantId?: string;
}

export function VoiceRecorder({ onRecordingComplete, taskNumber, participantId }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [hasRecorded, setHasRecorded] = useState(false);
  const [audioURL, setAudioURL] = useState<string>('');
  const [transcript, setTranscript] = useState<string>('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);
  const fullTranscriptRef = useRef<string>('');

  useEffect(() => {
    // Initialize speech recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptPiece = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcriptPiece + ' ';
          } else {
            interimTranscript += transcriptPiece;
          }
        }

        if (finalTranscript) {
          fullTranscriptRef.current += finalTranscript;
          setTranscript(fullTranscriptRef.current + interimTranscript);
        } else {
          setTranscript(fullTranscriptRef.current + interimTranscript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
      };
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioURL) URL.revokeObjectURL(audioURL);
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [audioURL]);

  const [permissionError, setPermissionError] = useState<string>('');

  const startRecording = async () => {
    try {
      setPermissionError('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      fullTranscriptRef.current = '';
      setTranscript('');

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);
        setHasRecorded(true);
        
        // Stop speech recognition
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }

        const finalTranscript = fullTranscriptRef.current.trim();
        
        // Store transcript on server
        if (participantId && finalTranscript) {
          setIsTranscribing(true);
          try {
            await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-b0f3b375/store-transcript`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${publicAnonKey}`
              },
              body: JSON.stringify({
                participantId,
                taskNumber,
                transcript: finalTranscript,
                duration: recordingTime
              })
            });
          } catch (error) {
            console.error('Failed to store transcript:', error);
          }
          setIsTranscribing(false);
        }
        
        onRecordingComplete(audioBlob, recordingTime, finalTranscript);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      // Start speech recognition
      if (recognitionRef.current) {
        recognitionRef.current.start();
      }
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error: any) {
      console.error('Error accessing microphone:', error);
      
      let errorMessage = '';
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Microphone access was blocked. Please click the camera/microphone icon in your browser\'s address bar and allow microphone access, then refresh the page.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No microphone detected. Please connect a microphone and try again.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Your microphone is already in use by another application. Please close other apps and try again.';
      } else {
        errorMessage = 'Unable to access microphone. Please check your browser settings and refresh the page.';
      }
      
      setPermissionError(errorMessage);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="p-4 bg-gradient-to-r from-red-50 to-pink-50 border-red-200">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3>Think Aloud Recording</h3>
            <p className="text-xs text-slate-600 mt-1">Narrate your thoughts as you complete the task</p>
          </div>
          {(isRecording || hasRecorded) && (
            <div className="text-sm px-3 py-1 bg-white rounded-full border border-red-200">
              {formatTime(recordingTime)}
            </div>
          )}
        </div>

        {permissionError && (
          <Alert className="border-red-300 bg-red-50">
            <AlertDescription className="text-sm">
              <strong>⚠️ Microphone Error:</strong> {permissionError}
              <div className="mt-2 text-xs space-y-1">
                <p><strong>Chrome/Edge:</strong> Click the camera icon in the address bar → Allow microphone</p>
                <p><strong>Firefox:</strong> Click the microphone icon in the address bar → Allow</p>
                <p><strong>Safari:</strong> Go to Safari → Settings for This Website → Microphone → Allow</p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {!hasRecorded && !permissionError && (
          <Alert className="border-red-300 bg-red-50">
            <AlertDescription className="text-sm">
              <strong>Required:</strong> Record your thoughts while completing the task. Click the recording button to {isRecording ? 'stop' : 'start'}.
            </AlertDescription>
          </Alert>
        )}

        {hasRecorded && (
          <Alert className="border-green-300 bg-green-50">
            <AlertDescription className="text-sm flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-green-600" />
              Recording completed ({formatTime(recordingTime)})
              {isTranscribing && ' • Saving transcript...'}
            </AlertDescription>
          </Alert>
        )}

        {/* Apple-style Recording Button */}
        <div className="flex flex-col items-center gap-3 py-4">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={hasRecorded}
            className={`relative transition-all duration-200 ${hasRecorded ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
            aria-label={isRecording ? 'Stop recording' : 'Start recording'}
          >
            {/* Outer pulse ring when recording */}
            {isRecording && (
              <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-20" />
            )}
            
            {/* Main button */}
            <div className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
              isRecording 
                ? 'bg-red-600 shadow-lg shadow-red-500/50' 
                : 'bg-red-500 hover:bg-red-600 shadow-md'
            }`}>
              {isRecording ? (
                // Square stop icon
                <div className="w-5 h-5 bg-white rounded-sm" />
              ) : (
                // Circle record icon (solid)
                <div className="w-5 h-5 bg-white rounded-full" />
              )}
            </div>
          </button>
          
          <p className="text-sm text-slate-700">
            {isRecording ? 'Recording...' : hasRecorded ? 'Recorded' : 'Tap to record'}
          </p>
        </div>

        {/* Live Transcript Preview */}
        {isRecording && transcript && (
          <div className="mt-3 p-3 bg-white rounded-lg border border-slate-200">
            <p className="text-xs text-slate-500 mb-1">Live transcript:</p>
            <p className="text-sm text-slate-700 italic">{transcript}</p>
          </div>
        )}

        {hasRecorded && audioURL && (
          <div className="space-y-2">
            <audio src={audioURL} controls className="w-full" />
            
            {transcript && (
              <div className="p-3 bg-white rounded-lg border border-slate-200">
                <p className="text-xs text-slate-500 mb-1">Transcript:</p>
                <p className="text-sm text-slate-700">{transcript}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
