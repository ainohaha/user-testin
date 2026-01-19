import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Users, Download, ChevronRight, ChevronLeft, Filter, Star, Trash2, CheckSquare, Square, Folder, FolderPlus, Edit2, X, Link, Palette } from 'lucide-react';
import { ThemeCustomizer } from './ThemeCustomizer';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { toast } from 'sonner@2.0.3';
import { Toaster } from './ui/sonner';

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
  starred?: boolean;
  bucketId?: string;
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
  recordingBucket?: string;
  declined?: boolean;
  referrer?: string;
}

interface Bucket {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt?: string;
}

interface AdminDashboardProps {
  onSelectParticipant: (participantId: string) => void;
}

export function AdminDashboard({ onSelectParticipant }: AdminDashboardProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showHidden, setShowHidden] = useState(false); // Toggle to show participants who didn't make it halfway

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
  const getParticipantStatus = (participant: Participant): { status: string; variant: string; color: string } => {
    // Use strict equality to check submitted status
    // Check for both boolean true and string "true" to handle any serialization issues
    // Also check submittedAt as a backup indicator of completion
    if (participant.submitted === true || participant.submitted === 'true' || participant.submittedAt) {
      return { status: 'Completed', variant: 'default', color: 'bg-green-500' };
    }

    // Only show as abandoned if they made it at least halfway
    if (isHalfwayComplete(participant)) {
      return { status: 'Abandoned', variant: 'destructive', color: 'bg-red-500' };
    }

    // Not halfway - don't show this participant
    return { status: 'Hidden', variant: 'secondary', color: 'bg-gray-500' };
  };
  const [bucketFilter, setBucketFilter] = useState<string>('all');

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Delete dialogs
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [participantToDelete, setParticipantToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Bucket management
  const [bucketDialogOpen, setBucketDialogOpen] = useState(false);
  const [assignBucketDialogOpen, setAssignBucketDialogOpen] = useState(false);
  const [newBucketName, setNewBucketName] = useState('');
  const [newBucketColor, setNewBucketColor] = useState('#3b82f6');
  const [editingBucket, setEditingBucket] = useState<Bucket | null>(null);

  // Appearance dialog
  const [appearanceDialogOpen, setAppearanceDialogOpen] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    fetchParticipants();
    fetchBuckets();
  }, []);

  const fetchParticipants = async () => {
    try {
      setLoading(true);
      console.log('🔄 Fetching participants from admin endpoint...');
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-b0f3b375/admin/participants`;
      console.log('📡 Request URL:', url);
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch participants: ${response.status}`);
      }

      const data = await response.json();
      console.log('📥 Raw response data:', data);
      console.log('📊 Participants count:', data.participants?.length || 0);

      const validParticipants = (data.participants || []).filter((p: any) => p !== null && p !== undefined);
      console.log('✅ Valid participants:', validParticipants.length);
      console.log('📋 Sample participant:', validParticipants[0]);

      // Log submitted status for ALL participants
      const submittedParticipants = validParticipants.filter((p: any) =>
        p.submitted === true || p.submitted === 'true' || p.submittedAt
      );
      console.log(`🎯 SUBMITTED participants: ${submittedParticipants.length}`);
      submittedParticipants.forEach((p: any, idx: number) => {
        console.log(`  ${idx + 1}. ${p.participantId}:`, {
          submitted: p.submitted,
          submittedType: typeof p.submitted,
          submittedAt: p.submittedAt,
          hasDemographics: !!p.demographics,
          hasTasks: !!p.tasks,
          hasClosing: !!p.closing
        });
      });

      // Deduplicate by participant ID
      const participantMap = new Map<string, Participant>();
      validParticipants.forEach((p: any) => {
        const existingParticipant = participantMap.get(p.participantId);
        if (existingParticipant) {
          const isSubmitted = p.submitted === true || existingParticipant.submitted === true;
          participantMap.set(p.participantId, {
            ...existingParticipant,
            ...p,
            submitted: isSubmitted,
            submittedAt: p.submittedAt || existingParticipant.submittedAt,
            demographics: p.demographics || existingParticipant.demographics,
            screening: p.screening || existingParticipant.screening,
            tasks: p.tasks || existingParticipant.tasks,
            closing: p.closing || existingParticipant.closing,
            responses: p.responses || existingParticipant.responses,
          });
        } else {
          participantMap.set(p.participantId, p);
        }
      });

      const finalParticipants = Array.from(participantMap.values());
      console.log('🎯 Final participants after deduplication:', finalParticipants.length);
      console.log('📊 Submitted breakdown:', {
        completed: finalParticipants.filter(p => p.submitted === true).length,
        inProgress: finalParticipants.filter(p => p.submitted !== true).length
      });

      setParticipants(finalParticipants);
      setError('');
    } catch (err) {
      console.error('❌ Error fetching participants:', err);
      setError(`Failed to load participant data: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchBuckets = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-b0f3b375/admin/buckets`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setBuckets(data.buckets || []);
      }
    } catch (err) {
      console.error('Error fetching buckets:', err);
    }
  };

  const createTestParticipant = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-b0f3b375/check-participant`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      if (response.ok) {
        fetchParticipants();
      }
    } catch (err) {
      console.error('Error creating test participant:', err);
    }
  };

  const toggleStar = async (participantId: string, currentStarred: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-b0f3b375/admin/star-participant`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            participantId,
            starred: !currentStarred
          })
        }
      );

      if (response.ok) {
        setParticipants(prev =>
          prev.map(p => p.participantId === participantId ? { ...p, starred: !currentStarred } : p)
        );
        toast.success(currentStarred ? 'Star removed' : 'Starred participant');
      } else {
        toast.error('Failed to update star status');
      }
    } catch (err) {
      console.error('Error toggling star:', err);
      toast.error('Error updating star status');
    }
  };

  const handleDeleteClick = (participantId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setParticipantToDelete(participantId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!participantToDelete) return;

    try {
      setDeleting(true);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-b0f3b375/admin/delete-participant/${participantToDelete}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      if (response.ok) {
        setParticipants(prev => prev.filter(p => p.participantId !== participantToDelete));
        setDeleteDialogOpen(false);
        setParticipantToDelete(null);
        toast.success('Participant deleted successfully');
      } else {
        const error = await response.json();
        toast.error(`Failed to delete: ${error.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error deleting participant:', err);
      toast.error('Error deleting participant');
    } finally {
      setDeleting(false);
    }
  };

  const confirmBulkDelete = async () => {
    try {
      setDeleting(true);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-b0f3b375/admin/bulk-delete`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            participantIds: Array.from(selectedIds)
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        setParticipants(prev => prev.filter(p => !selectedIds.has(p.participantId)));
        setSelectedIds(new Set());
        setIsSelectionMode(false);
        setBulkDeleteDialogOpen(false);
        toast.success(`Deleted ${data.results.success} participants`);
      } else {
        toast.error('Failed to delete participants');
      }
    } catch (err) {
      console.error('Error bulk deleting:', err);
      toast.error('Error deleting participants');
    } finally {
      setDeleting(false);
    }
  };

  const bulkStar = async (starred: boolean) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-b0f3b375/admin/bulk-star`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            participantIds: Array.from(selectedIds),
            starred
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Update local state
        setParticipants(prev => prev.map(p =>
          selectedIds.has(p.participantId)
            ? { ...p, starred }
            : p
        ));
        setSelectedIds(new Set());
        setIsSelectionMode(false);
        toast.success(`${starred ? 'Starred' : 'Unstarred'} ${data.results.success} participants`);
      } else {
        toast.error(`Failed to ${starred ? 'star' : 'unstar'} participants`);
      }
    } catch (err) {
      console.error('Error bulk starring:', err);
      toast.error('Error updating star status');
    }
  };

  const generateAllAnalyses = async () => {
    try {
      const toastId = toast.loading('Starting AI analysis process...');

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-b0f3b375/admin/generate-all-analyses`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      const data = await response.json();

      if (response.ok) {
        toast.success(
          `✅ ${data.message}`,
          { id: toastId, duration: 8000 }
        );

        if (data.results) {
          console.log('AI Analysis Results:', data.results);
          if (data.results.generated > 0) {
            toast.success(
              `Generated ${data.results.generated} new AI analyses!`,
              { duration: 5000 }
            );
          }
          if (data.results.errors > 0) {
            toast.warning(
              `${data.results.errors} participants had errors. Check console for details.`,
              { duration: 5000 }
            );
          }
        }
      } else {
        if (data.errorType === 'quota_exceeded' || response.status === 429 || data.error?.includes('quota')) {
          toast.error(
            '⏱️ OpenAI API Quota Exceeded',
            { id: toastId, duration: 10000 }
          );
          toast.info(
            'OpenAI API quota has been exceeded. To enable AI analysis: 1) Add billing credits at https://platform.openai.com/account/billing, or 2) Update your OPENAI_API_KEY. See OPENAI_SETUP.md for details.',
            { duration: 15000 }
          );

          if (data.results && data.results.generated > 0) {
            toast.success(
              `Partial success: ${data.results.generated} analyses generated before stopping`,
              { duration: 8000 }
            );
          }
        } else if (data.errorType === 'no_api_key') {
          toast.error(
            '❌ OpenAI API key not configured',
            { id: toastId, duration: 8000 }
          );
        } else {
          toast.error(
            `Failed: ${data.error || 'Unknown error'}`,
            { id: toastId, duration: 8000 }
          );
        }

        console.error('AI Analysis error:', data);
      }
    } catch (err) {
      console.error('Error generating AI analyses:', err);
      toast.error('Error generating AI analyses');
    }
  };

  // Removed: transcribeAllRecordings function - no longer needed without audio

  const createBucket = async () => {
    if (!newBucketName.trim()) {
      toast.error('Please enter a bucket name');
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-b0f3b375/admin/buckets`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            name: newBucketName,
            color: newBucketColor
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        setBuckets(prev => [...prev, data.bucket]);
        setNewBucketName('');
        setNewBucketColor('#3b82f6');
        toast.success('Bucket created successfully');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create bucket');
      }
    } catch (err) {
      console.error('Error creating bucket:', err);
      toast.error('Error creating bucket');
    }
  };

  const updateBucket = async () => {
    if (!editingBucket || !newBucketName.trim()) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-b0f3b375/admin/buckets/${editingBucket.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            name: newBucketName,
            color: newBucketColor
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        setBuckets(prev => prev.map(b => b.id === editingBucket.id ? data.bucket : b));
        setEditingBucket(null);
        setNewBucketName('');
        setNewBucketColor('#3b82f6');
        toast.success('Bucket updated successfully');
      } else {
        toast.error('Failed to update bucket');
      }
    } catch (err) {
      console.error('Error updating bucket:', err);
      toast.error('Error updating bucket');
    }
  };

  const deleteBucket = async (bucketId: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-b0f3b375/admin/buckets/${bucketId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      if (response.ok) {
        setBuckets(prev => prev.filter(b => b.id !== bucketId));
        // Update participants to remove bucket assignment
        setParticipants(prev => prev.map(p => p.bucketId === bucketId ? { ...p, bucketId: undefined } : p));
        toast.success('Bucket deleted successfully');
      } else {
        toast.error('Failed to delete bucket');
      }
    } catch (err) {
      console.error('Error deleting bucket:', err);
      toast.error('Error deleting bucket');
    }
  };

  const assignBucket = async (bucketId: string | null) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-b0f3b375/admin/assign-bucket`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            participantIds: Array.from(selectedIds),
            bucketId
          })
        }
      );

      if (response.ok) {
        // Update local state
        setParticipants(prev => prev.map(p =>
          selectedIds.has(p.participantId)
            ? { ...p, bucketId: bucketId || undefined }
            : p
        ));
        setAssignBucketDialogOpen(false);
        setSelectedIds(new Set());
        setIsSelectionMode(false);
        toast.success(bucketId ? 'Assigned to bucket' : 'Removed from bucket');
      } else {
        toast.error('Failed to assign bucket');
      }
    } catch (err) {
      console.error('Error assigning bucket:', err);
      toast.error('Error assigning bucket');
    }
  };

  const toggleSelection = (participantId: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(participantId)) {
        newSet.delete(participantId);
      } else {
        newSet.add(participantId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredParticipants.map(p => p.participantId)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setIsSelectionMode(false);
  };

  const filteredParticipants = participants.filter(p => {
    if (!p) {
      console.log('❌ Filtering out NULL participant');
      return false;
    }

    // Only show completed participants
    const participantStatus = getParticipantStatus(p);
    if (participantStatus.status !== 'Completed') {
      return false;
    }

    // Filter by bucket
    if (bucketFilter === 'none' && p.bucketId) return false;
    if (bucketFilter !== 'all' && bucketFilter !== 'none' && p.bucketId !== bucketFilter) return false;

    console.log(`✅ Including in view: ${p.participantId} - ${participantStatus.status}`);
    return true;
  }).sort((a, b) => {
    // Sort starred participants to the top
    if (a.starred && !b.starred) return -1;
    if (!a.starred && b.starred) return 1;

    // Then sort by date
    const aTime = a.startedAt ? new Date(a.startedAt).getTime() : 0;
    const bTime = b.startedAt ? new Date(b.startedAt).getTime() : 0;
    return bTime - aTime;
  });

  // Paginate results
  const totalPages = Math.ceil(filteredParticipants.length / itemsPerPage);
  const paginatedParticipants = filteredParticipants.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [bucketFilter]);

  const runDiagnostic = async () => {
    try {
      console.log('🔍 Running database diagnostic...');
      toast.loading('Running diagnostic...', { id: 'diagnostic' });

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-b0f3b375/admin/diagnostic`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('📊 DIAGNOSTIC RESULTS:', data);
        console.log('📊 Statistics:', data.stats);
        console.log('📋 All participants:', data.participants);

        toast.success(
          `Found ${data.stats.total} total entries in database (${data.stats.submitted} completed, ${data.stats.notSubmitted} in progress). Check console for full details.`,
          { id: 'diagnostic', duration: 10000 }
        );

        // Show detailed breakdown
        toast.info(
          `Breakdown: ${data.stats.withDemographics} with demographics, ${data.stats.withTasks} with tasks, ${data.stats.declined} declined`,
          { duration: 8000 }
        );
      } else {
        toast.error('Diagnostic failed - check console', { id: 'diagnostic' });
      }
    } catch (err) {
      console.error('Error running diagnostic:', err);
      toast.error('Error running diagnostic', { id: 'diagnostic' });
    }
  };

  const exportToCSV = () => {
    const headers = ['Participant ID', 'IP Address', 'Started At', 'Submitted At', 'Status', 'Duration (min)', 'Bucket', 'Referrer', 'Age', 'Location', 'Collector Type', 'User Agent'];
    const rows = filteredParticipants.map(p => {
      const bucket = p.bucketId ? buckets.find(b => b.id === p.bucketId) : null;
      const status = getParticipantStatus(p);
      const duration = p.testSession?.totalDuration
        ? (p.testSession.totalDuration / 60).toFixed(1)
        : 'N/A';
      return [
        p.participantId,
        p.ipAddress,
        new Date(p.startedAt).toLocaleString(),
        p.submittedAt ? new Date(p.submittedAt).toLocaleString() : 'N/A',
        status.status,
        duration,
        bucket?.name || 'N/A',
        p.referrer || 'Direct',
        p.demographics?.age || 'N/A',
        p.demographics?.location || 'N/A',
        p.demographics?.collectorType || 'N/A',
        p.userAgent
      ];
    });

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `usability-test-participants-${new Date().toISOString().split('T')[0]}.csv`;
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

  const getBucketById = (bucketId: string | undefined) => {
    if (!bucketId) return null;
    return buckets.find(b => b.id === bucketId);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Toaster />

      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-600" />
              <div>
                <h1>Admin Dashboard</h1>
                <p className="text-sm text-slate-600">GameStop × PSA Usability Test Results</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Dialog open={appearanceDialogOpen} onOpenChange={setAppearanceDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Palette className="w-4 h-4" />
                    Appearance
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Customize Appearance</DialogTitle>
                    <DialogDescription>
                      Customize the look and feel of your usability testing environment
                    </DialogDescription>
                  </DialogHeader>
                  <ThemeCustomizer />
                </DialogContent>
              </Dialog>
              <Button onClick={fetchParticipants} variant="outline" size="sm">
                Refresh
              </Button>
              <Button onClick={exportToCSV} size="sm" className="gap-2">
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {participants.length === 0 && !loading && (
          <Alert className="mb-6 border-amber-300 bg-amber-50">
            <AlertDescription className="text-amber-900 text-sm">
              <strong>No participants found.</strong> Make sure participants are accessing the app without the ?admin=true parameter.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total</p>
                <p className="text-2xl mt-1">{participants.filter(p => isHalfwayComplete(p)).length}</p>
                <p className="text-xs text-slate-500 mt-1">50%+ complete</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Completed</p>
                <p className="text-2xl mt-1">{participants.filter(p => p.submitted === true || p.submitted === 'true' || p.submittedAt).length}</p>
                <p className="text-xs text-slate-500 mt-1">Submitted</p>
              </div>
              <Badge className="bg-green-500">Done</Badge>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Starred</p>
                <p className="text-2xl mt-1">{participants.filter(p => p.starred === true).length}</p>
                <p className="text-xs text-slate-500 mt-1">Flagged</p>
              </div>
              <Star className="w-8 h-8 text-yellow-500 fill-yellow-500" />
            </div>
          </Card>
        </div>

        {/* Bulk Actions Toolbar */}
        {isSelectionMode && (
          <Card className="p-4 mb-6 bg-blue-50 border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-blue-900">
                    {selectedIds.size} selected
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAll}
                  disabled={selectedIds.size === filteredParticipants.length}
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearSelection}
                >
                  Clear
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => bulkStar(true)}
                  disabled={selectedIds.size === 0}
                >
                  <Star className="w-4 h-4" />
                  Star Selected
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => bulkStar(false)}
                  disabled={selectedIds.size === 0}
                >
                  <Star className="w-4 h-4" />
                  Unstar Selected
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => setAssignBucketDialogOpen(true)}
                  disabled={selectedIds.size === 0}
                >
                  <Folder className="w-4 h-4" />
                  Assign to Bucket
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-2"
                  onClick={() => setBulkDeleteDialogOpen(true)}
                  disabled={selectedIds.size === 0}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Selected
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Filter Section */}
        <Card className="p-4 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-slate-600" />
              <span className="text-sm">Filter by:</span>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600">Status:</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    All ({participants.filter(p => getParticipantStatus(p).status !== 'Hidden').length})
                  </SelectItem>
                  <SelectItem value="completed">
                    Completed ({participants.filter(p => p.submitted === true || p.submitted === 'true' || p.submittedAt).length})
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600">Bucket:</label>
              <Select value={bucketFilter} onValueChange={setBucketFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Buckets" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Buckets</SelectItem>
                  <SelectItem value="none">No Bucket</SelectItem>
                  {buckets.map(bucket => (
                    <SelectItem key={bucket.id} value={bucket.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: bucket.color }}
                        />
                        {bucket.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setBucketDialogOpen(true)}
            >
              <FolderPlus className="w-4 h-4" />
              Manage Buckets
            </Button>

            <Button
              variant={isSelectionMode ? 'default' : 'outline'}
              size="sm"
              className="gap-2"
              onClick={() => setIsSelectionMode(!isSelectionMode)}
            >
              <CheckSquare className="w-4 h-4" />
              {isSelectionMode ? 'Exit Selection' : 'Select Multiple'}
            </Button>

            {(statusFilter !== 'all' || bucketFilter !== 'all' || showHidden) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStatusFilter('all');
                  setBucketFilter('all');
                  setShowHidden(false);
                }}
              >
                Clear Filters
              </Button>
            )}

            <div className="ml-auto flex items-center gap-3">
              <div className="text-sm text-slate-600">
                Showing <span className="font-bold text-slate-900">{filteredParticipants.filter(p => p.submitted === true || p.submitted === 'true' || p.submittedAt).length}</span> completed
              </div>
            </div>
          </div>
        </Card>

        {error && (
          <Alert className="mb-6 border-red-300 bg-red-50">
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {/* Participants List */}
        <Card className="overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <h2>All Participants</h2>
              <p className="text-sm text-slate-600">
                {isSelectionMode ? 'Select participants for bulk actions' : 'Click on any participant to view details'}
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-200">
            {paginatedParticipants.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-slate-600 mb-2">
                  {participants.length === 0 ? 'No participants yet' : 'No participants match your filters'}
                </h3>
                <p className="text-sm text-slate-500">
                  {participants.length === 0
                    ? 'Participant data will appear here once someone starts the test'
                    : 'Try adjusting your filters to see more results'
                  }
                </p>
              </div>
            ) : (
              paginatedParticipants.map((participant) => {
                const bucket = getBucketById(participant.bucketId);
                const isSelected = selectedIds.has(participant.participantId);

                return (
                  <div
                    key={participant.participantId}
                    className={`p-4 transition-colors flex items-center gap-4 ${isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'
                      } ${isSelectionMode ? 'cursor-default' : 'cursor-pointer group'}`}
                    onClick={() => {
                      if (isSelectionMode) {
                        toggleSelection(participant.participantId);
                      } else {
                        onSelectParticipant(participant.participantId);
                      }
                    }}
                  >
                    {isSelectionMode && (
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelection(participant.participantId)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}

                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <span className="font-mono">{participant.participantId}</span>
                        {!participant.submittedAt && !participant.declined && (
                          <Badge variant="outline" className="text-xs bg-amber-50 text-amber-600 border-amber-200">
                            In Progress
                          </Badge>
                        )}
                        {participant.declined && (
                          <Badge variant="outline" className="text-xs bg-red-50 text-red-600 border-red-200">
                            Declined
                          </Badge>
                        )}
                        {participant.demographics?.age === 'under-18' && (
                          <Badge variant="outline" className="text-xs bg-purple-50 text-purple-600 border-purple-200">
                            Under 18
                          </Badge>
                        )}
                        {participant.recordingBucket && (
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-600 border-blue-200">
                            Recording Bucket
                          </Badge>
                        )}
                        {participant.starred && (
                          <Badge className="bg-yellow-500 gap-1">
                            <Star className="w-3 h-3 fill-white" />
                            Starred
                          </Badge>
                        )}
                        {bucket && (
                          <Badge
                            style={{
                              backgroundColor: bucket.color,
                              color: 'white'
                            }}
                            className="gap-1"
                          >
                            <Folder className="w-3 h-3" />
                            {bucket.name}
                          </Badge>
                        )}
                        {participant.referrer && (
                          <Badge variant="outline" className="text-xs bg-slate-50 text-slate-600 border-slate-200 gap-1">
                            <Link className="w-3 h-3" />
                            {participant.referrer}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-slate-600 space-y-0.5">
                        <p>Device: {getDeviceType(participant.userAgent)}</p>
                        <p>Started: {new Date(participant.startedAt).toLocaleString()}</p>
                        {participant.submittedAt && (
                          <p>Completed: {new Date(participant.submittedAt).toLocaleString()}</p>
                        )}
                        {participant.demographics && (
                          <p className="text-xs text-slate-500 mt-1">
                            {participant.demographics.age} • {participant.demographics.location} • {participant.demographics.collectorType}
                          </p>
                        )}
                      </div>
                    </div>

                    {!isSelectionMode && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => toggleStar(participant.participantId, participant.starred || false, e)}
                          title={participant.starred ? 'Unstar participant' : 'Star participant'}
                        >
                          <Star className={`w-4 h-4 ${participant.starred ? 'fill-yellow-500 text-yellow-500' : 'text-slate-400'}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={(e) => handleDeleteClick(participant.participantId, e)}
                          title="Delete participant"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      {/* Pagination Controls */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            <p className="text-sm text-slate-600">
              Page {currentPage} of {totalPages}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Participant</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete participant <span className="font-mono font-semibold">{participantToDelete}</span>?
              <br /><br />
              This will permanently remove all their data including:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Survey responses</li>
                <li>Screen recordings</li>
                <li>Demographics information</li>
                <li>AI analysis (if exists)</li>
              </ul>
              <br />
              <strong className="text-red-600">This action cannot be undone.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? 'Deleting...' : 'Delete Participant'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} Participants</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{selectedIds.size} participants</strong>?
              <br /><br />
              This will permanently remove all their data including responses, screen recordings, and analysis.
              <br /><br />
              <strong className="text-red-600">This action cannot be undone.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? 'Deleting...' : `Delete ${selectedIds.size} Participants`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Assign Bucket Dialog */}
      <AlertDialog open={assignBucketDialogOpen} onOpenChange={setAssignBucketDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Assign to Bucket</AlertDialogTitle>
            <AlertDialogDescription>
              Choose a bucket for the {selectedIds.size} selected participants:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => assignBucket(null)}
            >
              <X className="w-4 h-4" />
              Remove from bucket
            </Button>
            {buckets.map(bucket => (
              <Button
                key={bucket.id}
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => assignBucket(bucket.id)}
              >
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: bucket.color }}
                />
                {bucket.name}
              </Button>
            ))}
            {buckets.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-4">
                No buckets available. Create one in Manage Buckets.
              </p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bucket Management Dialog */}
      <Dialog open={bucketDialogOpen} onOpenChange={setBucketDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Buckets</DialogTitle>
            <DialogDescription>
              Create and organize buckets to categorize participants
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Create/Edit Bucket Form */}
            <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
              <h3 className="text-sm font-medium">
                {editingBucket ? 'Edit Bucket' : 'Create New Bucket'}
              </h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="bucket-name">Bucket Name</Label>
                  <Input
                    id="bucket-name"
                    placeholder="e.g., Round 1, High Priority, Rejected"
                    value={newBucketName}
                    onChange={(e) => setNewBucketName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="bucket-color">Color</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="bucket-color"
                      type="color"
                      value={newBucketColor}
                      onChange={(e) => setNewBucketColor(e.target.value)}
                      className="w-20 h-10"
                    />
                    <span className="text-sm text-slate-600">{newBucketColor}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {editingBucket ? (
                    <>
                      <Button onClick={updateBucket} className="flex-1">
                        Update Bucket
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditingBucket(null);
                          setNewBucketName('');
                          setNewBucketColor('#3b82f6');
                        }}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button onClick={createBucket} className="w-full">
                      <FolderPlus className="w-4 h-4 mr-2" />
                      Create Bucket
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Existing Buckets List */}
            <div>
              <h3 className="text-sm font-medium mb-3">Existing Buckets ({buckets.length})</h3>
              {buckets.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">
                  No buckets yet. Create your first bucket above.
                </p>
              ) : (
                <div className="space-y-2">
                  {buckets.map(bucket => {
                    const participantCount = participants.filter(p => p.bucketId === bucket.id).length;

                    return (
                      <div
                        key={bucket.id}
                        className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-6 h-6 rounded-full"
                            style={{ backgroundColor: bucket.color }}
                          />
                          <div>
                            <p className="font-medium">{bucket.name}</p>
                            <p className="text-xs text-slate-500">
                              {participantCount} participant{participantCount !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingBucket(bucket);
                              setNewBucketName(bucket.name);
                              setNewBucketColor(bucket.color);
                            }}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => {
                              if (confirm(`Delete bucket "${bucket.name}"? Participants will not be deleted, only unassigned from this bucket.`)) {
                                deleteBucket(bucket.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setBucketDialogOpen(false);
              setEditingBucket(null);
              setNewBucketName('');
              setNewBucketColor('#3b82f6');
            }}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}