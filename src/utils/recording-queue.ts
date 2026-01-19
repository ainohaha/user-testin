// Global recording upload queue to track pending uploads
// This ensures all recordings are saved even if components unmount

class RecordingQueue {
  private pendingUploads: Set<Promise<void>> = new Set();
  
  addUpload(uploadPromise: Promise<void>): void {
    this.pendingUploads.add(uploadPromise);
    console.log(`📋 Added upload to queue. Total pending: ${this.pendingUploads.size}`);
    
    uploadPromise
      .finally(() => {
        this.pendingUploads.delete(uploadPromise);
        console.log(`✅ Upload completed. Remaining pending: ${this.pendingUploads.size}`);
      });
  }
  
  async waitForAll(): Promise<void> {
    if (this.pendingUploads.size === 0) {
      console.log('✅ No pending uploads to wait for');
      return;
    }
    
    console.log(`⏳ Waiting for ${this.pendingUploads.size} pending uploads to complete...`);
    await Promise.allSettled(Array.from(this.pendingUploads));
    console.log('✅ All uploads completed');
  }
  
  getPendingCount(): number {
    return this.pendingUploads.size;
  }
}

export const recordingQueue = new RecordingQueue();
