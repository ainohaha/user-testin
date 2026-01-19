// Recovery utilities for debugging and finding lost recordings
import * as kv from './kv_store.tsx';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// List all recordings in the KV store
export async function listAllRecordings() {
  console.log('🔍 Searching for all recordings in KV store...');
  
  const allRecordings = await kv.getByPrefix('recording:');
  
  console.log(`Found ${allRecordings.length} recordings in KV store`);
  
  allRecordings.forEach((recording: any, idx: number) => {
    console.log(`\nRecording ${idx + 1}:`, {
      participantId: recording.participantId,
      taskNumber: recording.taskNumber,
      audioPath: recording.audioPath,
      screenPath: recording.screenPath,
      hasTranscript: !!recording.transcript,
      transcriptLength: recording.transcript?.length || 0,
      timestamp: recording.timestamp
    });
  });
  
  return allRecordings;
}

// List all files in the storage bucket
export async function listAllStorageFiles() {
  console.log('🔍 Searching for all files in storage bucket...');
  
  const bucketName = 'make-b0f3b375-recordings';
  const allFiles: any[] = [];
  
  try {
    // First, list all top-level items (folders)
    const { data: folders, error: folderError } = await supabase.storage
      .from(bucketName)
      .list('', {
        limit: 1000,
        sortBy: { column: 'created_at', order: 'desc' }
      });
    
    if (folderError) {
      console.error('Error listing storage folders:', folderError);
      return [];
    }
    
    console.log(`Found ${folders?.length || 0} top-level items (folders)`);
    
    // Now list files inside each folder
    for (const folder of folders || []) {
      if (folder.name) {
        const { data: files, error: filesError } = await supabase.storage
          .from(bucketName)
          .list(folder.name, {
            limit: 1000
          });
        
        if (!filesError && files) {
          files.forEach((file: any) => {
            allFiles.push({
              name: `${folder.name}/${file.name}`,
              size: file.metadata?.size || 0,
              created_at: file.created_at,
              updated_at: file.updated_at
            });
          });
        }
      }
    }
    
    console.log(`Found ${allFiles.length} total files in storage bucket`);
    
    allFiles.forEach((file: any, idx: number) => {
      console.log(`\nFile ${idx + 1}:`, {
        name: file.name,
        size: file.size,
        created: file.created_at,
        updated: file.updated_at
      });
    });
    
    return allFiles;
  } catch (err) {
    console.error('Error accessing storage:', err);
    return [];
  }
}

// Find recordings that have storage files but no KV entry
export async function findOrphanedFiles() {
  console.log('🔍 Looking for orphaned files (in storage but not in KV)...');
  
  const kvRecordings = await listAllRecordings();
  const storageFiles = await listAllStorageFiles();
  
  const kvPaths = new Set<string>();
  kvRecordings.forEach((rec: any) => {
    if (rec.audioPath) kvPaths.add(rec.audioPath);
    if (rec.screenPath) kvPaths.add(rec.screenPath);
  });
  
  const orphanedFiles = storageFiles.filter((file: any) => {
    return !kvPaths.has(file.name);
  });
  
  console.log(`\nFound ${orphanedFiles.length} orphaned files`);
  orphanedFiles.forEach((file: any) => {
    console.log('Orphaned file:', file.name);
  });
  
  return orphanedFiles;
}

// Find recordings in KV that have no storage files
export async function findMissingFiles() {
  console.log('🔍 Looking for missing files (in KV but not in storage)...');
  
  const kvRecordings = await listAllRecordings();
  const storageFiles = await listAllStorageFiles();
  
  const storageFileNames = new Set(storageFiles.map((f: any) => f.name));
  
  const missingFiles: any[] = [];
  
  kvRecordings.forEach((rec: any) => {
    const missing = [];
    if (rec.audioPath && !storageFileNames.has(rec.audioPath)) {
      missing.push(`audio: ${rec.audioPath}`);
    }
    if (rec.screenPath && !storageFileNames.has(rec.screenPath)) {
      missing.push(`screen: ${rec.screenPath}`);
    }
    
    if (missing.length > 0) {
      missingFiles.push({
        participantId: rec.participantId,
        taskNumber: rec.taskNumber,
        missing
      });
    }
  });
  
  console.log(`\nFound ${missingFiles.length} recordings with missing files`);
  missingFiles.forEach((item: any) => {
    console.log(`Participant ${item.participantId}, Task ${item.taskNumber}:`, item.missing);
  });
  
  return missingFiles;
}