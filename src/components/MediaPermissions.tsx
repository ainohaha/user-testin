import { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Monitor, CheckCircle2, XCircle, AlertCircle, Sparkles } from 'lucide-react';

interface MediaPermissionsProps {
  onNext: (data: Record<string, any>) => void;
  onPermissionsGranted: (screenStream: MediaStream) => void;
}

export function MediaPermissions({ onNext, onPermissionsGranted }: MediaPermissionsProps) {
  const [screenPermission, setScreenPermission] = useState<'pending' | 'granted' | 'denied'>('pending');
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>('');
  
  // Preload the Figma prototype
  const prototypeLink = 'https://embed.figma.com/proto/1W60xlSmnKrLwzhUPP6WVr/ProVault-App?page-id=1%3A864&node-id=2160-7950&p=f&viewport=-158%2C-154%2C0.15&scaling=contain&content-scaling=fixed&starting-point-node-id=2160%3A7950&hotspot-hints=0&embed-host=share';

  const requestScreenPermission = async () => {
    try {
      setError('');
      console.log('🖥️ ============ REQUESTING SCREEN PERMISSION ============');
      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: { displaySurface: 'browser' } as any,
        audio: false,
        preferCurrentTab: true as any
      });
      
      console.log('✅ Screen permission granted');
      console.log('🖥️ Screen stream details:', {
        id: stream.id,
        active: stream.active,
        tracks: stream.getTracks().map(t => ({
          kind: t.kind,
          enabled: t.enabled,
          readyState: t.readyState,
          label: t.label,
          settings: t.getSettings()
        }))
      });
      
      // Listen for when user stops sharing
      stream.getVideoTracks()[0].onended = () => {
        console.warn('⚠️ Screen sharing was stopped by user');
        setScreenPermission('denied');
        setScreenStream(null);
        setError('Screen sharing was stopped. Please share your screen again to continue.');
      };
      
      setScreenStream(stream);
      setScreenPermission('granted');
    } catch (err: any) {
      console.error('❌ Screen permission error:', err);
      setScreenPermission('denied');
      
      if (err.name === 'NotAllowedError') {
        setError('Screen sharing was denied. Please allow screen sharing and try again.');
      } else {
        setError('Unable to access screen. Please check your browser settings and try again.');
      }
    }
  };

  const handleContinue = () => {
    // Screen stream is REQUIRED - must have been granted
    if (!screenStream) {
      setError('Screen recording is required to continue. Please grant screen recording permission.');
      return;
    }
    
    onPermissionsGranted(screenStream);
    onNext({ 
      permissionsGranted: true
    });
  };

  const allReady = screenPermission === 'granted';

  return (
    <div className="space-y-6">
      {/* Hidden iframe to preload the Figma prototype */}
      <iframe
        src={prototypeLink}
        className="hidden"
        title="Figma Prototype Preload"
        allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
      />

      <div className="space-y-2">
        <h1>Setup Your Recording</h1>
        <p className="text-slate-600">
          Screen recording is required to capture your interaction with the prototype.
        </p>
      </div>

      <Alert className="bg-[rgb(255,249,239)] border-blue-200">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-[rgb(83,83,81)]">
          <strong>Privacy Note:</strong> Your screen recording is used solely for research purposes to help us understand how you interact with the prototype.
        </AlertDescription>
      </Alert>

      {/* Screen Recording - REQUIRED */}
      <Card className="p-6 space-y-5">
        <h2 className="font-bold mb-0 leading-none">Screen Recording (Required)</h2>

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${
              screenPermission === 'granted' ? 'bg-green-100' : 
              screenPermission === 'denied' ? 'bg-red-100' : 
              'bg-slate-100'
            }`}>
              <Monitor className={`w-5 h-5 ${
                screenPermission === 'granted' ? 'text-green-600' : 
                screenPermission === 'denied' ? 'text-red-600' : 
                'text-slate-600'
              }`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3>Screen Recording</h3>
                {screenPermission === 'granted' && (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                )}
                {screenPermission === 'denied' && (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
              </div>
              <p className="text-sm text-slate-600 mt-1 italic">
                Required - helps us see your interaction with the prototype
              </p>
              <Alert className="mt-3 bg-blue-50 border-blue-200">
                <AlertDescription className="text-sm text-slate-700">
                  <strong>Tip:</strong> When prompted, select <strong>"This Tab"</strong> to share only the current browser tab
                </AlertDescription>
              </Alert>
              {screenPermission === 'pending' && (
                <div className="space-y-2">
                  <Button 
                    onClick={requestScreenPermission} 
                    className="mt-3"
                    variant="outline"
                  >
                    Enable Screen Recording
                  </Button>
                </div>
              )}
              {screenPermission === 'denied' && (
                <div className="space-y-2">
                  <Button 
                    onClick={requestScreenPermission} 
                    className="mt-3"
                    variant="outline"
                  >
                    Try Again
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {error && (
        <Alert className="border-red-300 bg-red-50">
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-900">
            <div className="space-y-2">
              <p>{error}</p>
              <div className="text-sm mt-3 space-y-1">
                <p className="font-bold">How to fix:</p>
                <p>• <strong>Chrome/Edge:</strong> Click the screen icon in the address bar, select "Allow", then click "Try Again"</p>
                <p>• <strong>Firefox:</strong> Click the screen icon in the address bar, select "Allow", then click "Try Again"</p>
                <p>• <strong>Safari:</strong> Safari → Settings for This Website → Screen Recording → Allow</p>
                <p className="mt-2 text-xs italic">After changing permissions, you may need to refresh the page.</p>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {allReady && (
        <Alert className="border-green-300 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-900">
            <strong>All set!</strong> Screen recording is ready.
          </AlertDescription>
        </Alert>
      )}

      {screenPermission === 'pending' && (
        <Card className="p-5 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-200 rounded-lg">
              <Monitor className="w-6 h-6 text-blue-700" />
            </div>
            <div className="space-y-2 flex-1">
              <h3>Screen Recording</h3>
              <ul className="text-sm space-y-1.5 text-slate-700">
                <li>• Select <strong>"This Tab"</strong> when prompted (required)</li>
                <li>• Recording auto-starts when you begin the test</li>
                <li>• Captures your interaction with the prototype</li>
              </ul>
            </div>
          </div>
        </Card>
      )}

      {allReady && (
        <Card className="p-5 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-green-200 rounded-lg">
              <Sparkles className="w-6 h-6 text-green-700" />
            </div>
            <div className="space-y-2 flex-1">
              <h3>Best Practices</h3>
              <ul className="text-sm space-y-1.5 text-slate-700">
                <li>• Keep the prototype tab active while testing</li>
                <li>• Type your feedback in the provided text fields</li>
                <li>• Take your time and think through each task</li>
              </ul>
            </div>
          </div>
        </Card>
      )}

      <Button
        onClick={handleContinue}
        disabled={!allReady}
        className="w-full"
        size="lg"
      >
        {allReady ? 'Continue to Test' : 'Enable Screen Recording to Continue'}
      </Button>
    </div>
  );
}