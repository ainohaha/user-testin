import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ChevronLeft, Download, FileText, Mic, Monitor, Sparkles, User, AlertCircle } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { TaskRecordingView } from './TaskRecordingView';

interface Participant {
  participantId: string;
  ipAddress: string;
  startedAt: string;
  submittedAt?: string;
  submitted: boolean;
  userAgent: string;
  demographics?: any;
  screening?: any;
  tasks?: any;
  closing?: any;
  responses?: any;
  taskTimings?: Record<string, {
    startTime: string;
    endTime: string;
    duration: number;
  }>;
  testSession?: {
    startTime: string;
    endTime: string;
    totalDuration: number;
  };
}

interface Recording {
  participantId: string;
  taskNumber: number;
  screenPath: string | null;
  screenUrl?: string | null;
  duration: number;
  timestamp: string;
}

interface AIAnalysis {
  executiveSummary: string;
  keyFindings: string[];
  keyMoments: Array<{
    task: number;
    moment: string;
    quote: string;
    significance: string;
  }>;
  painPoints: string[];
  positiveHighlights: string[];
  recommendations: string[];
  participantId: string;
  generatedAt: string;
  model: string;
  error?: boolean;
  errorMessage?: string;
}

interface ParticipantDetailProps {
  participantId: string;
  onBack: () => void;
}

