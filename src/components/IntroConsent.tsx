import { useState } from 'react';
import { Button } from './ui/button';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { CheckCircle2, Clock } from 'lucide-react';
import { config } from '../config';

interface IntroConsentProps {
  onNext: (data: Record<string, any>) => void;
  onDecline: () => void;
}

export function IntroConsent({ onNext, onDecline }: IntroConsentProps) {
  const [consent, setConsent] = useState('');

  // Get prototype URL from config
  const prototypeLink = config.prototypeUrl;

  const handleConsentChange = (value: string) => {
    setConsent(value);
    // Auto-reject if they select "no"
    if (value === 'no') {
      setTimeout(() => {
        onDecline();
      }, 300); // Small delay for better UX
    }
  };

  const handleSubmit = () => {
    if (consent === 'yes') {
      onNext({ consent: true });
    }
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

      <div className="text-center space-y-2">
        <h1>Welcome!</h1>
        <p className="text-slate-600 flex items-center justify-center gap-2">
          <Clock className="w-4 h-4" />
          Self-paced usability test (est time ~20 min)
        </p>
      </div>

      <Card className="p-6 space-y-4">
        <div className="space-y-4">
          <p>
            You're testing a new product design.
            We're testing the design, not you. Explore naturally and think out loud.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
            <p className="text-sm text-slate-700">
              • <strong>Purpose:</strong> Evaluate the clarity, usability, and overall experience of the prototype.
            </p>
            <p className="text-sm text-slate-700">
              • <strong>Duration:</strong> ~20 minutes (tasks with follow-up questions)
            </p>
            <p className="text-sm text-slate-700">
              • <strong>Focus:</strong> Navigation, key flows, and perceived value
            </p>
          </div>
        </div>
      </Card>

      <Card className="px-[24px] py-[17px]">
        <h2 className="mb-0 leading-none">What You'll Do</h2>
        <div className="space-y-3">
          <div className="flex gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm">
              Complete goal-based tasks exploring the prototype
            </p>
          </div>
          <div className="flex gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm">
              Share your thoughts and reactions as you navigate
            </p>
          </div>
          <div className="flex gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm">
              Your responses are anonymous and used only for research
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-0 leading-none">Consent *</h2>
        <p className="mb-4">By clicking "Yes, I agree" below, you consent to participate in this anonymous usability study. Your participation is voluntary and you may withdraw at any time.</p>

        <RadioGroup value={consent} onValueChange={handleConsentChange}>
          <Label
            htmlFor="yes"
            className="flex items-center space-x-3 p-4 rounded-lg border-2 border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-colors cursor-pointer"
          >
            <RadioGroupItem value="yes" id="yes" />
            <span className="flex-1">Yes, I agree</span>
          </Label>
          <Label
            htmlFor="no"
            className="flex items-center space-x-3 p-4 rounded-lg border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <RadioGroupItem value="no" id="no" />
            <span className="flex-1">No, I do not wish to continue</span>
          </Label>
        </RadioGroup>
      </Card>

      <Button
        onClick={handleSubmit}
        disabled={consent !== 'yes'}
        className="w-full"
        size="lg"
      >
        Continue
      </Button>
    </div>
  );
}