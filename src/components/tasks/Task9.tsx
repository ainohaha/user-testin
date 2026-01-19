import { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Slider } from '../ui/slider';
import { AutoRecorder, AutoRecorderRef } from '../AutoRecorder';
import { Flag } from 'lucide-react';
import confetti from 'canvas-confetti';

interface Task9Props {
  onComplete: (data: Record<string, any>) => void;
  onPrevious?: () => void;
  taskNumber: number;
  totalTasks: number;
  participantId: string;
  micStream?: MediaStream | null;
  screenStream?: MediaStream | null;
  isRecording?: boolean;
  scenario?: string;
  existingData?: Record<string, any>;
}

export function Task9({ onComplete, onPrevious, taskNumber, totalTasks, participantId, micStream, screenStream, isRecording, scenario, existingData }: Task9Props) {
  const [completed, setCompleted] = useState(existingData?.completed || '');
  const [ease, setEase] = useState(existingData?.ease ? [existingData.ease] : [3]);
  const [feedback, setFeedback] = useState(existingData?.feedback || '');
  const [recordingComplete, setRecordingComplete] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showTimeWarning, setShowTimeWarning] = useState(false);
  const recorderRef = useRef<AutoRecorderRef>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setElapsedTime(elapsed);
      if (elapsed >= 120 && !showTimeWarning) {
        setShowTimeWarning(true);
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const handleRecordingComplete = () => {
    setRecordingComplete(true);
  };

  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  const triggerNervousLaugh = () => {
    const scalar = 2;
    const emoji = confetti.shapeFromText({ text: '😅', scalar });
    confetti({
      shapes: [emoji],
      particleCount: 30,
      spread: 100,
      origin: { y: 0.6 },
      scalar
    });
  };

  const handleSubmit = () => {
    // Stop and save recording in background (don't await)
    if (recorderRef.current && screenStream) {
      recorderRef.current.stopRecording();
    }
    
    // Trigger confetti immediately
    if (completed === 'yes') {
      triggerConfetti();
    } else if (completed === 'no') {
      triggerNervousLaugh();
    }
    
    // Move to next task immediately
    onComplete({
      completed,
      ease: ease[0],
      feedback
    });
  };

  const handlePrevious = () => {
    // Stop and save recording in background when going back
    if (recorderRef.current && screenStream) {
      recorderRef.current.stopRecording();
    }
    
    // Go to previous task immediately
    if (onPrevious) {
      onPrevious();
    }
  };

  const isComplete = completed !== '' && feedback.trim() !== '';

  return (
    <div className="space-y-6">
      {screenStream && (
        <AutoRecorder
          ref={recorderRef}
          taskNumber={taskNumber}
          participantId={participantId}
          micStream={isRecording ? micStream : null}
          screenStream={screenStream}
          onRecordingComplete={handleRecordingComplete}
        />
      )}

      {/* Task Objective */}
      {scenario && (
        <div 
          className="p-5 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg relative"
          style={{
            border: '2px solid transparent',
            backgroundImage: 'linear-gradient(white, white), radial-gradient(circle at top left, #3b82f6, #a855f7)',
            backgroundOrigin: 'border-box',
            backgroundClip: 'padding-box, border-box'
          }}
        >
          <div className="flex items-start gap-3">
            <Flag className="w-6 h-6 text-primary shrink-0 mt-0.5" />
            <p className="text-slate-700"><strong>{scenario}</strong></p>
          </div>
        </div>
      )}

      {/* Questions */}
      <Card className="p-6 space-y-5">
        <div className="space-y-3">
          <h3>Were you able to complete this goal? *</h3>
          
          <RadioGroup value={completed} onValueChange={setCompleted}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id="t9-yes" />
              <Label htmlFor="t9-yes">Yes</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="t9-no" />
              <Label htmlFor="t9-no" className="flex-1">
                <span>No</span>
                {showTimeWarning && (
                  <span className="ml-2 text-sm text-amber-600 italic">
                    Stuck? Explain how and keep moving forward.
                  </span>
                )}
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-3">
          <h3>How easy was it to check if the order was delivered and confirm payment? *</h3>
          <div className="space-y-2 px-2">
            <Slider
              value={ease}
              onValueChange={setEase}
              min={1}
              max={5}
              step={1}
              className="slider-blue"
            />
            <div className="flex justify-between items-center relative" style={{ paddingLeft: '0px', paddingRight: '0px' }}>
              {[1, 2, 3, 4, 5].map((num, index) => (
                <div 
                  key={num} 
                  className="flex flex-col items-center"
                  style={{ 
                    position: 'absolute',
                    left: `${index * 25}%`,
                    transform: 'translateX(-50%)'
                  }}
                >
                  <span className={`text-sm ${ease[0] === num ? 'text-primary' : 'text-slate-400'}`}>
                    {num}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-slate-500 pt-4">
              <span>Very difficult</span>
              <span>Very easy</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Label htmlFor="t9-feedback">
            What did you think about checking order delivery and payment status? Any confusion or improvements? *
          </Label>
          <Textarea
            id="t9-feedback"
            placeholder="Share your thoughts..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={4}
          />
        </div>
      </Card>

      <div className="flex justify-between gap-4">
        {onPrevious && (
          <Button
            onClick={handlePrevious}
            variant="outline"
            size="lg"
            className="flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Previous
          </Button>
        )}
        <Button
          onClick={handleSubmit}
          disabled={!isComplete}
          className={`flex-1 ${isComplete ? 'bg-[#EE4137] hover:bg-[#D93730]' : ''}`}
          size="lg"
        >
          {isComplete ? 'Continue' : 'Complete All Fields'}
        </Button>
      </div>
    </div>
  );
}