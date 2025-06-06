import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';
import { UgcEmailService } from './ugcEmailService';

export interface ThreadingStrategy {
  // Core threading principles
  singlePrimaryThread: boolean;
  autoCloseOnPhaseTransition: boolean;
  contextPreservation: boolean;
  smartReactivation: boolean;
  
  // User experience settings
  maxActiveThreadsPerCreator: number;
  autoArchiveAfterDays: number;
  requireCloseReason: boolean;
}

export interface ConversationPhase {
  id: string;
  name: string;
  description: string;
  autoCloseOther: boolean;
  keywords: string[];
  nextPhases: string[];
}

export interface ThreadContext {
  creatorId: string;
  brandId: string;
  currentPhase: string;
  pipelineStage: string;
  scriptId?: string;
  lastActivity: Date;
  messageCount: number;
  hasUnreadMessages: boolean;
}

export class UgcEmailThreadingService {
  private emailService: UgcEmailService;
  
  // Default threading strategy optimized for UGC workflows
  private defaultStrategy: ThreadingStrategy = {
    singlePrimaryThread: true,
    autoCloseOnPhaseTransition: true,
    contextPreservation: true,
    smartReactivation: true,
    maxActiveThreadsPerCreator: 2, // Primary + one specialized thread
    autoArchiveAfterDays: 30,
    requireCloseReason: true
  };

  // UGC Pipeline conversation phases
  private conversationPhases: ConversationPhase[] = [
    {
      id: 'cold_outreach',
      name: 'Initial Outreach',
      description: 'First contact with creator',
      autoCloseOther: false,
      keywords: ['collab', 'interested', 'rates'],
      nextPhases: ['negotiation', 'onboarding']
    },
    {
      id: 'negotiation',
      name: 'Rate Negotiation',
      description: 'Discussing rates and terms',
      autoCloseOther: false,
      keywords: ['rate', 'price', 'budget', 'payment'],
      nextPhases: ['onboarding', 'rejected']
    },
    {
      id: 'onboarding',
      name: 'Creator Onboarding',
      description: 'Getting creator setup and ready',
      autoCloseOther: true,
      keywords: ['shipping', 'address', 'contract'],
      nextPhases: ['script_assignment', 'production']
    },
    {
      id: 'script_assignment',
      name: 'Script Assignment',
      description: 'Sending and managing scripts',
      autoCloseOther: true,
      keywords: ['script', 'approve', 'reject', 'assignment'],
      nextPhases: ['production', 'revision']
    },
    {
      id: 'production',
      name: 'Content Production',
      description: 'Creator working on content',
      autoCloseOther: false,
      keywords: ['filming', 'content', 'progress', 'delivery'],
      nextPhases: ['review', 'completed']
    },
    {
      id: 'review',
      name: 'Content Review',
      description: 'Reviewing submitted content',
      autoCloseOther: false,
      keywords: ['review', 'feedback', 'revision', 'approval'],
      nextPhases: ['revision', 'completed', 'payment']
    },
    {
      id: 'payment',
      name: 'Payment Processing',
      description: 'Handling payments and finalization',
      autoCloseOther: false,
      keywords: ['payment', 'invoice', 'final'],
      nextPhases: ['completed']
    },
    {
      id: 'completed',
      name: 'Completed',
      description: 'Project finished successfully',
      autoCloseOther: true,
      keywords: ['complete', 'finished', 'thank you'],
      nextPhases: []
    },
    {
      id: 'rejected',
      name: 'Rejected/Declined',  
      description: 'Creator declined or project cancelled',
      autoCloseOther: true,
      keywords: ['decline', 'reject', 'not interested'],
      nextPhases: []
    }
  ];

  constructor() {
    this.emailService = new UgcEmailService();
  }

