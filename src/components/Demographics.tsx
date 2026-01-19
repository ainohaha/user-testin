import { useState } from 'react';
import { Button } from './ui/button';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { config } from '../config';

interface DemographicsProps {
  onNext: (data: Record<string, any>) => void;
  onDecline?: () => void;
}

/**
 * SCREENING/DEMOGRAPHICS COMPONENT
 * 
 * This component shows screening questions before the test begins.
 * 
 * To customize these questions, edit the questions below or
 * integrate with the test-config.json file for a fully dynamic setup.
 */
export function Demographics({ onNext, onDecline }: DemographicsProps) {
  const [experience, setExperience] = useState('');
  const [role, setRole] = useState('');

  // Get prototype URL from config for preloading
  const prototypeLink = config.prototypeUrl;

  const handleSubmit = () => {
    onNext({
      demographics: {
        experience,
        role
      }
    });
  };

  // All questions must be answered
  const isComplete = experience && role;

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
        <h1>Screening Questions</h1>
        <p className="text-slate-600">
          Help us understand your background.
        </p>
      </div>

      {/* ============================================ */}
      {/* CUSTOMIZE YOUR SCREENING QUESTIONS BELOW */}
      {/* ============================================ */}

      {/* Question 1: Experience Level */}
      <Card className="p-6 space-y-4">
        <div className="space-y-3">
          <h3>How familiar are you with this type of product? *</h3>

          <RadioGroup value={experience} onValueChange={setExperience}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="expert" id="exp-expert" />
              <Label htmlFor="exp-expert">Expert - I use similar products daily</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="intermediate" id="exp-intermediate" />
              <Label htmlFor="exp-intermediate">Intermediate - I've used similar products before</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="beginner" id="exp-beginner" />
              <Label htmlFor="exp-beginner">Beginner - I'm new to this type of product</Label>
            </div>
          </RadioGroup>
        </div>
      </Card>

      {/* Question 2: User Role */}
      <Card className="p-6 space-y-4">
        <div className="space-y-3">
          <h3>Which best describes you? *</h3>

          <RadioGroup value={role} onValueChange={setRole}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="personal" id="role-personal" />
              <Label htmlFor="role-personal">Personal user</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="professional" id="role-professional" />
              <Label htmlFor="role-professional">Professional user</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="evaluator" id="role-evaluator" />
              <Label htmlFor="role-evaluator">Evaluating for others</Label>
            </div>
          </RadioGroup>
        </div>
      </Card>

      {/* ============================================ */}
      {/* END OF CUSTOMIZABLE QUESTIONS */}
      {/* ============================================ */}

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