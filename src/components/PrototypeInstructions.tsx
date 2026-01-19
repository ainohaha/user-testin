import { Button } from './ui/button';
import { Card } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { ExternalLink, AlertCircle, BookOpen, CheckSquare, Mic, MessageSquare } from 'lucide-react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useState } from 'react';
import { config } from '../config';

interface PrototypeInstructionsProps {
  onNext: (data: Record<string, any>) => void;
}

export function PrototypeInstructions({ onNext }: PrototypeInstructionsProps) {
  // Use configured prototype URL or allow manual entry
  const [prototypeLink, setPrototypeLink] = useState(config.prototypeUrl || '');

  const handleSubmit = () => {
    onNext({ prototypeLink });
  };

  return (
    <div className="space-y-6">
      {/* Hidden iframe to preload the prototype */}
      {prototypeLink && (
        <iframe
          src={prototypeLink}
          className="hidden"
          title="Prototype Preload"
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
        />
      )}

      <div className="space-y-2">
        <h1>Test Instructions</h1>
        <p className="text-slate-600">
          Please read these instructions carefully before starting the test.
        </p>
      </div>

      <Card className="p-6">
        <h2 className="mb-0 leading-none">Overview</h2>
        <div className="space-y-3 text-sm">
          <p>
            You'll be testing a prototype. The prototype will be displayed on the left side
            of your screen, and you'll answer questions on the right.
          </p>
          <p>
            For each task, you'll see a scenario and specific task steps to complete. The test should take approximately 20 minutes
            with goal-based tasks and follow-up questions.
          </p>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-0 leading-none">Testing Tips</h2>
        <div className="space-y-3 text-sm">
          <p>
            Complete each task naturally and honestly. Don't censor yourself—there are no right answers!
            After each task, you'll provide written feedback about your experience.
          </p>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
            <p>
              <strong>What to Focus On:</strong>
            </p>
            <ul className="space-y-2 ml-4">
              <li>• Complete each task as you naturally would</li>
              <li>• Note anything confusing or unclear</li>
              <li>• Provide honest written feedback after each task</li>
              <li>• Share what worked well and what didn't</li>
            </ul>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-0 leading-none">How to Complete Tasks</h2>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="flex-1 pt-1">
              <p className="text-sm"><strong>Read the scenario:</strong> Each task starts with context about what you're trying to do</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div className="flex-1 pt-1">
              <p className="text-sm"><strong>Follow the task steps:</strong> Complete the specific actions listed</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div className="flex-1 pt-1">
              <p className="text-sm"><strong>Provide written feedback:</strong> After each task, share your thoughts and observations</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="flex-1 pt-1">
              <p className="text-sm"><strong>Answer honestly:</strong> There are no right or wrong answers—we want your genuine experience</p>
            </div>
          </div>
        </div>
      </Card>

      <Button
        onClick={handleSubmit}
        className="w-full"
        size="lg"
      >
        Start Usability Test
      </Button>
    </div>
  );
}