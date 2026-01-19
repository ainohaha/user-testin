import { useEffect } from 'react';
import { Card } from './ui/card';
import { CheckCircle2 } from 'lucide-react';

interface SubmitConfirmationProps {
  participantId: string;
}

export function SubmitConfirmation({ participantId }: SubmitConfirmationProps) {
  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="max-w-lg w-full p-8 space-y-6 text-center">
        {/* Success Icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="w-12 h-12 text-green-600" />
          </div>
        </div>

        {/* Thank You Message */}
        <div className="space-y-3">
          <h1 className="text-green-600">Test Complete!</h1>
          <p className="text-slate-600">
            Thank you for participating in the GameStop ProVault usability test. 
            Your feedback is invaluable in helping us create a better experience.
          </p>
        </div>

        {/* Confirmation Details */}
        <div className="pt-6 border-t border-slate-200 space-y-3">
          <p className="text-sm text-slate-700">
            Your responses and recordings have been successfully submitted.
          </p>
          
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <p className="text-xs text-slate-500 mb-1">Participant ID</p>
            <p className="text-sm font-mono text-slate-700">{participantId}</p>
          </div>

          <p className="text-xs text-slate-500 pt-2">
            You can now close this window.
          </p>
        </div>

        {/* GameStop Branding */}
        <div className="pt-4">
          <p className="text-xs text-slate-400">
            GameStop × PSA Usability Research
          </p>
        </div>
      </Card>
    </div>
  );
}
