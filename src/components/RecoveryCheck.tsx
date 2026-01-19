import { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Search, AlertCircle, CheckCircle2, Database, HardDrive } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface RecoverySummary {
  kvRecordingsCount: number;
  storageFilesCount: number;
  orphanedFilesCount: number;
  missingFilesCount: number;
  kvRecordings: Array<{
    participantId: string;
    taskNumber: number;
    hasAudio: boolean;
    hasScreen: boolean;
    hasTranscript: boolean;
    timestamp: string;
  }>;
  storageFiles: Array<{
    name: string;
    size: number;
    created: string;
  }>;
  orphanedFiles: string[];
  missingFiles: Array<{
    participantId: string;
    taskNumber: number;
    missing: string[];
  }>;
}

export function RecoveryCheck() {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<RecoverySummary | null>(null);
  const [error, setError] = useState('');

  const runRecoveryCheck = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('🔍 Running recovery check...');
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-b0f3b375/admin/recovery/check-recordings`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to run recovery check');
      }

      const data = await response.json();
      console.log('🔍 Recovery check results:', data);
      setSummary(data);
    } catch (err) {
      console.error('Error running recovery check:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const repairOrphanedFiles = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('🔧 Repairing orphaned files...');
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-b0f3b375/admin/recovery/repair-orphaned`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to repair orphaned files');
      }

      const data = await response.json();
      console.log('🔧 Repair result:', data);
      
      // Re-run recovery check to get updated status
      await runRecoveryCheck();
    } catch (err) {
      console.error('Error repairing orphaned files:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
    }
  };

  const syncDatabase = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('🔄 Syncing database...');
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-b0f3b375/admin/recovery/sync`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to sync database');
      }

      const data = await response.json();
      console.log('🔄 Sync result:', data);
      
      // Re-run recovery check to get updated status
      await runRecoveryCheck();
    } catch (err) {
      console.error('Error syncing database:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="flex items-center gap-2 mb-1">
              <Search className="w-5 h-5" />
              Recording Recovery Check
            </h3>
            <p className="text-sm text-slate-600">
              Scan for recordings in the database and storage bucket
            </p>
          </div>
          <Button
            onClick={runRecoveryCheck}
            disabled={loading}
            className="gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Scanning...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Run Check
              </>
            )}
          </Button>
        </div>

        {error && (
          <Alert className="border-red-300 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {summary && (
          <div className="space-y-4 pt-4 border-t">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-blue-900">Database (KV Store)</span>
                </div>
                <p className="text-2xl text-blue-600">{summary.kvRecordingsCount}</p>
                <p className="text-xs text-blue-700 mt-1">recordings found</p>
              </div>

              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <HardDrive className="w-4 h-4 text-purple-600" />
                  <span className="text-sm text-purple-900">Storage Bucket</span>
                </div>
                <p className="text-2xl text-purple-600">{summary.storageFilesCount}</p>
                <p className="text-xs text-purple-700 mt-1">files found</p>
              </div>
            </div>

            {summary.orphanedFilesCount > 0 && (
              <Alert className="border-orange-300 bg-orange-50">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <AlertDescription>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <span className="text-orange-900">
                        Found <strong>{summary.orphanedFilesCount}</strong> orphaned files (in storage but not in database)
                      </span>
                      <div className="mt-2 text-xs text-orange-800 space-y-1">
                        {summary.orphanedFiles.slice(0, 5).map((file, idx) => (
                          <div key={idx} className="font-mono">• {file}</div>
                        ))}
                        {summary.orphanedFiles.length > 5 && (
                          <div className="text-orange-700">...and {summary.orphanedFiles.length - 5} more</div>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={repairOrphanedFiles}
                      disabled={loading}
                      className="ml-4 bg-orange-600 hover:bg-orange-700"
                    >
                      Repair
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {summary.missingFilesCount > 0 && (
              <Alert className="border-red-300 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <span className="text-red-900">
                        Found <strong>{summary.missingFilesCount}</strong> recordings with missing files (in database but not in storage)
                      </span>
                      <div className="mt-2 text-xs text-red-800 space-y-2">
                        {summary.missingFiles.slice(0, 5).map((item, idx) => (
                          <div key={idx}>
                            <div className="font-medium">Participant {item.participantId}, Task {item.taskNumber}:</div>
                            {item.missing.map((m, midx) => (
                              <div key={midx} className="ml-4">• Missing {m}</div>
                            ))}
                          </div>
                        ))}
                        {summary.missingFiles.length > 5 && (
                          <div className="text-red-700">...and {summary.missingFiles.length - 5} more</div>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={syncDatabase}
                      disabled={loading}
                      className="ml-4 bg-red-600 hover:bg-red-700"
                    >
                      Sync
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {summary.kvRecordingsCount === 0 && summary.storageFilesCount === 0 && (
              <Alert className="border-yellow-300 bg-yellow-50">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-900">
                  No recordings found in database or storage. This means any previous recordings were not saved successfully.
                </AlertDescription>
              </Alert>
            )}

            {summary.kvRecordingsCount > 0 && summary.orphanedFilesCount === 0 && summary.missingFilesCount === 0 && (
              <Alert className="border-green-300 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-900">
                  All recordings are properly synchronized between database and storage!
                </AlertDescription>
              </Alert>
            )}

            {summary.kvRecordingsCount > 0 && (
              <div className="mt-4">
                <h4 className="text-sm mb-2">Database Recordings:</h4>
                <div className="text-xs space-y-1 max-h-48 overflow-y-auto bg-slate-50 p-3 rounded border">
                  {summary.kvRecordings.map((rec, idx) => (
                    <div key={idx} className="font-mono flex items-center gap-2 py-1">
                      <span className="text-slate-600">{rec.participantId}</span>
                      <span className="text-slate-400">Task {rec.taskNumber}</span>
                      <span className="text-xs">
                        {rec.hasAudio && '🎤'}
                        {rec.hasScreen && '🖥️'}
                        {rec.hasTranscript && '📝'}
                      </span>
                      <span className="text-slate-400 text-[10px] ml-auto">
                        {new Date(rec.timestamp).toLocaleString()}
                      </span>
                    </div>
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