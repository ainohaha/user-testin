import { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { FileSearch, Terminal } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface DiagnosticResult {
  participantId: string;
  participant: any;
  recordings: any[];
  kvKeys: string[];
  storageFiles: string[];
}

export function DiagnosticPanel() {
  const [participantId, setParticipantId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [error, setError] = useState('');

  const runDiagnostic = async () => {
    if (!participantId.trim()) {
      setError('Please enter a participant ID');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setResult(null);
      
      console.log('🔍 Running diagnostic for participant:', participantId);
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-b0f3b375/admin/diagnostic/${participantId}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Diagnostic failed');
      }

      const data = await response.json();
      console.log('🔍 Diagnostic results:', data);
      setResult(data);
    } catch (err) {
      console.error('Error running diagnostic:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <h3 className="flex items-center gap-2 mb-1">
            <Terminal className="w-5 h-5" />
            Participant Diagnostic
          </h3>
          <p className="text-sm text-slate-600">
            Check what data exists for a specific participant
          </p>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={participantId}
            onChange={(e) => setParticipantId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runDiagnostic()}
            placeholder="Enter Participant ID..."
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#EE4137] focus:border-transparent text-sm"
          />
          <Button
            onClick={runDiagnostic}
            disabled={loading || !participantId.trim()}
            className="gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Checking...
              </>
            ) : (
              <>
                <FileSearch className="w-4 h-4" />
                Check
              </>
            )}
          </Button>
        </div>

        {error && (
          <Alert className="border-red-300 bg-red-50">
            <AlertDescription className="text-red-800 text-sm">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {result && (
          <div className="space-y-3 pt-4 border-t">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded border">
                <p className="text-xs text-slate-600 mb-1">Participant Found</p>
                <p className="text-lg">
                  {result.participant ? '✅ Yes' : '❌ No'}
                </p>
              </div>
              
              <div className="p-3 bg-slate-50 rounded border">
                <p className="text-xs text-slate-600 mb-1">Recordings</p>
                <p className="text-lg">
                  {result.recordings?.length || 0}
                </p>
              </div>
            </div>

            {result.participant && (
              <div className="p-3 bg-blue-50 rounded border border-blue-200">
                <p className="text-xs text-blue-800 mb-2">Participant Data:</p>
                <pre className="text-[10px] text-blue-900 overflow-auto max-h-32 font-mono">
                  {JSON.stringify(result.participant, null, 2)}
                </pre>
              </div>
            )}

            {result.recordings && result.recordings.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-slate-700">Recording Details:</p>
                {result.recordings.map((rec: any, idx: number) => (
                  <div key={idx} className="p-3 bg-green-50 rounded border border-green-200">
                    <p className="text-xs mb-2">
                      <span className="font-medium">Task {rec.taskNumber}</span>
                      <span className="text-slate-500 ml-2">{new Date(rec.timestamp).toLocaleString()}</span>
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div>
                        <span className="text-green-800">Audio: </span>
                        <span className={rec.audioPath ? 'text-green-700' : 'text-slate-400'}>
                          {rec.audioPath || 'none'}
                        </span>
                      </div>
                      <div>
                        <span className="text-green-800">Screen: </span>
                        <span className={rec.screenPath ? 'text-green-700' : 'text-slate-400'}>
                          {rec.screenPath || 'none'}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-green-800">Transcript: </span>
                        <span className="text-green-700">
                          {rec.transcript ? `${rec.transcript.length} chars` : 'none'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {result.kvKeys && result.kvKeys.length > 0 && (
              <div className="p-3 bg-purple-50 rounded border border-purple-200">
                <p className="text-xs text-purple-800 mb-2">KV Store Keys Found ({result.kvKeys.length}):</p>
                <div className="text-[10px] text-purple-900 space-y-1 font-mono">
                  {result.kvKeys.map((key: string, idx: number) => (
                    <div key={idx}>• {key}</div>
                  ))}
                </div>
              </div>
            )}

            {result.storageFiles && result.storageFiles.length > 0 && (
              <div className="p-3 bg-orange-50 rounded border border-orange-200">
                <p className="text-xs text-orange-800 mb-2">Storage Files Found ({result.storageFiles.length}):</p>
                <div className="text-[10px] text-orange-900 space-y-1 font-mono">
                  {result.storageFiles.map((file: string, idx: number) => (
                    <div key={idx}>• {file}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
