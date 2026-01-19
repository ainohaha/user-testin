import { useState } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Monitor, CheckCircle, XCircle } from 'lucide-react';

interface TaskRecordingViewProps {
  taskNumber: number;
  taskDescription: string;
  screenUrl?: string | null;
  duration: number;
  taskResponse?: {
    completed: string;
    ease?: number;
    clarity?: number;
    confidence?: number;
    feedback?: string;
    concerns?: string;
  };
}

// Task definitions with actual questions from the testing side
const TASK_DEFINITIONS: Record<number, { title: string; question: string; scale: { low: string; high: string } }> = {
  1: { 
    title: 'Switch to ProVault and scan in your collection',
    question: 'How easy was it to switch to ProVault and scan in your collection?',
    scale: { low: 'Very difficult', high: 'Very easy' }
  },
  2: { 
    title: 'Make a new page, and add in the first three cards to that new page',
    question: 'How easy was it to find your Vault, make a new page, and add the first three cards?',
    scale: { low: 'Very difficult', high: 'Very easy' }
  },
  3: { 
    title: 'Head back to your dashboard and check out your collection value',
    question: 'How clear was your collection value on the dashboard?',
    scale: { low: 'Very confusing', high: 'Very clear' }
  },
  4: { 
    title: "Now, let's set up your shop",
    question: 'How intuitive was the shop setup process?',
    scale: { low: 'Not intuitive', high: 'Very intuitive' }
  },
  5: { 
    title: 'Switch to the "listings" section of your shop and list the single card in your "Rare Holos" page',
    question: 'How easy was it to find the Let Go page and list your card?',
    scale: { low: 'Very difficult', high: 'Very easy' }
  },
  6: { 
    title: 'Review the alert on your dashboard',
    question: 'How clear was the alert and order confirmation process?',
    scale: { low: 'Very confusing', high: 'Very clear' }
  },
  7: { 
    title: 'Prepare and schedule a drop off at GameStop to verify your items',
    question: 'How easy was it to schedule a drop off at GameStop?',
    scale: { low: 'Very difficult', high: 'Very easy' }
  },
  8: { 
    title: 'Check-in to your appointment and send off your items',
    question: 'How easy was it to check-in and send off your items?',
    scale: { low: 'Very difficult', high: 'Very easy' }
  },
  9: { 
    title: 'Check if the order was delivered and if you got your payment',
    question: 'How easy was it to check if the order was delivered and confirm payment?',
    scale: { low: 'Very difficult', high: 'Very easy' }
  },
  10: { 
    title: 'Cash out your earnings then claim a reward',
    question: 'How clear were the cashout and rewards redemption options?',
    scale: { low: 'Very confusing', high: 'Very clear' }
  }
};

export function TaskRecordingView({
  taskNumber,
  taskDescription,
  screenUrl,
  duration,
  taskResponse
}: TaskRecordingViewProps) {
  const taskDef = TASK_DEFINITIONS[taskNumber];

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 4) return 'bg-green-100 text-green-800 border-green-300';
    if (confidence >= 3) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-red-100 text-red-800 border-red-300';
  };

  return (
    <Card className="overflow-hidden">
      {/* Task Header */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-6 border-b">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Badge className="bg-[#EE4137] hover:bg-[#EE4137]">Task {taskNumber}</Badge>
              {taskResponse?.completed === 'yes' ? (
                <div className="flex items-center gap-1.5 text-green-700">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">Completed</span>
                </div>
              ) : taskResponse?.completed === 'no' ? (
                <div className="flex items-center gap-1.5 text-red-700">
                  <XCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">Not Completed</span>
                </div>
              ) : null}
            </div>
            
            {taskDef && (
              <>
                <h3 className="mb-3">{taskDef.title}</h3>
              </>
            )}
          </div>
          
          <div className="text-right shrink-0">
            <div className="text-2xl font-mono text-slate-700">{formatDuration(duration)}</div>
            <div className="text-xs text-slate-500 mt-1">Duration</div>
          </div>
        </div>
      </div>

      {/* Screen Recording */}
      {screenUrl ? (
        <div className="p-6 bg-slate-50">
          <div className="flex items-center gap-2 mb-3">
            <Monitor className="w-4 h-4 text-slate-600" />
            <h4 className="text-sm font-medium text-slate-700">Screen Recording</h4>
          </div>
          <div className="bg-black rounded-lg overflow-hidden shadow-lg">
            <video
              src={screenUrl}
              controls
              className="w-full"
              style={{ maxHeight: '600px' }}
            >
              Your browser does not support video playback.
            </video>
          </div>
        </div>
      ) : (
        <div className="p-6 bg-slate-50">
          <Alert className="border-amber-300 bg-amber-50">
            <AlertDescription className="text-amber-900 text-sm">
              No screen recording available for this task
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Task Response */}
      {taskResponse && (() => {
        // Get the slider value - different tasks use different field names
        const sliderValue = taskResponse.ease ?? taskResponse.clarity ?? taskResponse.confidence;
        const feedbackText = taskResponse.feedback ?? taskResponse.concerns;
        
        return (
          <div className="p-6 border-t bg-white space-y-4">
            <h4 className="text-sm font-medium text-slate-700">Participant Feedback</h4>
            
            {taskResponse.completed && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-600">Task Completed:</span>
                <Badge variant={taskResponse.completed === 'yes' ? 'default' : 'destructive'}>
                  {taskResponse.completed === 'yes' ? 'Yes' : 'No'}
                </Badge>
              </div>
            )}
            
            {/* Show slider question and response */}
            {(sliderValue !== undefined && sliderValue !== null) && taskDef && (
              <div className="space-y-3">
                <div className="text-sm text-slate-700 font-medium">
                  {taskDef.question}
                </div>
                
                {/* Visual scale representation */}
                <div className="space-y-2">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <div
                        key={num}
                        className={`h-10 flex-1 rounded border-2 flex items-center justify-center text-sm font-medium transition-colors ${
                          num === sliderValue
                            ? 'bg-[#EE4137] border-[#EE4137] text-white'
                            : 'bg-slate-100 border-slate-300 text-slate-500'
                        }`}
                      >
                        {num}
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>{taskDef.scale.low}</span>
                    <span>{taskDef.scale.high}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600">Rating:</span>
                  <Badge className={getConfidenceColor(sliderValue)}>
                    {sliderValue}/5
                  </Badge>
                </div>
              </div>
            )}
            
            {feedbackText && (
              <div className="mt-4">
                <div className="text-sm text-slate-600 mb-2">Written Feedback:</div>
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">
                    {feedbackText}
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </Card>
  );
}