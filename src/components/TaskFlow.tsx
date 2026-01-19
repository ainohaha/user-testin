import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Task1 } from './tasks/Task1';
import { Task2 } from './tasks/Task2';
import { Task3 } from './tasks/Task3';
import { Task4 } from './tasks/Task4';
import { Task5 } from './tasks/Task5';
import { Task6 } from './tasks/Task6';
import { Task7 } from './tasks/Task7';
import { Task8 } from './tasks/Task8';
import { Task9 } from './tasks/Task9';
import { Task10 } from './tasks/Task10';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Search, Upload, Package, UserCog, MapPin, Gift, X, Pause, Settings, ExternalLink, FolderPlus, LayoutGrid, DollarSign, ScanLine, Store, Bell, CalendarClock, CheckCircle2, Wallet } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './ui/alert-dialog';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { Skeleton } from './ui/skeleton';

interface TaskFlowProps {
  onNext: (data: Record<string, any>) => void;
  prototypeUrl?: string;
  participantId?: string;
  micStream?: MediaStream | null;
  screenStream?: MediaStream | null;
  useMicrophone?: boolean;
}

// ============================================
// CUSTOMIZE YOUR TASKS HERE
// ============================================
// Edit these scenarios to match your prototype and testing goals.
// Each task should have a clear action for participants to complete.

const taskScenarios = [
  {
    icon: ScanLine,
    text: 'Complete the onboarding flow and set up your account'
  },
  {
    icon: LayoutGrid,
    text: 'Create a new item and add some details'
  },
  {
    icon: DollarSign,
    text: 'Navigate to explore the main dashboard features'
  },
  {
    icon: Store,
    text: 'Configure your settings or preferences'
  },
  {
    icon: Package,
    text: 'Find and select an item to interact with'
  },
  {
    icon: Bell,
    text: 'Check any notifications or alerts'
  },
  {
    icon: CalendarClock,
    text: 'Schedule or plan an action'
  },
  {
    icon: MapPin,
    text: 'Complete a location-based task'
  },
  {
    icon: CheckCircle2,
    text: 'Verify a completed action or status'
  },
  {
    icon: Wallet,
    text: 'Complete the final goal and finish the flow'
  }
];

