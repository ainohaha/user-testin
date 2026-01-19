// Repair utilities to fix orphaned and missing recordings
import * as kv from './kv_store.tsx';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { listAllRecordings, listAllStorageFiles } from './recovery.tsx';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Repair orphaned files by creating database entries
export async function repairOrphanedFiles() {
  console.log('🔧 Starting orphaned file repair...');
  
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
  
  console.log(`Found ${orphanedFiles.length} orphaned files to repair`);
  
  // Group orphaned files by participant and task
  const recordingsToCreate: Map<string, any> = new Map();
  
  for (const file of orphanedFiles) {
    // Parse file path: participantId/taskX_type.webm
    const match = file.name.match(/^([^\/]+)\/task(\d+)_(audio|screen)\.webm$/);
    if (!match) {
      console.warn('Could not parse file path:', file.name);
      continue;
    }
    
    const [, participantId, taskNumber, type] = match;
    const key = `${participantId}:${taskNumber}`;
    
    if (!recordingsToCreate.has(key)) {
      recordingsToCreate.set(key, {
        participantId,
        taskNumber: parseInt(taskNumber),
        audioPath: null,
        screenPath: null,
        transcript: '',
        duration: 0,
        timestamp: file.created_at || new Date().toISOString(),
        repaired: true
      });
    }
    
    const recording = recordingsToCreate.get(key);
    if (type === 'audio') {
      recording.audioPath = file.name;
    } else if (type === 'screen') {
      recording.screenPath = file.name;
    }
  }
  
  console.log(`Creating ${recordingsToCreate.size} database entries for orphaned files`);
  
  const repaired = [];
  for (const [key, recording] of recordingsToCreate.entries()) {
    const kvKey = `recording:${recording.participantId}:task${recording.taskNumber}`;
    
    // Check if this key already exists
    const existing = await kv.get(kvKey);
    if (existing) {
      console.log(`Skipping ${kvKey} - already exists`);
      continue;
    }
    
    await kv.set(kvKey, recording);
    console.log(`✅ Created database entry: ${kvKey}`);
    repaired.push(recording);
  }
  
  return repaired;
}

// Clean up database entries with missing files
export async function cleanupMissingFiles() {
  console.log('🧹 Starting cleanup of database entries with missing files...');
  
  const kvRecordings = await listAllRecordings();
  const storageFiles = await listAllStorageFiles();
  
  const storageFileNames = new Set(storageFiles.map((f: any) => f.name));
  
  const toDelete = [];
  
  for (const rec of kvRecordings) {
    const hasAudio = rec.audioPath && storageFileNames.has(rec.audioPath);
    const hasScreen = rec.screenPath && storageFileNames.has(rec.screenPath);
    
    // If both audio and screen are missing, delete the entry
    if (!hasAudio && !hasScreen) {
      toDelete.push(rec);
    }
  }
  
  console.log(`Found ${toDelete.length} database entries to clean up`);
  
  for (const rec of toDelete) {
    const kvKey = `recording:${rec.participantId}:task${rec.taskNumber}`;
    await kv.del(kvKey);
    console.log(`🗑️ Deleted database entry: ${kvKey}`);
  }
  
  return toDelete;
}

// Update database entries to match actual storage files
export async function syncDatabaseWithStorage() {
  console.log('🔄 Syncing database with storage...');
  
  const kvRecordings = await listAllRecordings();
  const storageFiles = await listAllStorageFiles();
  
  const storageFileNames = new Set(storageFiles.map((f: any) => f.name));
  
  const updated = [];
  
  for (const rec of kvRecordings) {
    let needsUpdate = false;
    const updatedRec = { ...rec };
    
    // Remove audio path if file doesn't exist
    if (rec.audioPath && !storageFileNames.has(rec.audioPath)) {
      console.log(`Removing missing audio path: ${rec.audioPath}`);
      updatedRec.audioPath = null;
      needsUpdate = true;
    }
    
    // Remove screen path if file doesn't exist
    if (rec.screenPath && !storageFileNames.has(rec.screenPath)) {
      console.log(`Removing missing screen path: ${rec.screenPath}`);
      updatedRec.screenPath = null;
      needsUpdate = true;
    }
    
    if (needsUpdate) {
      const kvKey = `recording:${rec.participantId}:task${rec.taskNumber}`;
      await kv.set(kvKey, updatedRec);
      console.log(`✅ Updated database entry: ${kvKey}`);
      updated.push(updatedRec);
    }
  }
  
  console.log(`Updated ${updated.length} database entries`);
  
  return updated;
}