  /**
   * Get or create the appropriate thread for a creator-brand communication
   * This is the main entry point that enforces threading strategy
   */
  async getOrCreateConversationThread(
    creatorId: string,
    brandId: string,
    context: {
      phase?: string;
      subject?: string;
      emailContent?: string;
      scriptId?: string;
      forceNewThread?: boolean;
    }
  ): Promise<{
    threadId: string;
    wasCreated: boolean;
    closedOldThreads: string[];
    phase: string;
  }> {
    const supabase = await createServerAdminClient();
    
    // Determine conversation phase from context
    const detectedPhase = this.detectConversationPhase(context);
    const currentPhase = context.phase || detectedPhase;
    
    // Get current thread context
    const threadContext = await this.getThreadContext(creatorId, brandId);
    
    // Check if we need to create a new thread based on phase transition
    const shouldCreateNewThread = this.shouldCreateNewThread(
      threadContext,
      currentPhase,
      context.forceNewThread || false
    );
    
    let threadId: string;
    let wasCreated = false;
    let closedOldThreads: string[] = [];
    
    if (shouldCreateNewThread) {
      // Close existing threads if phase requires it
      const phaseConfig = this.conversationPhases.find(p => p.id === currentPhase);
      if (phaseConfig?.autoCloseOther) {
        closedOldThreads = await this.closeActiveThreads(
          creatorId, 
          brandId, 
          `Phase transition to ${phaseConfig.name}`
        );
      }
      
      // Create new thread directly
      const { data: newThread, error } = await supabase
        .from('ugc_email_threads')
        .insert({
          creator_id: creatorId,
          brand_id: brandId,
          thread_subject: this.generateSmartSubject(currentPhase, context),
          status: 'active'
        })
        .select('id')
        .single();
        
      if (error) throw error;
      threadId = newThread.id;
      wasCreated = true;
      
    } else {
      // Use existing active thread
      const { data: existingThreads } = await supabase
        .from('ugc_email_threads')
        .select('id')
        .eq('creator_id', creatorId)
        .eq('brand_id', brandId)
        .eq('status', 'active')
        .limit(1);
        
      if (existingThreads && existingThreads.length > 0) {
        threadId = existingThreads[0].id;
      } else {
        // Fallback: create new thread if none exists
        const result = await this.getOrCreateConversationThread(
          creatorId, 
          brandId, 
          { ...context, forceNewThread: true }
        );
        return result;
      }
    }
    
    return {
      threadId,
      wasCreated,
      closedOldThreads,
      phase: currentPhase
    };
  }

