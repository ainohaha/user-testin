import { useState, useEffect } from 'react';
import { IntroConsent } from './components/IntroConsent';
import { MediaPermissions } from './components/MediaPermissions';
import { PrototypeInstructions } from './components/PrototypeInstructions';
import { TaskFlow } from './components/TaskFlow';
import { Demographics } from './components/Demographics';
import { SubmitConfirmation } from './components/SubmitConfirmation';
import { AdminDashboard } from './components/AdminDashboard';
import { ParticipantDetail } from './components/ParticipantDetail';
import { Progress } from './components/ui/progress';
import { ChevronLeft } from 'lucide-react';
import { Button } from './components/ui/button';
import { Alert, AlertDescription } from './components/ui/alert';
import { projectId, publicAnonKey } from './utils/supabase/info';
import { recordingQueue } from './utils/recording-queue';

export default function App() {
  const getInitialParticipantId = () => {
    try {
      const stored = sessionStorage.getItem('participantId');
      if (stored) {
        return stored;
      }
    } catch (e) {
      // Silent fallback
    }
    return '';
  };

  const [currentSection, setCurrentSection] = useState(0);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [prototypeUrl, setPrototypeUrl] = useState('');
  const [participantId, setParticipantId] = useState(getInitialParticipantId);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockMessage, setBlockMessage] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [checkingParticipant, setCheckingParticipant] = useState(true);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [declined, setDeclined] = useState(false);

  const sections = [
    { component: IntroConsent, title: 'Welcome' },
    { component: Demographics, title: 'Screening' },
    { component: MediaPermissions, title: 'Setup Recording' },
    { component: PrototypeInstructions, title: 'Instructions' },
    { component: TaskFlow, title: 'Goals' },
    { component: SubmitConfirmation, title: 'Complete' }
  ];

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const adminParam = urlParams.get('admin');

    if (adminParam === 'true') {
      setShowPasswordPrompt(true);
      setCheckingParticipant(false);
      return;
    }

    checkParticipant();
  }, []);

  useEffect(() => {
    if (!participantId && hasInitialized && !checkingParticipant) {
      console.error('Warning: Participant ID is empty');
    }
  }, [participantId, hasInitialized, checkingParticipant]);

  const handleAdminLogin = () => {
    // Admin password from environment variable
    const expectedPassword = import.meta.env.VITE_ADMIN_PASSWORD || 'admin123';

    if (adminPassword === expectedPassword) {
      setIsAdmin(true);
      setShowPasswordPrompt(false);
      setPasswordError('');
    } else {
      setPasswordError('Incorrect password. Please try again.');
    }
  };

  const checkParticipant = async () => {
    try {
      console.log('🔍 checkParticipant() called');
      console.log('🌐 Project ID:', projectId);
      console.log('🔗 Calling check-participant endpoint...');

      const url = `https://${projectId}.supabase.co/functions/v1/make-server-b0f3b375/check-participant`;
      console.log('📡 Full URL:', url);
      console.log('🔑 Public Anon Key (first 20 chars):', publicAnonKey?.substring(0, 20) + '...');

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });

      console.log('📥 Response status:', response.status);
      console.log('📥 Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Server error response:', errorText);
        throw new Error(`Server returned ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Response data:', data);

      if (!data.allowed) {
        setIsBlocked(true);
        setBlockMessage(data.message || 'You have already completed this test.');
        setHasInitialized(true);
      } else {
        if (!data.participantId) {
          throw new Error('No participant ID returned from server');
        }

        console.log('✅ Participant ID assigned:', data.participantId);
        setParticipantId(data.participantId);
        setHasInitialized(true);

        try {
          sessionStorage.setItem('participantId', data.participantId);
          console.log('✅ Stored in sessionStorage');
        } catch (e) {
          console.warn('⚠️ Could not store in sessionStorage:', e);
        }
      }
    } catch (error) {
      console.error('❌ Error checking participant:', error);
      console.error('❌ Error type:', error instanceof TypeError ? 'TypeError (network/CORS)' : typeof error);
      console.error('❌ Error message:', error instanceof Error ? error.message : String(error));

      // Check if it's a network error
      if (error instanceof TypeError && error.message.includes('Load failed')) {
        console.error('🚨 NETWORK ERROR: Cannot reach the server');
        console.error('   Possible causes:');
        console.error('   1. Server is not running');
        console.error('   2. CORS configuration issue');
        console.error('   3. Invalid URL or credentials');
        console.error('   4. Network connectivity problem');
        console.error('');
        console.error('   📡 Attempted URL:', `https://${projectId}.supabase.co/functions/v1/make-server-b0f3b375/check-participant`);
      }

      const tempId = 'TEMP-' + Math.random().toString(36).substring(7).toUpperCase();
      console.log('⚠️ Using temporary ID as fallback:', tempId);
      setParticipantId(tempId);
      setHasInitialized(true); // Mark as initialized even on error

      // Store in sessionStorage as backup
      try {
        sessionStorage.setItem('participantId', tempId);
      } catch (e) {
        console.warn('⚠️ Could not store in sessionStorage:', e);
      }
    } finally {
      setCheckingParticipant(false);
      console.log('✅ checkParticipant() complete');
    }
  };

  const CurrentComponent = sections[currentSection].component;
  const progress = ((currentSection + 1) / sections.length) * 100;

  const handlePermissionsGranted = (screen: MediaStream) => {
    console.log('🎬 ============ PERMISSIONS GRANTED IN APP ============');
    console.log('🖥️ Screen stream received:', {
      id: screen.id,
      active: screen.active,
      tracks: screen.getTracks().length
    });
    setScreenStream(screen);
    console.log('✅ Streams saved to App state');
  };

  const handleNext = (data: Record<string, any>) => {
    const updatedResponses = { ...responses, ...data };
    setResponses(updatedResponses);

    // Capture prototype URL from instructions section (now at position 3)
    if (currentSection === 3 && data.prototypeLink) {
      setPrototypeUrl(data.prototypeLink);
    }

    // Check if we're completing the TaskFlow section (section 4)
    // TaskFlow is the last section where user provides data, section 5 is just confirmation
    if (currentSection === 4) {
      console.log('🎯 TaskFlow completed - submitting all data to server...');
      // Final submission - send all data to server BEFORE showing confirmation
      submitFinalResponses(updatedResponses);
      // Clean up media streams
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
      }
      // NOW move to confirmation screen
      setCurrentSection(currentSection + 1);
      window.scrollTo(0, 0);
    } else if (currentSection < sections.length - 1) {
      setCurrentSection(currentSection + 1);
      window.scrollTo(0, 0);
    }
  };

  const submitFinalResponses = async (finalResponses: Record<string, any>) => {
    // Prevent duplicate submissions
    if (isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);

      // ⚠️ CRITICAL: Wait for all recording uploads to complete before submitting
      console.log('⏳ Checking for pending recording uploads...');
      const pendingCount = recordingQueue.getPendingCount();
      if (pendingCount > 0) {
        console.log(`⏳ Waiting for ${pendingCount} recording uploads to complete...`);
        await recordingQueue.waitForAll();
        console.log('✅ All recording uploads complete!');
      } else {
        console.log('✅ No pending uploads');
      }

      let activeParticipantId = participantId;

      // Check if participantId is missing (handle both undefined and empty string)
      if (!activeParticipantId || (typeof activeParticipantId === 'string' && activeParticipantId.trim() === '')) {
        // Try to recover from sessionStorage first
        try {
          const storedId = sessionStorage.getItem('participantId');
          if (storedId) {
            activeParticipantId = storedId;
            setParticipantId(storedId);
          }
        } catch (e) {
          // Silent fallback
        }
      }

      // If still missing after sessionStorage check, generate fallback
      if (!activeParticipantId || (typeof activeParticipantId === 'string' && activeParticipantId.trim() === '')) {

        // Generate a fallback ID
        const fallbackId = 'USR-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 7).toUpperCase();

        try {
          sessionStorage.setItem('participantId', fallbackId);
        } catch (e) {
          // Silent fallback
        }

        try {
          const registerResponse = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-b0f3b375/check-participant`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${publicAnonKey}`
              }
            }
          );

          if (registerResponse.ok) {
            const registerData = await registerResponse.json();

            if (registerData.allowed === false) {
              activeParticipantId = fallbackId;
              setParticipantId(activeParticipantId);
            } else if (registerData.participantId) {
              activeParticipantId = registerData.participantId;
              setParticipantId(activeParticipantId);

              try {
                sessionStorage.setItem('participantId', activeParticipantId);
              } catch (e) {
                // Silent fallback
              }
            } else {
              activeParticipantId = fallbackId;
              setParticipantId(activeParticipantId);
            }
          } else {
            activeParticipantId = fallbackId;
            setParticipantId(activeParticipantId);
          }
        } catch (registerError) {
          activeParticipantId = fallbackId;
          setParticipantId(activeParticipantId);
        }
      }

      // Final validation - ensure we have a participant ID
      if (!activeParticipantId) {
        activeParticipantId = 'EMERGENCY-' + Date.now().toString(36).toUpperCase();
        setParticipantId(activeParticipantId);

        try {
          await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-b0f3b375/check-participant`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${publicAnonKey}`
              }
            }
          );
        } catch (e) {
          // Silent fallback
        }
      }

      // Final validation - never send undefined/null
      if (!activeParticipantId || activeParticipantId === 'undefined' || activeParticipantId === 'null') {
        activeParticipantId = 'FINAL-EMERGENCY-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 5).toUpperCase();
        setParticipantId(activeParticipantId);

        try {
          sessionStorage.setItem('participantId', activeParticipantId);
        } catch (e) {
          // Silent fallback
        }
      }

      const payload = {
        participantId: activeParticipantId || 'PAYLOAD-FALLBACK-' + Date.now(),
        responses: finalResponses
      };

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-b0f3b375/submit-response`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify(payload)
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit');
      }

      console.log('✅ Test submitted successfully:', {
        participantId: activeParticipantId,
        timestamp: new Date().toISOString(),
        responseKeys: Object.keys(finalResponses)
      });
    } catch (error) {
      console.error('Error submitting responses:', error);
      setIsSubmitting(false);
      throw error;
    }
  };

  const handleBack = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1);
      window.scrollTo(0, 0);
    }
  };

  const handleDecline = () => {
    setDeclined(true);
  };

  // Show password prompt for admin
  if (showPasswordPrompt && !isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 space-y-6">
          <div className="text-center">
            <h1>Admin Access</h1>
            <p className="text-sm text-slate-600 mt-2">
              Enter the password to view participant data
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-slate-700 mb-2 block">Password</label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter admin password"
                autoFocus
              />
            </div>

            {passwordError && (
              <Alert className="border-red-300 bg-red-50">
                <AlertDescription className="text-red-800 text-sm">
                  {passwordError}
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleAdminLogin}
              className="w-full"
            >
              Access Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show admin dashboard or participant detail
  if (isAdmin) {
    console.log('🟢 Rendering Admin area - APP VERSION 2.0');
    console.log('isAdmin state:', isAdmin);
    console.log('showPasswordPrompt state:', showPasswordPrompt);
    console.log('selectedParticipantId:', selectedParticipantId);

    try {
      // Show participant detail page if one is selected
      if (selectedParticipantId) {
        console.log('🟢 Showing ParticipantDetail for:', selectedParticipantId);
        return (
          <div style={{ minHeight: '100vh', width: '100%' }}>
            <ParticipantDetail
              participantId={selectedParticipantId}
              onBack={() => {
                console.log('🟢 Back button clicked, clearing selectedParticipantId');
                setSelectedParticipantId(null);
              }}
            />
          </div>
        );
      }

      // Otherwise show the dashboard list
      console.log('🟢 Showing AdminDashboard list view');
      const handleSelectParticipant = (id: string) => {
        console.log('🟢 handleSelectParticipant called with:', id);
        setSelectedParticipantId(id);
        console.log('🟢 setSelectedParticipantId called');
      };

      return (
        <div style={{ minHeight: '100vh', width: '100%' }}>
          <AdminDashboard onSelectParticipant={handleSelectParticipant} />
        </div>
      );
    } catch (error) {
      console.error('Error rendering Admin area:', error);
      return (
        <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
            <h1 className="text-red-600">Error Loading Admin Dashboard</h1>
            <p className="text-sm text-slate-600 mt-2">
              {error instanceof Error ? error.message : 'Unknown error'}
            </p>
            <pre className="mt-4 text-xs bg-slate-100 p-4 rounded overflow-auto">
              {error instanceof Error ? error.stack : String(error)}
            </pre>
          </div>
        </div>
      );
    }
  }

  console.log('Current state:', { isAdmin, showPasswordPrompt, checkingParticipant, isBlocked });

  // Show loading state
  if (checkingParticipant) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
          <p className="text-slate-600">Preparing your session...</p>
        </div>
      </div>
    );
  }

  // Show declined screen
  if (declined) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-6">
          <div className="bg-white rounded-lg shadow-lg p-8 space-y-6 text-center">
            <div>
              <h1 className="mb-4">Thank You</h1>
              <p className="text-slate-600">
                Thank you for visiting. We appreciate your time.
              </p>
            </div>
            <div className="pt-4 border-t border-slate-200">
              <p className="text-sm text-slate-500">
                If you change your mind, you can refresh this page to try again.
              </p>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                className="mt-4"
              >
                Start Over
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show blocked message
  if (isBlocked) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-6">
          <Alert className="border-amber-300 bg-amber-50">
            <AlertDescription className="text-amber-900">
              <h2 className="mb-0 leading-none">Uh Oh</h2>
              <p>You've either completed this test already or don't fit the criteria. If you think this is an error, please reach out to the research team.</p>
            </AlertDescription>
          </Alert>
          <div className="text-center">
            <p className="text-xs text-slate-500">
              Participant ID: {participantId || 'N/A'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header - Hide for task flow section and submit screen */}
      {currentSection !== 4 && currentSection !== 5 && (
        <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between mb-3">
              {currentSection > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBack}
                  className="gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </Button>
              )}
            </div>

            {/* Stage Tracker */}
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs transition-all ${currentSection <= 3
                  ? 'bg-[#EE4137] text-white border-2 border-[#EE4137] font-medium'
                  : 'bg-slate-200 text-slate-600 border-2 border-slate-300'
                }`}>
                Setup
              </div>
              <div className="w-2 h-0.5 bg-slate-300" />
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs transition-all ${currentSection === 4
                  ? 'bg-[#EE4137] text-white border-2 border-[#EE4137] font-medium'
                  : 'bg-slate-200 text-slate-600 border-2 border-slate-300'
                }`}>
                Test
              </div>
              <div className="w-2 h-0.5 bg-slate-300" />
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs transition-all ${currentSection === 5
                  ? 'bg-[#EE4137] text-white border-2 border-[#EE4137] font-medium'
                  : 'bg-slate-200 text-slate-600 border-2 border-slate-300'
                }`}>
                Submit
              </div>
            </div>

            <Progress value={progress} className="h-2" />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={currentSection === 4 ? "w-full h-screen" : "max-w-2xl mx-auto px-4 py-8"}>
        {currentSection === 5 ? (
          <SubmitConfirmation
            participantId={participantId}
          />
        ) : (
          <CurrentComponent
            onNext={handleNext}
            onDecline={handleDecline}
            responses={responses}
            prototypeUrl={prototypeUrl}
            participantId={participantId}
            onPermissionsGranted={handlePermissionsGranted}
            screenStream={screenStream}
          />
        )}
      </div>


    </div>
  );
}