import { useState, useRef, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Slider } from '../ui/slider';
import { Flag } from 'lucide-react';

interface GenericTaskProps {
    onComplete: (data: Record<string, any>) => void;
    onPrevious?: () => void;
    taskNumber: number;
    totalTasks: number;
    participantId: string;
    scenario?: string;
    existingData?: Record<string, any>;

    // Configurable question text
    easeQuestion?: string;
    feedbackQuestion?: string;
}

/**
 * GENERIC TASK COMPONENT
 * 
 * This component is used for all tasks in the test.
 * Questions are passed in as props so you can customize
 * them in the testBuilder.ts config file.
 */
export function GenericTask({
    onComplete,
    onPrevious,
    taskNumber,
    totalTasks,
    participantId,
    scenario,
    existingData,
    easeQuestion = "How easy was it to complete this task?",
    feedbackQuestion = "What did you think about this task? Any hesitations or confusion?",
}: GenericTaskProps) {
    // Form state
    const [completed, setCompleted] = useState(existingData?.completed || '');
    const [ease, setEase] = useState(existingData?.ease || [3]);
    const [feedback, setFeedback] = useState(existingData?.feedback || '');

    // Track time spent on task
    const startTime = useRef(new Date().toISOString());

    // Check if all required fields are complete
    const isComplete = completed && feedback.trim().length > 0;

    const handleSubmit = () => {
        const endTime = new Date().toISOString();

        onComplete({
            [`task${taskNumber}`]: {
                completed,
                ease: ease[0],
                feedback,
                startTime: startTime.current,
                endTime,
                timeSpentSeconds: Math.round(
                    (new Date(endTime).getTime() - new Date(startTime.current).getTime()) / 1000
                ),
            },
        });
    };

    const handlePrevious = () => {
        if (onPrevious) {
            onPrevious();
        }
    };

    return (
        <div className="space-y-6">
            {/* Task Progress */}
            <div className="flex justify-between items-center text-sm text-slate-600">
                <span>Task {taskNumber} of {totalTasks}</span>
                <span className="text-xs bg-slate-100 px-2 py-1 rounded">
                    ID: {participantId?.slice(0, 8)}
                </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(taskNumber / totalTasks) * 100}%` }}
                />
            </div>

            {/* Task Scenario */}
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

            {/* Questions Card */}
            <Card className="p-6 space-y-5">
                {/* Completion Question */}
                <div className="space-y-3">
                    <h3>Were you able to complete this goal? *</h3>

                    <RadioGroup value={completed} onValueChange={setCompleted}>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="yes" id={`t${taskNumber}-yes`} />
                            <Label htmlFor={`t${taskNumber}-yes`}>Yes</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="no" id={`t${taskNumber}-no`} />
                            <Label htmlFor={`t${taskNumber}-no`}>No</Label>
                        </div>
                    </RadioGroup>
                </div>

                {/* Ease Rating Slider */}
                <div className="space-y-3">
                    <h3>{easeQuestion} *</h3>
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

                {/* Open Response */}
                <div className="space-y-3">
                    <Label htmlFor={`t${taskNumber}-feedback`}>
                        {feedbackQuestion} *
                    </Label>
                    <Textarea
                        id={`t${taskNumber}-feedback`}
                        placeholder="Share your thoughts..."
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        rows={4}
                    />
                </div>
            </Card>

            {/* Navigation Buttons */}
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
