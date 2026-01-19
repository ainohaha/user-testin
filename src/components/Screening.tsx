import { useState } from 'react';
import { Button } from './ui/button';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { Card } from './ui/card';

interface ScreeningProps {
  onNext: (data: Record<string, any>) => void;
}

export function Screening({ onNext }: ScreeningProps) {
  const [q1, setQ1] = useState('');
  const [q2, setQ2] = useState('');
  const [q3, setQ3] = useState('');

  const handleSubmit = () => {
    onNext({
      screening: {
        cardCollector: q1,
        hasGraded: q2,
        buyingSelling: q3
      }
    });
  };

  const isComplete = q1 && q2 && q3;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1>Screening Questions</h1>
        <p className="text-slate-600">
          Help us understand your background with trading cards.
        </p>
      </div>

      <Card className="p-6 space-y-4">
        <div className="space-y-3">
          <h3>Have you ever collected or traded Pokémon, sports, or other trading cards? *</h3>
          
          <RadioGroup value={q1} onValueChange={setQ1}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="current" id="q1-current" />
              <Label htmlFor="q1-current">Yes, I currently collect</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="past" id="q1-past" />
              <Label htmlFor="q1-past">Yes, I used to</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="q1-no" />
              <Label htmlFor="q1-no">No</Label>
            </div>
          </RadioGroup>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <div className="space-y-3">
          <h3>Have you ever graded a card with PSA or another company (e.g., BGS, CGC, TAG)? *</h3>
          
          <RadioGroup value={q2} onValueChange={setQ2}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id="q2-yes" />
              <Label htmlFor="q2-yes">Yes</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="q2-no" />
              <Label htmlFor="q2-no">No</Label>
            </div>
          </RadioGroup>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <div className="space-y-3">
          <h3>How often do you buy or sell cards (online or in-person)? *</h3>
          
          <RadioGroup value={q3} onValueChange={setQ3}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="weekly" id="q3-weekly" />
              <Label htmlFor="q3-weekly">Weekly</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="monthly" id="q3-monthly" />
              <Label htmlFor="q3-monthly">Monthly</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="occasionally" id="q3-occasionally" />
              <Label htmlFor="q3-occasionally">Occasionally</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="rarely" id="q3-rarely" />
              <Label htmlFor="q3-rarely">Rarely</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="never" id="q3-never" />
              <Label htmlFor="q3-never">Never</Label>
            </div>
          </RadioGroup>
        </div>
      </Card>

      <Button
        onClick={handleSubmit}
        disabled={!isComplete}
        className="w-full"
        size="lg"
      >
        Continue
      </Button>
    </div>
  );
}