export function TaskFlow({ onNext, prototypeUrl, participantId, micStream, screenStream, useMicrophone }: TaskFlowProps) {
  const [currentTask, setCurrentTask] = useState(0);
  const [taskData, setTaskData] = useState<Record<string, any>>({});
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showRecordingHover, setShowRecordingHover] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Timing tracking
  const testStartTime = useRef<string | null>(null);
  const taskStartTimes = useRef<Record<number, string>>({});
  const [taskTimings, setTaskTimings] = useState<Record<string, any>>({});

  // ============================================
  // CUSTOMIZE YOUR TASK TITLES HERE
  // ============================================
  const tasks = [
    { component: Task1, title: 'Task 1: Onboarding', number: 1 },
    { component: Task2, title: 'Task 2: Create Item', number: 2 },
    { component: Task3, title: 'Task 3: Explore Dashboard', number: 3 },
    { component: Task4, title: 'Task 4: Configure Settings', number: 4 },
    { component: Task5, title: 'Task 5: Select Item', number: 5 },
    { component: Task6, title: 'Task 6: Check Notifications', number: 6 },
    { component: Task7, title: 'Task 7: Schedule Action', number: 7 },
    { component: Task8, title: 'Task 8: Location Task', number: 8 },
    { component: Task9, title: 'Task 9: Verify Status', number: 9 },
    { component: Task10, title: 'Task 10: Complete Flow', number: 10 }
  ];

  const CurrentTask = tasks[currentTask].component;
  const currentScenario = taskScenarios[currentTask];
  const ScenarioIcon = currentScenario.icon;

  // Get previous data for current task (if it exists)
  const existingTaskData = taskData[`task${currentTask + 1}`];

  // Track test start time on mount
  useEffect(() => {
    if (!testStartTime.current) {
      testStartTime.current = new Date().toISOString();
      console.log('Test started at:', testStartTime.current);
    }
  }, []);

  // Track task start time when task changes
  useEffect(() => {
    const taskNumber = currentTask + 1;
    if (!taskStartTimes.current[taskNumber]) {
      taskStartTimes.current[taskNumber] = new Date().toISOString();
      console.log(`Task ${taskNumber} started at:`, taskStartTimes.current[taskNumber]);
    }
  }, [currentTask]);

  const handleTaskComplete = async (data: Record<string, any>) => {
    setIsLoading(true);

    const taskNumber = currentTask + 1;
    const taskEndTime = new Date().toISOString();
    const taskStartTime = taskStartTimes.current[taskNumber];

    // Calculate task duration in seconds
    let taskDuration = 0;
    if (taskStartTime) {
      const start = new Date(taskStartTime).getTime();
      const end = new Date(taskEndTime).getTime();
      taskDuration = Math.round((end - start) / 1000);
    }

    // Store timing for this task
    const timing = {
      startTime: taskStartTime,
      endTime: taskEndTime,
      duration: taskDuration
    };

    const updatedTimings = {
      ...taskTimings,
      [`task${taskNumber}`]: timing
    };
    setTaskTimings(updatedTimings);

    console.log(`Task ${taskNumber} completed in ${taskDuration} seconds`);

    const updatedData = { ...taskData, [`task${currentTask + 1}`]: data };
    setTaskData(updatedData);

    // Update backend with new/edited task data
    try {
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-b0f3b375/participant/${participantId}/task/${taskNumber}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            taskData: data,
            timing: timing
          })
        }
      );
      console.log(`Task ${taskNumber} data saved to backend`);
    } catch (error) {
      console.error(`Error saving task ${taskNumber} to backend:`, error);
    }

    // Show loading for 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));

    if (currentTask < tasks.length - 1) {
      setCurrentTask(currentTask + 1);
      setIsLoading(false);
      window.scrollTo(0, 0);
    } else {
      // Calculate total test duration
      const testEndTime = new Date().toISOString();
      let totalDuration = 0;
      if (testStartTime.current) {
        const start = new Date(testStartTime.current).getTime();
        const end = new Date(testEndTime).getTime();
        totalDuration = Math.round((end - start) / 1000);
      }

      const testSession = {
        startTime: testStartTime.current,
        endTime: testEndTime,
        totalDuration
      };

      console.log(`Total test duration: ${totalDuration} seconds (${Math.round(totalDuration / 60)} minutes)`);

      // Include timing data in submission
      onNext({
        tasks: updatedData,
        taskTimings: updatedTimings,
        testSession
      });
    }
  };

  const handleExitTest = async () => {
    try {
      // Delete participant data from server
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-b0f3b375/participant/${participantId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );
    } catch (error) {
      console.error('Error deleting participant data:', error);
    } finally {
      // Reload to start page regardless of delete success
      window.location.href = '/';
    }
  };

  const handlePrevious = () => {
    if (currentTask > 0) {
      setCurrentTask(currentTask - 1);
      window.scrollTo(0, 0);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Top Navigation Bar - Hidden */}
      <div className="hidden bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {currentTask > 0 && (
              <button
                onClick={handlePrevious}
                className="text-slate-600 hover:text-slate-900 flex items-center gap-1 text-sm"
              >
                ← Previous Goal
              </button>
            )}
          </div>
          <Badge variant="secondary" className="text-sm">
            Goal {currentTask + 1} of {tasks.length}
          </Badge>
        </div>
      </div>

      {/* Split View */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Side - Prototype */}
        <div className="w-1/2 border-r border-slate-200 bg-slate-50 flex flex-col">
          <div className="flex-1 p-4 overflow-hidden">
            {prototypeUrl ? (
              <iframe
                src={prototypeUrl}
                className="w-full h-full border-0 rounded-lg shadow-lg bg-white"
                title="Figma Prototype"
                allowFullScreen
                style={{ border: 'none' }}
              />
            ) : (
              <div className="h-full flex items-center justify-center bg-white rounded-lg border-2 border-dashed border-slate-300">
                <div className="text-center space-y-2 p-8">
                  <p className="text-slate-600">Prototype will appear here</p>
                  <p className="text-sm text-slate-400">
                    The Figma prototype link was not provided in the previous step
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side - Task Questions */}
        <div className="w-1/2 overflow-y-auto">
          {isLoading ? (
            // Skeleton loader
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-end">
                <Skeleton className="h-9 w-24" />
              </div>

              <div className="flex justify-center">
                <Skeleton className="h-9 w-32" />
              </div>

              <div className="flex gap-2 justify-center">
                {tasks.map((_, index) => (
                  <Skeleton key={index} className="h-2 w-2 rounded-full" />
                ))}
              </div>

              <Skeleton className="h-24 w-full rounded-lg" />

              <div className="space-y-4">
                <Skeleton className="h-32 w-full rounded-lg" />
                <Skeleton className="h-32 w-full rounded-lg" />
                <Skeleton className="h-32 w-full rounded-lg" />
              </div>

              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {/* Top Bar with End Test button */}
              <div className="flex items-center justify-end">
                <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-slate-600 hover:text-red-600 hover:bg-red-50"
                    >
                      <X className="w-4 h-4 mr-1" />
                      End Test
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>End Usability Test?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete all your test data including recordings and responses.
                        This action cannot be undone and you'll need to start over.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleExitTest}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Delete & Exit
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              {/* Task Number - Centered with white background */}
              <div className="flex justify-center">
                <div className="inline-block bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-700">
                  Goal {currentTask + 1}/{tasks.length}
                </div>
              </div>

              {/* Task Progress Dots */}
              <div className="flex gap-2 justify-center">
                {tasks.map((_, index) => (
                  <div
                    key={index}
                    className={`h-2 w-2 rounded-full transition-all ${index === currentTask
                        ? 'bg-blue-600 w-8'
                        : index < currentTask
                          ? 'bg-blue-400'
                          : 'bg-slate-300'
                      }`}
                  />
                ))}
              </div>

              <CurrentTask
                onComplete={handleTaskComplete}
                onPrevious={currentTask > 0 ? handlePrevious : undefined}
                taskNumber={currentTask + 1}
                totalTasks={tasks.length}
                participantId={participantId || ''}
                micStream={micStream}
                screenStream={screenStream}
                isRecording={useMicrophone}
                scenario={currentScenario.text}
                existingData={existingTaskData}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}