  /**
   * Smart thread management with user-friendly operations
   */
  async closeThread(
    threadId: string, 
    userId: string, 
    reason: string,
    createNewPrimary = true
  ): Promise<{
    success: boolean;
    newPrimaryThreadId?: string;
    error?: string;
  }> {
    try {
      const supabase = await createServerAdminClient();
      
      // Get thread info first
      const { data: threads, error: threadError } = await supabase
        .from('ugc_email_threads')
        .select('*')
        .eq('id', threadId)
        .limit(1);
        
      if (threadError || !threads || threads.length === 0) {
        return { success: false, error: 'Thread not found' };
      }
      
      const thread = threads[0];
      
      // Close the thread directly
      const { error: closeError } = await supabase
        .from('ugc_email_threads')
        .update({
          status: 'completed',
          closed_at: new Date().toISOString(),
          close_reason: reason
        })
        .eq('id', threadId);
        
      if (closeError) throw closeError;
      
      let newPrimaryThreadId: string | undefined;
      
      // Create new primary thread if requested
      if (createNewPrimary) {
        const result = await this.getOrCreateConversationThread(
          thread.creator_id,
          thread.brand_id,
          {
            phase: 'continued_conversation',
            subject: 'Continued Communication',
            forceNewThread: true
          }
        );
        newPrimaryThreadId = result.threadId;
      }
      
      return {
        success: true,
        newPrimaryThreadId
      };
    } catch (error) {
      console.error('Error closing thread:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Archive old threads automatically
   */
  async archiveOldThreads(
    brandId: string,
    daysOld = 30
  ): Promise<{
    archivedCount: number;
    archivedThreadIds: string[];
  }> {
    const supabase = await createServerAdminClient();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const { data: oldThreads, error } = await supabase
      .from('ugc_email_threads')
      .select('id')
      .eq('brand_id', brandId)
      .eq('status', 'active')
      .lt('updated_at', cutoffDate.toISOString());
      
    if (error || !oldThreads) return { archivedCount: 0, archivedThreadIds: [] };
    
    const threadIds = oldThreads.map(t => t.id);
    
    if (threadIds.length > 0) {
      await supabase
        .from('ugc_email_threads')
        .update({
          status: 'archived',
          closed_at: new Date().toISOString(),
          close_reason: `Auto-archived after ${daysOld} days of inactivity`
        })
        .in('id', threadIds);
    }
    
    return {
      archivedCount: threadIds.length,
      archivedThreadIds: threadIds
    };
  }

  /**
   * Get comprehensive thread analytics for brand management
   */
  async getThreadAnalytics(brandId: string): Promise<{
    totalActiveThreads: number;
    threadsByPhase: Record<string, number>;
    averageResponseTime: number;
    creatorsWithMultipleThreads: number;
    recommendedCleanupActions: Array<{
      action: string;
      threadId: string;
      reason: string;
    }>;
  }> {
    const supabase = await createServerAdminClient();
    
    // Get all active threads with basic info
    const { data: threads, error } = await supabase
      .from('ugc_email_threads')
      .select('id, creator_id, updated_at')
      .eq('brand_id', brandId)
      .eq('status', 'active');
      
    if (error || !threads) {
      return {
        totalActiveThreads: 0,
        threadsByPhase: {},
        averageResponseTime: 0,
        creatorsWithMultipleThreads: 0,
        recommendedCleanupActions: []
      };
    }
    
    // Analyze threads
    const threadsByPhase: Record<string, number> = { 'unknown': threads.length };
    const creatorThreadCounts: Record<string, number> = {};
    const cleanupActions: Array<{action: string; threadId: string; reason: string}> = [];
    
    for (const thread of threads) {
      creatorThreadCounts[thread.creator_id] = (creatorThreadCounts[thread.creator_id] || 0) + 1;
      
      // Identify cleanup opportunities
      const daysSinceUpdate = Math.floor(
        (Date.now() - new Date(thread.updated_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceUpdate > 30) {
        cleanupActions.push({
          action: 'archive',
          threadId: thread.id,
          reason: `Inactive for ${daysSinceUpdate} days`
        });
      }
      
      if (creatorThreadCounts[thread.creator_id] > 2) {
        cleanupActions.push({
          action: 'consolidate',
          threadId: thread.id,
          reason: 'Multiple threads for same creator - consider consolidating'
        });
      }
    }
    
    const creatorsWithMultiple = Object.values(creatorThreadCounts)
      .filter(count => count > 1).length;
    
    return {
      totalActiveThreads: threads.length,
      threadsByPhase,
      averageResponseTime: 0, // Could calculate from message timing
      creatorsWithMultipleThreads: creatorsWithMultiple,
      recommendedCleanupActions: cleanupActions
    };
  }

  // Private helper methods
  private detectConversationPhase(context: Record<string, unknown>): string {
    const content = String(context.emailContent || context.subject || '').toLowerCase();
    
    for (const phase of this.conversationPhases) {
      for (const keyword of phase.keywords) {
        if (content.includes(keyword.toLowerCase())) {
          return phase.id;
        }
      }
    }
    
    return 'general_communication';
  }

  private shouldCreateNewThread(
    currentContext: ThreadContext | null,
    newPhase: string,
    forceNew: boolean
  ): boolean {
    if (forceNew) return true;
    if (!currentContext) return true;
    
    const phaseConfig = this.conversationPhases.find(p => p.id === newPhase);
    if (phaseConfig?.autoCloseOther) return true;
    
    // Create new thread if switching to incompatible phase
    const currentPhaseConfig = this.conversationPhases.find(p => p.id === currentContext.currentPhase);
    if (currentPhaseConfig && !currentPhaseConfig.nextPhases.includes(newPhase)) {
      return true;
    }
    
    return false;
  }

  private async getThreadContext(creatorId: string, brandId: string): Promise<ThreadContext | null> {
    const supabase = await createServerAdminClient();
    
    const { data: threads, error } = await supabase
      .from('ugc_email_threads')
      .select('id, updated_at, creator_id, brand_id')
      .eq('creator_id', creatorId)
      .eq('brand_id', brandId)
      .eq('status', 'active')
      .limit(1);
      
    if (error || !threads || threads.length === 0) return null;
    
    const thread = threads[0];
    
    return {
      creatorId,
      brandId,
      currentPhase: 'unknown',
      pipelineStage: 'unknown',
      lastActivity: new Date(thread.updated_at),
      messageCount: 0,
      hasUnreadMessages: false
    };
  }

  private async closeActiveThreads(
    creatorId: string, 
    brandId: string, 
    reason: string
  ): Promise<string[]> {
    const supabase = await createServerAdminClient();
    
    const { data: activeThreads, error } = await supabase
      .from('ugc_email_threads')
      .select('id')
      .eq('creator_id', creatorId)
      .eq('brand_id', brandId)
      .eq('status', 'active');
      
    if (error || !activeThreads) return [];
    
    const threadIds = activeThreads.map(t => t.id);
    
    if (threadIds.length > 0) {
      await supabase
        .from('ugc_email_threads')
        .update({
          status: 'completed',
          closed_at: new Date().toISOString(),
          close_reason: reason
        })
        .in('id', threadIds);
    }
    
    return threadIds;
  }

  private generateSmartSubject(phase: string, context: Record<string, unknown>): string {
    const phaseConfig = this.conversationPhases.find(p => p.id === phase);
    const phaseName = phaseConfig?.name || 'Communication';
    
    if (context.scriptId) {
      return `${phaseName} - Script Assignment`;
    }
    
    if (context.subject && typeof context.subject === 'string' && !context.subject.includes('Re:')) {
      return context.subject;
    }
    
    return `${phaseName} Thread`;
  }
} 