export function ParticipantDetail({ participantId, onBack }: ParticipantDetailProps) {
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [generatingAnalysis, setGeneratingAnalysis] = useState(false);

  // Helper function to format duration
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };

  // Helper function to detect device type from user agent
  const getDeviceType = (userAgent: string): string => {
    const ua = userAgent.toLowerCase();
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      return 'Tablet';
    }
    if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile|windows phone/i.test(ua)) {
      return 'Mobile';
    }
    return 'Desktop';
  };

  // Helper function to check if participant made it at least halfway
  const isHalfwayComplete = (participant: Participant): boolean => {
    // Check if they have demographics data (section 3)
    if (participant.demographics && Object.keys(participant.demographics).length > 0) {
      return true;
    }
    
    // Check if they completed at least 1 task (section 5)
    if (participant.tasks && Object.keys(participant.tasks).length > 0) {
      return true;
    }
    
    // Check if they have responses with tasks or demographics
    if (participant.responses) {
      if (participant.responses.demographics || participant.responses.tasks) {
        return true;
      }
    }
    
    return false;
  };

  // Helper function to determine participant status
  const getParticipantStatus = (participant: Participant): { status: string; variant: 'default' | 'secondary' | 'destructive'; color: string } => {
    if (participant.submitted) {
      return { status: 'Completed', variant: 'default', color: 'bg-green-500' };
    }
    
    // Only show as abandoned if they made it at least halfway
    if (isHalfwayComplete(participant)) {
      return { status: 'Abandoned', variant: 'destructive', color: 'bg-red-500' };
    }
    
    // Not halfway - shouldn't normally be viewing this participant
    return { status: 'Not Started', variant: 'secondary', color: 'bg-gray-500' };
  };

  useEffect(() => {
    fetchParticipantDetails();
    checkExistingAnalysis();
  }, [participantId]);

  const fetchParticipantDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-b0f3b375/admin/participant/${participantId}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch participant details');
      }

      const data = await response.json();
      console.log('📊 Participant details loaded:', data);
      console.log('Submitted status:', data.participant?.submitted, 'Type:', typeof data.participant?.submitted);
      console.log('Recordings:', data.recordings?.length || 0);
      
      if (data.recordings && data.recordings.length > 0) {
        data.recordings.forEach((rec: any, idx: number) => {
          console.log(`Recording ${idx + 1}:`, {
            task: rec.taskNumber,
            hasScreenPath: !!rec.screenPath,
            hasScreenUrl: !!rec.screenUrl,
            screenPath: rec.screenPath,
            screenUrl: rec.screenUrl?.substring(0, 100)
          });
        });
      } else {
        console.warn('❌ NO RECORDINGS FOUND FOR THIS PARTICIPANT');
      }
      
      setParticipant(data.participant);
      setRecordings(data.recordings || []);
      setError('');
    } catch (err) {
      console.error('Error fetching participant details:', err);
      setError(`Failed to load participant data: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const checkExistingAnalysis = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-b0f3b375/admin/check-analysis/${participantId}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.exists && data.analysis) {
          setAiAnalysis(data.analysis);
        }
      }
    } catch (err) {
      console.log('No existing analysis for participant:', participantId);
    }
  };

  const generateAnalysis = async () => {
    try {
      setGeneratingAnalysis(true);
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-b0f3b375/admin/generate-analysis/${participantId}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        
        if (errorData?.needsApiKey || errorData?.error?.includes('quota') || errorData?.error?.includes('billing') || errorData?.error?.includes('insufficient_quota')) {
          setAiAnalysis({
            executiveSummary: 'AI Analysis is currently unavailable due to OpenAI API quota limits.',
            keyFindings: [],
            keyMoments: [],
            painPoints: [],
            positiveHighlights: [],
            recommendations: [],
            participantId,
            generatedAt: new Date().toISOString(),
            model: 'error',
            error: true,
            errorMessage: 'OpenAI API quota exceeded. To enable AI analysis:\n\n1. Add billing credits to your OpenAI account at https://platform.openai.com/account/billing\n2. Or update your OPENAI_API_KEY environment variable with a valid API key\n3. See OPENAI_SETUP.md for detailed instructions\n\nNote: You can still view all participant data and responses without AI analysis.'
          } as any);
          return;
        }
        
        throw new Error(errorData?.error || 'Failed to generate analysis');
      }

      const data = await response.json();
      setAiAnalysis(data.analysis);
    } catch (err) {
      console.error('Error generating analysis:', err);
      setAiAnalysis({
        executiveSummary: 'Failed to generate AI analysis.',
        keyFindings: [],
        keyMoments: [],
        painPoints: [],
        positiveHighlights: [],
        recommendations: [],
        participantId,
        generatedAt: new Date().toISOString(),
        model: 'error',
        error: true,
        errorMessage: err instanceof Error ? err.message : 'An unknown error occurred while generating AI analysis.'
      } as any);
    } finally {
      setGeneratingAnalysis(false);
    }
  };

  const exportParticipantData = () => {
    if (!participant) return;

    const data = {
      participant,
      recordings,
      aiAnalysis,
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `participant-${participantId}-data.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
          <p className="text-slate-600">Loading participant data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <Button onClick={onBack} variant="ghost" className="gap-2 mb-6">
            <ChevronLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
          <Alert className="border-red-300 bg-red-50">
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (!participant) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <Button onClick={onBack} variant="ghost" className="gap-2 mb-6">
            <ChevronLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
          <Alert className="border-amber-300 bg-amber-50">
            <AlertDescription className="text-amber-800">
              Participant not found
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <Button onClick={onBack} variant="ghost" className="gap-2 mb-4">
            <ChevronLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <User className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="flex items-center gap-3">
                  Participant {participantId}
                  <Badge className={getParticipantStatus(participant).color}>
                    {getParticipantStatus(participant).status}
                  </Badge>
                </h1>
                <p className="text-sm text-slate-600">
                  Started: {new Date(participant.startedAt).toLocaleString()}
                  {participant.submittedAt && (
                    <> • Completed: {new Date(participant.submittedAt).toLocaleString()}</>
                  )}
                </p>
              </div>
            </div>
            <Button onClick={exportParticipantData} size="sm" className="gap-2">
              <Download className="w-4 h-4" />
              Export Data
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Status Notice */}
        {participant.submitted !== true && (
          <Alert className="border-red-300 bg-red-50">
            <AlertDescription className="text-red-900">
              <div className="space-y-2">
                <p className="flex items-center gap-2">
                  <span className="text-lg">⚠️</span>
                  <strong>Test Abandoned</strong>
                </p>
                <p className="text-sm">
                  This participant started but did not complete the test. Data shown below represents their partial responses and can still be valuable for analysis.
                </p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Tabbed Content */}
        <Tabs defaultValue="setup" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="setup">Setup & Demographics</TabsTrigger>
            <TabsTrigger value="test">Usability Test</TabsTrigger>
          </TabsList>

          {/* Setup & Demographics Tab */}
          <TabsContent value="setup" className="space-y-6 mt-6">
            {/* Participant Info & Demographics */}
            <Card className="p-6">
              <h2 className="mb-0 leading-none">Participant Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Session Info */}
                <div className="space-y-3">
                  <h3 className="text-sm text-slate-500 uppercase tracking-wide">Session Details</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-slate-600">ID: </span>
                      <span className="font-mono">{participant.participantId}</span>
                    </div>
                    <div>
                      <span className="text-slate-600">Device: </span>
                      <span>{getDeviceType(participant.userAgent)}</span>
                    </div>
                    <div>
                      <span className="text-slate-600">Status: </span>
                      <span>{getParticipantStatus(participant).status}</span>
                    </div>
                  </div>
                </div>

                {/* Demographics & Screening Summary */}
                {participant.demographics && (
                  <div className="md:col-span-2 space-y-3">
                    <h3 className="text-sm text-slate-500 uppercase tracking-wide">Demographics & Screening</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-slate-600">Age: </span>
                        <span>{participant.demographics.age}</span>
                      </div>
                      <div>
                        <span className="text-slate-600">Collector Status: </span>
                        <span className="capitalize">{participant.demographics.hasCollected === 'current' ? 'Currently collecting' : participant.demographics.hasCollected === 'past' ? 'Used to collect' : 'No'}</span>
                      </div>
                      <div>
                        <span className="text-slate-600">Monthly Spending: </span>
                        <span>{participant.demographics.monthlySpending}</span>
                      </div>
                      <div>
                        <span className="text-slate-600">Has Graded Cards: </span>
                        <span className="capitalize">{participant.demographics.hasGraded}</span>
                      </div>
                      <div>
                        <span className="text-slate-600">Collector Type: </span>
                        <span className="capitalize">{participant.demographics.collectorType?.replace('-', ' / ')}</span>
                      </div>
                      {participant.demographics.sellingExperience && (
                        <div>
                          <span className="text-slate-600">Selling Experience: </span>
                          <span>{participant.demographics.sellingExperience}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-slate-600">Buy/Sell Frequency: </span>
                        <span className="capitalize">{participant.demographics.buyingSellingFrequency}</span>
                      </div>
                      {participant.demographics.currentPlatforms && participant.demographics.currentPlatforms.length > 0 && (
                        <div className="md:col-span-2">
                          <span className="text-slate-600">Current Platforms: </span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {participant.demographics.currentPlatforms.map((platform: string, idx: number) => (
                              <Badge key={idx} variant="secondary" className="text-xs">{platform}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Task Timing Information */}
            {(participant as any).taskTimings && (
              <Card className="p-6">
                <h2 className="mb-4">Task Timing</h2>
                <div className="space-y-4">
                  {/* Total Test Time */}
                  {(participant as any).testSession && (participant as any).testSession.totalDuration && (
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-blue-600 uppercase tracking-wide mb-1">Total Test Duration</p>
                          <p className="text-3xl text-blue-900">
                            {Math.floor((participant as any).testSession.totalDuration / 60)} minutes {(participant as any).testSession.totalDuration % 60} seconds
                          </p>
                        </div>
                        <div className="text-blue-400">
                          <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Individual Task Times */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {Object.entries((participant as any).taskTimings).map(([taskKey, timing]: [string, any]) => {
                      const taskNumber = taskKey.replace('task', '');
                      const minutes = Math.floor(timing.duration / 60);
                      const seconds = timing.duration % 60;
                      
                      return (
                        <div key={taskKey} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="secondary">Task {taskNumber}</Badge>
                            <span className="text-xs text-slate-500">
                              {timing.duration}s
                            </span>
                          </div>
                          <p className="text-lg text-slate-900">
                            {minutes > 0 ? `${minutes}m ` : ''}{seconds}s
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            {new Date(timing.startTime).toLocaleTimeString()} - {new Date(timing.endTime).toLocaleTimeString()}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Average Task Time */}
                  {Object.keys((participant as any).taskTimings).length > 0 && (
                    <div className="bg-slate-100 border border-slate-300 rounded-lg p-3">
                      <p className="text-sm text-slate-600 mb-1">Average Time per Task</p>
                      <p className="text-xl text-slate-900">
                        {(() => {
                          const durations = Object.values((participant as any).taskTimings).map((t: any) => t.duration);
                          const avg = Math.round(durations.reduce((a: number, b: number) => a + b, 0) / durations.length);
                          const avgMin = Math.floor(avg / 60);
                          const avgSec = avg % 60;
                          return `${avgMin > 0 ? `${avgMin}m ` : ''}${avgSec}s`;
                        })()}
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Screening Detailed Responses */}
            {participant.demographics && (
              <div className="space-y-4">
                <h2>Screening Responses</h2>
                
                {/* Question 1 */}
                <Card className="p-6 space-y-3">
                  <div className="flex items-baseline gap-3">
                    <Badge variant="secondary" className="shrink-0">Q1</Badge>
                    <h3 className="text-slate-900">
                      Have you ever collected or traded Pokémon, sports, or other trading cards?
                    </h3>
                  </div>
                  <div className="ml-11 space-y-2">
                    <div className="text-sm text-slate-600">Options:</div>
                    <div className="flex flex-col gap-2 text-sm">
                      <div className={`px-3 py-2 rounded ${participant.demographics.hasCollected === 'current' ? 'bg-blue-100 border-2 border-blue-500' : 'bg-slate-50 border border-slate-200'}`}>
                        Yes, I currently collect
                      </div>
                      <div className={`px-3 py-2 rounded ${participant.demographics.hasCollected === 'past' ? 'bg-blue-100 border-2 border-blue-500' : 'bg-slate-50 border border-slate-200'}`}>
                        Yes, I used to
                      </div>
                      <div className={`px-3 py-2 rounded ${participant.demographics.hasCollected === 'no' ? 'bg-blue-100 border-2 border-blue-500' : 'bg-slate-50 border border-slate-200'}`}>
                        No
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Question 2 */}
                <Card className="p-6 space-y-3">
                  <div className="flex items-baseline gap-3">
                    <Badge variant="secondary" className="shrink-0">Q2</Badge>
                    <h3 className="text-slate-900">
                      How much do you spend monthly on cards (estimated)?
                    </h3>
                  </div>
                  <div className="ml-11 space-y-2">
                    <div className="text-sm text-slate-600">Options:</div>
                    <div className="flex flex-col gap-2 text-sm">
                      <div className={`px-3 py-2 rounded ${participant.demographics.monthlySpending === '0' ? 'bg-blue-100 border-2 border-blue-500' : 'bg-slate-50 border border-slate-200'}`}>
                        $0
                      </div>
                      <div className={`px-3 py-2 rounded ${participant.demographics.monthlySpending === '1-50' ? 'bg-blue-100 border-2 border-blue-500' : 'bg-slate-50 border border-slate-200'}`}>
                        $1–$50
                      </div>
                      <div className={`px-3 py-2 rounded ${participant.demographics.monthlySpending === '51-100' ? 'bg-blue-100 border-2 border-blue-500' : 'bg-slate-50 border border-slate-200'}`}>
                        $51–$100
                      </div>
                      <div className={`px-3 py-2 rounded ${participant.demographics.monthlySpending === '101-250' ? 'bg-blue-100 border-2 border-blue-500' : 'bg-slate-50 border border-slate-200'}`}>
                        $101–$250
                      </div>
                      <div className={`px-3 py-2 rounded ${participant.demographics.monthlySpending === '251-500' ? 'bg-blue-100 border-2 border-blue-500' : 'bg-slate-50 border border-slate-200'}`}>
                        $251–$500
                      </div>
                      <div className={`px-3 py-2 rounded ${participant.demographics.monthlySpending === '500+' ? 'bg-blue-100 border-2 border-blue-500' : 'bg-slate-50 border border-slate-200'}`}>
                        $500+
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Question 3 */}
                <Card className="p-6 space-y-3">
                  <div className="flex items-baseline gap-3">
                    <Badge variant="secondary" className="shrink-0">Q3</Badge>
                    <h3 className="text-slate-900">
                      Have you ever graded a card with PSA or another company (e.g., BGS, CGC, TAG)?
                    </h3>
                  </div>
                  <div className="ml-11 space-y-2">
                    <div className="text-sm text-slate-600">Options:</div>
                    <div className="flex flex-col gap-2 text-sm">
                      <div className={`px-3 py-2 rounded ${participant.demographics.hasGraded === 'yes' ? 'bg-blue-100 border-2 border-blue-500' : 'bg-slate-50 border border-slate-200'}`}>
                        Yes
                      </div>
                      <div className={`px-3 py-2 rounded ${participant.demographics.hasGraded === 'no' ? 'bg-blue-100 border-2 border-blue-500' : 'bg-slate-50 border border-slate-200'}`}>
                        No
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Question 4 */}
                <Card className="p-6 space-y-3">
                  <div className="flex items-baseline gap-3">
                    <Badge variant="secondary" className="shrink-0">Q4</Badge>
                    <h3 className="text-slate-900">
                      Collector type
                    </h3>
                  </div>
                  <div className="ml-11 space-y-2">
                    <div className="text-sm text-slate-600">Options:</div>
                    <div className="flex flex-col gap-2 text-sm">
                      <div className={`px-3 py-2 rounded ${participant.demographics.collectorType === 'casual' ? 'bg-blue-100 border-2 border-blue-500' : 'bg-slate-50 border border-slate-200'}`}>
                        Casual
                      </div>
                      <div className={`px-3 py-2 rounded ${participant.demographics.collectorType === 'dedicated' ? 'bg-blue-100 border-2 border-blue-500' : 'bg-slate-50 border border-slate-200'}`}>
                        Dedicated
                      </div>
                      <div className={`px-3 py-2 rounded ${participant.demographics.collectorType === 'investor' ? 'bg-blue-100 border-2 border-blue-500' : 'bg-slate-50 border border-slate-200'}`}>
                        Investor
                      </div>
                      <div className={`px-3 py-2 rounded ${participant.demographics.collectorType === 'seller-vendor' ? 'bg-blue-100 border-2 border-blue-500' : 'bg-slate-50 border border-slate-200'}`}>
                        Seller / Vendor
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Question 5 */}
                <Card className="p-6 space-y-3">
                  <div className="flex items-baseline gap-3">
                    <Badge variant="secondary" className="shrink-0">Q5</Badge>
                    <h3 className="text-slate-900">
                      Selling experience
                    </h3>
                  </div>
                  <div className="ml-11 space-y-2">
                    <div className="text-sm text-slate-600">Options:</div>
                    <div className="flex flex-col gap-2 text-sm">
                      <div className={`px-3 py-2 rounded ${participant.demographics.sellingExperience === 'none' ? 'bg-blue-100 border-2 border-blue-500' : 'bg-slate-50 border border-slate-200'}`}>
                        None
                      </div>
                      <div className={`px-3 py-2 rounded ${participant.demographics.sellingExperience === '1-3yrs' ? 'bg-blue-100 border-2 border-blue-500' : 'bg-slate-50 border border-slate-200'}`}>
                        1–3 yrs
                      </div>
                      <div className={`px-3 py-2 rounded ${participant.demographics.sellingExperience === '3-5yrs' ? 'bg-blue-100 border-2 border-blue-500' : 'bg-slate-50 border border-slate-200'}`}>
                        3–5 yrs
                      </div>
                      <div className={`px-3 py-2 rounded ${participant.demographics.sellingExperience === '5+yrs' ? 'bg-blue-100 border-2 border-blue-500' : 'bg-slate-50 border border-slate-200'}`}>
                        5+ yrs
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Question 6 */}
                <Card className="p-6 space-y-3">
                  <div className="flex items-baseline gap-3">
                    <Badge variant="secondary" className="shrink-0">Q6</Badge>
                    <h3 className="text-slate-900">
                      How often do you buy or sell cards (online or in-person)?
                    </h3>
                  </div>
                  <div className="ml-11 space-y-2">
                    <div className="text-sm text-slate-600">Options:</div>
                    <div className="flex flex-col gap-2 text-sm">
                      <div className={`px-3 py-2 rounded ${participant.demographics.buyingSellingFrequency === 'weekly' ? 'bg-blue-100 border-2 border-blue-500' : 'bg-slate-50 border border-slate-200'}`}>
                        Weekly
                      </div>
                      <div className={`px-3 py-2 rounded ${participant.demographics.buyingSellingFrequency === 'monthly' ? 'bg-blue-100 border-2 border-blue-500' : 'bg-slate-50 border border-slate-200'}`}>
                        Monthly
                      </div>
                      <div className={`px-3 py-2 rounded ${participant.demographics.buyingSellingFrequency === 'occasionally' ? 'bg-blue-100 border-2 border-blue-500' : 'bg-slate-50 border border-slate-200'}`}>
                        Occasionally
                      </div>
                      <div className={`px-3 py-2 rounded ${participant.demographics.buyingSellingFrequency === 'rarely' ? 'bg-blue-100 border-2 border-blue-500' : 'bg-slate-50 border border-slate-200'}`}>
                        Rarely
                      </div>
                      <div className={`px-3 py-2 rounded ${participant.demographics.buyingSellingFrequency === 'never' ? 'bg-blue-100 border-2 border-blue-500' : 'bg-slate-50 border border-slate-200'}`}>
                        Never
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Question 7 */}
                <Card className="p-6 space-y-3">
                  <div className="flex items-baseline gap-3">
                    <Badge variant="secondary" className="shrink-0">Q7</Badge>
                    <h3 className="text-slate-900">
                      Current places you buy/sell cards on (select all that apply)
                    </h3>
                  </div>
                  <div className="ml-11 space-y-2">
                    <div className="text-sm text-slate-600">Selected platforms:</div>
                    <div className="flex flex-wrap gap-2">
                      {participant.demographics.currentPlatforms && participant.demographics.currentPlatforms.map((platform: string, idx: number) => (
                        <Badge key={idx} className="bg-blue-500">{platform}</Badge>
                      ))}
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Usability Test Tab */}
          <TabsContent value="test" className="space-y-6 mt-6">
            {/* AI Analysis Section */}
            {participant.submitted === true && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                  <div className="flex items-center gap-2">
                    <h3 className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      AI-Generated Analysis
                      <Badge variant="secondary" className="text-xs">Optional</Badge>
                    </h3>
                  </div>
                  {!aiAnalysis ? (
                    <Button
                      onClick={generateAnalysis}
                      disabled={generatingAnalysis}
                      size="sm"
                      className="gap-2"
                    >
                      {generatingAnalysis ? (
                        <>
                          <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Generate Analysis
                        </>
                      )}
                    </Button>
                  ) : (
                    <Badge className="bg-green-500">Generated</Badge>
                  )}
                </div>

                {/* AI Analysis Display */}
                {aiAnalysis && (
                  <Card className="p-6 space-y-6">
                    {aiAnalysis.error ? (
                      <Alert className="border-amber-300 bg-amber-50">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        <AlertDescription className="text-amber-900 whitespace-pre-line">
                          {aiAnalysis.errorMessage}
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <>
                        {/* Executive Summary */}
                        <div>
                          <h3 className="mb-2">Executive Summary</h3>
                          <p className="text-sm text-slate-700 leading-relaxed">
                            {aiAnalysis.executiveSummary}
                          </p>
                        </div>

                        {/* Key Findings */}
                        {aiAnalysis.keyFindings && aiAnalysis.keyFindings.length > 0 && (
                          <div className="border-t border-slate-200 pt-4">
                            <h3 className="mb-3">Key Findings</h3>
                            <ul className="space-y-2">
                              {aiAnalysis.keyFindings.map((finding, idx) => (
                                <li key={idx} className="flex gap-2 text-sm text-slate-700">
                                  <span className="text-blue-600 shrink-0">•</span>
                                  <span>{finding}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Pain Points */}
                        {aiAnalysis.painPoints && aiAnalysis.painPoints.length > 0 && (
                          <div className="border-t border-slate-200 pt-4">
                            <h3 className="mb-3">Key Pain Points</h3>
                            <div className="space-y-2">
                              {aiAnalysis.painPoints.map((point, idx) => (
                                <div key={idx} className="flex gap-2 text-sm bg-red-50 border border-red-200 rounded p-3">
                                  <span className="text-red-600 shrink-0">⚠</span>
                                  <span className="text-red-900">{point}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Positive Highlights */}
                        {aiAnalysis.positiveHighlights && aiAnalysis.positiveHighlights.length > 0 && (
                          <div className="border-t border-slate-200 pt-4">
                            <h3 className="mb-3">Positive Highlights</h3>
                            <div className="space-y-2">
                              {aiAnalysis.positiveHighlights.map((highlight, idx) => (
                                <div key={idx} className="flex gap-2 text-sm bg-green-50 border border-green-200 rounded p-3">
                                  <span className="text-green-600 shrink-0">✓</span>
                                  <span className="text-green-900">{highlight}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Areas for Improvement */}
                        {aiAnalysis.recommendations && aiAnalysis.recommendations.length > 0 && (
                          <div className="border-t border-slate-200 pt-4">
                            <h3 className="mb-3">Areas for Improvement</h3>
                            <ul className="space-y-2">
                              {aiAnalysis.recommendations.map((rec, idx) => (
                                <li key={idx} className="flex gap-2 text-sm text-slate-700">
                                  <span className="text-purple-600 shrink-0">→</span>
                                  <span>{rec}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Key Moments */}
                        {aiAnalysis.keyMoments && aiAnalysis.keyMoments.length > 0 && (
                          <div className="border-t border-slate-200 pt-4">
                            <h3 className="mb-3">Key Moments</h3>
                            <div className="space-y-3">
                              {aiAnalysis.keyMoments.map((moment, idx) => (
                                <Card key={idx} className="p-4 bg-blue-50 border-blue-200">
                                  <div className="flex items-start gap-3">
                                    <Badge className="bg-blue-600 shrink-0">Task {moment.task}</Badge>
                                    <div className="flex-1 space-y-2">
                                      <p className="text-sm">{moment.moment}</p>
                                      {moment.quote && (
                                        <p className="text-sm italic text-slate-600 border-l-2 border-blue-400 pl-3">
                                          "{moment.quote}"
                                        </p>
                                      )}
                                      {moment.significance && (
                                        <p className="text-xs text-blue-800">
                                          💡 {moment.significance}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </Card>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="border-t border-slate-200 pt-4 text-xs text-slate-500">
                          Generated: {new Date(aiAnalysis.generatedAt).toLocaleString()} • Model: {aiAnalysis.model}
                        </div>
                      </>
                    )}
                  </Card>
                )}
              </div>
            )}

            {/* Task Screen Recordings */}
            <div className="space-y-6">
              <h2 className="flex items-center gap-2">
                <Monitor className="w-5 h-5" />
                Task Screen Recordings
              </h2>
              {recordings.length === 0 ? (
                <Card className="p-6 text-center bg-slate-50">
                  <Monitor className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-600 mb-2">
                    {participant.submitted 
                      ? 'No recordings were made during this test' 
                      : 'No recordings available yet'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {participant.submitted
                      ? 'This participant completed the test without enabling screen recording or audio'
                      : 'Recordings will appear here when the participant completes tasks with recording enabled'}
                  </p>
                </Card>
              ) : (
                <div className="space-y-8">
                  {recordings.map((recording) => {
                    // Get the task response data for this task
                    const taskResponse = participant.tasks?.[`task${recording.taskNumber}`];
                    
                    // Get the actual task duration from taskTimings (more accurate than recording duration)
                    const taskTiming = participant.taskTimings?.[`task${recording.taskNumber}`];
                    const actualDuration = taskTiming?.duration || recording.duration;
                    
                    // Debug logging
                    console.log(`Recording for Task ${recording.taskNumber}:`, {
                      hasScreenUrl: !!recording.screenUrl,
                      recordingDuration: recording.duration,
                      actualTaskDuration: actualDuration,
                      usingTaskTiming: !!taskTiming
                    });
                    
                    return (
                      <div key={recording.taskNumber} className="space-y-4">
                        <TaskRecordingView
                          taskNumber={recording.taskNumber}
                          taskDescription=""
                          screenUrl={recording.screenUrl}
                          duration={actualDuration}
                          taskResponse={taskResponse}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Task Follow-Up Responses (for tasks without recordings) */}
            {participant.tasks && (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((taskNum) => {
                  const taskData = participant.tasks?.[`task${taskNum}`];
                  const hasRecording = recordings.some(r => r.taskNumber === taskNum);
                  
                  // Skip if already shown with recording above
                  if (hasRecording) return null;
                  
                  // Show "Not Completed" if no data
                  if (!taskData) {
                    return (
                      <Card key={taskNum} className="p-6 bg-red-50 border-red-200">
                        <div className="flex items-baseline gap-3">
                          <Badge className="shrink-0 bg-red-600">Task {taskNum}</Badge>
                          <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-red-600" />
                            <span className="text-red-900">Not Completed</span>
                          </div>
                        </div>
                      </Card>
                    );
                  }
                  
                  return (
                    <Card key={taskNum} className="p-6 space-y-4">
                      <div className="flex items-baseline gap-3 border-b border-slate-200 pb-3">
                        <Badge className="shrink-0 bg-blue-600">Task {taskNum}</Badge>
                        <h3 className="text-slate-900">Task {taskNum} Responses</h3>
                      </div>

                      {/* Completed Status */}
                      <div className="ml-11 space-y-2">
                        <div className="text-sm">
                          <span className="text-slate-600">Q1:</span> Were you able to complete this task successfully?
                        </div>
                        <div className={`px-4 py-2 rounded border-l-4 ${
                          taskData.completed === 'yes' 
                            ? 'bg-green-50 border-green-500' 
                            : taskData.completed === 'partially'
                            ? 'bg-amber-50 border-amber-500'
                            : 'bg-red-50 border-red-500'
                        }`}>
                          <span className="capitalize">{taskData.completed || 'Not answered'}</span>
                        </div>
                      </div>

                      {/* Second Question (ease/difficulty/clarity - varies by task) */}
                      {(() => {
                        // Support all possible field names for backward compatibility
                        const scaleValue = taskData.ease || taskData.difficulty || taskData.clarity || taskData.confidence;
                        const scaleLabel = taskNum === 1 ? 'ease' : taskNum === 2 ? 'difficulty' : 'clarity';
                        
                        if (scaleValue !== undefined) {
                          return (
                            <div className="ml-11 space-y-2">
                              <div className="text-sm">
                                <span className="text-slate-600">Q2:</span> Rating
                              </div>
                              <div className="px-4 py-2 bg-slate-50 border border-slate-200 rounded flex items-center gap-3">
                                <div className="flex gap-1">
                                  {[1, 2, 3, 4, 5].map((num) => (
                                    <div
                                      key={num}
                                      className={`w-8 h-8 rounded flex items-center justify-center text-sm ${
                                        num <= scaleValue
                                          ? 'bg-blue-600 text-white'
                                          : 'bg-slate-200 text-slate-400'
                                      }`}
                                    >
                                      {num}
                                    </div>
                                  ))}
                                </div>
                                <span className="text-sm text-slate-600">
                                  ({scaleValue}/5)
                                </span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}

                      {/* Feedback - support both old and new field names */}
                      <div className="ml-11 space-y-2">
                        <div className="text-sm text-slate-600">
                          Q3: Written Feedback
                        </div>
                        {(() => {
                          // Support all possible feedback field names for backward compatibility
                          const feedbackText = taskData.feedback || taskData.features || taskData.insights || 
                                               taskData.reasoning || taskData.concerns || taskData.improvements;
                          
                          if (feedbackText) {
                            return (
                              <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded">
                                <p className="text-sm text-slate-700 whitespace-pre-wrap">{feedbackText}</p>
                              </div>
                            );
                          } else {
                            return (
                              <div className="px-4 py-2 bg-amber-50 border border-amber-200 rounded">
                                <p className="text-sm text-amber-800">No feedback provided</p>
                              </div>
                            );
                          }
                        })()}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}