"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useGlobal } from '@/lib/context/GlobalContext';
import { useRouter } from 'next/navigation';
import { getBriefBatchById, getBrandById, getBriefConcepts, createBriefConcept, updateBriefConcept, deleteBriefConcept, deleteBriefBatch, uploadMedia, shareBriefBatch, shareBriefConcept } from '@/lib/services/powerbriefService';
import { Brand, BriefBatch, BriefConcept, Scene, Hook, AiBriefingRequest, ShareSettings } from '@/lib/types/powerbrief';
import { 
    Sparkles, Plus, X, FileUp, Trash2, Share2, MoveUp, MoveDown, 
    Loader2, Check, Pencil, Bug, Film, FileImage, ArrowLeft, Copy, LinkIcon, Mail
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import MarkdownTextarea from '@/components/ui/markdown-textarea';
import ConceptVoiceGenerator from '@/components/ConceptVoiceGenerator';

// Helper to unwrap params safely
type ParamsType = { brandId: string, batchId: string };

export default function ConceptBriefingPage({ params }: { params: ParamsType }) {
    const { user } = useGlobal();
    const router = useRouter();
    const [loading, setLoading] = useState<boolean>(true);
    const [brand, setBrand] = useState<Brand | null>(null);
    const [batch, setBatch] = useState<BriefBatch | null>(null);
    const [concepts, setConcepts] = useState<BriefConcept[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [showDeleteBatchDialog, setShowDeleteBatchDialog] = useState<boolean>(false);
    const [deletingBatch, setDeletingBatch] = useState<boolean>(false);
    const [activeConceptId, setActiveConceptId] = useState<string | null>(null);
    const [savingConceptId, setSavingConceptId] = useState<string | null>(null);
    const [generatingAI, setGeneratingAI] = useState<boolean>(false);
    const [generatingConceptIds, setGeneratingConceptIds] = useState<Record<string, boolean>>({});
    const fileInputRef = useRef<HTMLInputElement>(null);
    const multipleFileInputRef = useRef<HTMLInputElement>(null);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [localPrompts, setLocalPrompts] = useState<Record<string, string>>({});
    const [localCaptionHooks, setLocalCaptionHooks] = useState<Record<string, string>>({});
    const [localSpokenHooks, setLocalSpokenHooks] = useState<Record<string, string>>({});
    const [localCtaScript, setLocalCtaScript] = useState<Record<string, string>>({});
    const [localCtaTextOverlay, setLocalCtaTextOverlay] = useState<Record<string, string>>({});
    const [localScenes, setLocalScenes] = useState<Record<string, Scene[]>>({});
    const [localDescriptions, setLocalDescriptions] = useState<Record<string, string>>({});
    const [localVideoInstructions, setLocalVideoInstructions] = useState<Record<string, string>>({});
    const [localDesignerInstructions, setLocalDesignerInstructions] = useState<Record<string, string>>({});
    const [showPromptDebugDialog, setShowPromptDebugDialog] = useState<boolean>(false);
    const [debugPrompt, setDebugPrompt] = useState<string>('');
    const [copied, setCopied] = useState<boolean>(false);
    const [startingConceptNumber, setStartingConceptNumber] = useState<number>(1);
    const [showBatchSettingsDialog, setShowBatchSettingsDialog] = useState<boolean>(false);
    const [localClickupLinks, setLocalClickupLinks] = useState<Record<string, string>>({});
    const [editingClickupLink, setEditingClickupLink] = useState<string | null>(null);
    const [localStrategists, setLocalStrategists] = useState<Record<string, string>>({});
    const [localVideoEditors, setLocalVideoEditors] = useState<Record<string, string>>({});
    
    // Sharing related state
    const [showShareBatchDialog, setShowShareBatchDialog] = useState<boolean>(false);
    const [showShareConceptDialog, setShowShareConceptDialog] = useState<boolean>(false);
    const [sharingConceptId, setSharingConceptId] = useState<string | null>(null);
    const [shareLink, setShareLink] = useState<string>('');
    const [shareEmail, setShareEmail] = useState<string>('');
    const [shareIsEditable, setShareIsEditable] = useState<boolean>(false);
    const [sharingInProgress, setSharingInProgress] = useState<boolean>(false);
    const [shareSuccess, setShareSuccess] = useState<boolean>(false);
    const [localMediaTypes, setLocalMediaTypes] = useState<Record<string, 'video' | 'image'>>({});
    const [localHookTypes, setLocalHookTypes] = useState<Record<string, 'caption' | 'verbal' | 'both'>>({});
    const [localHookCounts, setLocalHookCounts] = useState<Record<string, number>>({});
    
    // Individual hooks state
    const [localCaptionHooksList, setLocalCaptionHooksList] = useState<Record<string, Hook[]>>({});
    const [localSpokenHooksList, setLocalSpokenHooksList] = useState<Record<string, Hook[]>>({});

    // Extract params using React.use()
    const unwrappedParams = params instanceof Promise ? React.use(params) : params;
    const { brandId, batchId } = unwrappedParams;

    // Fetch data
    useEffect(() => {
        const fetchData = async () => {
            if (!user?.id || !brandId || !batchId) return;
            
            try {
                setLoading(true);
                const [brandData, batchData, conceptsData] = await Promise.all([
                    getBrandById(brandId),
                    getBriefBatchById(batchId),
                    getBriefConcepts(batchId)
                ]);
                
                if (!brandData || !batchData) {
                    router.push('/app/powerbrief');
                    return;
                }
                
                setBrand(brandData);
                setBatch(batchData);
                setConcepts(conceptsData);

                // Initialize local states for each concept based on fetched data
                const initialLocalPrompts: Record<string, string> = {};
                const initialLocalCaptionHooks: Record<string, string> = {};
                const initialLocalSpokenHooks: Record<string, string> = {};
                const initialLocalCtaScript: Record<string, string> = {};
                const initialLocalCtaTextOverlay: Record<string, string> = {};
                const initialLocalScenes: Record<string, Scene[]> = {};
                const initialLocalDescriptions: Record<string, string> = {};
                const initialLocalVideoInstructions: Record<string, string> = {};
                const initialLocalDesignerInstructions: Record<string, string> = {};
                const initialLocalClickupLinks: Record<string, string> = {};
                const initialLocalStrategists: Record<string, string> = {};
                const initialLocalVideoEditors: Record<string, string> = {};
                const initialLocalMediaTypes: Record<string, 'video' | 'image'> = {};
                const initialLocalHookTypes: Record<string, 'caption' | 'verbal' | 'both'> = {};
                const initialLocalHookCounts: Record<string, number> = {};
                const initialLocalCaptionHooksList: Record<string, Hook[]> = {};
                const initialLocalSpokenHooksList: Record<string, Hook[]> = {};

                conceptsData.forEach(concept => {
                    initialLocalPrompts[concept.id] = concept.ai_custom_prompt || '';
                    initialLocalCaptionHooks[concept.id] = concept.caption_hook_options || '';
                    initialLocalSpokenHooks[concept.id] = concept.spoken_hook_options || '';
                    initialLocalCtaScript[concept.id] = concept.cta_script || '';
                    initialLocalCtaTextOverlay[concept.id] = concept.cta_text_overlay || '';
                    initialLocalScenes[concept.id] = concept.body_content_structured || [];
                    initialLocalDescriptions[concept.id] = concept.description || '';
                    initialLocalVideoInstructions[concept.id] = concept.videoInstructions || '';
                    initialLocalDesignerInstructions[concept.id] = concept.designerInstructions || '';
                    initialLocalClickupLinks[concept.id] = concept.clickup_id || ''; // Note: uses clickup_id from concept
                    initialLocalStrategists[concept.id] = concept.strategist || '';
                    initialLocalVideoEditors[concept.id] = concept.video_editor || '';
                    initialLocalMediaTypes[concept.id] = concept.media_type === 'image' ? 'image' : 'video'; // Corrected line
                    initialLocalHookTypes[concept.id] = concept.hook_type || 'both';
                    initialLocalHookCounts[concept.id] = concept.hook_count || 5;
                    
                    // Parse existing hooks from strings into individual hook objects
                    initialLocalCaptionHooksList[concept.id] = parseHooksFromString(concept.caption_hook_options || '');
                    initialLocalSpokenHooksList[concept.id] = parseHooksFromString(concept.spoken_hook_options || '');
                });

                setLocalPrompts(initialLocalPrompts);
                setLocalCaptionHooks(initialLocalCaptionHooks);
                setLocalSpokenHooks(initialLocalSpokenHooks);
                setLocalCtaScript(initialLocalCtaScript);
                setLocalCtaTextOverlay(initialLocalCtaTextOverlay);
                setLocalScenes(initialLocalScenes);
                setLocalDescriptions(initialLocalDescriptions);
                setLocalVideoInstructions(initialLocalVideoInstructions);
                setLocalDesignerInstructions(initialLocalDesignerInstructions);
                setLocalClickupLinks(initialLocalClickupLinks);
                setLocalStrategists(initialLocalStrategists);
                setLocalVideoEditors(initialLocalVideoEditors);
                setLocalMediaTypes(initialLocalMediaTypes);
                setLocalHookTypes(initialLocalHookTypes);
                setLocalHookCounts(initialLocalHookCounts);
                setLocalCaptionHooksList(initialLocalCaptionHooksList);
                setLocalSpokenHooksList(initialLocalSpokenHooksList);
                
                if (conceptsData.length > 0 && !activeConceptId) {
                    setActiveConceptId(conceptsData[0].id);
                }
                
                setError(null);
            } catch (err) {
                console.error('Error fetching data:', err);
                setError('Failed to load data. Please try again.');
            } finally {
                setLoading(false);
            }
        };
        
        fetchData();
    }, [user?.id, brandId, batchId, router, activeConceptId]);

    // Delete batch
    const handleDeleteBatch = async () => {
        if (!batch) return;
        
        try {
            setDeletingBatch(true);
            await deleteBriefBatch(batch.id);
            router.push(`/app/powerbrief/${brandId}`);
        } catch (err) {
            console.error('Error deleting batch:', err);
            setError('Failed to delete batch. Please try again.');
            setDeletingBatch(false);
            setShowDeleteBatchDialog(false);
        }
    };

    // Update concept title with new numbering
    const updateConceptNumbering = (startNumber: number) => {
        if (!concepts.length) return;
        
        const updatedConcepts = [...concepts].map((concept, index) => {
            return {
                ...concept,
                concept_title: `Concept ${startNumber + index}`
            };
        });
        
        // Update all concepts with new titles
        const updatePromises = updatedConcepts.map(concept => updateBriefConcept(concept));
        Promise.all(updatePromises)
            .then(updatedConceptsList => {
                setConcepts(updatedConceptsList);
                setStartingConceptNumber(startNumber);
            })
            .catch(err => {
                console.error('Failed to update concept numbering:', err);
                setError('Failed to update concept numbering. Please try again.');
            });
    };

    // Create new concept
    const handleCreateConcept = async () => {
        if (!user?.id || !batch || !brand) return;
        
        try {
            // Use the current starting number plus the existing concepts length
            const conceptNumber = startingConceptNumber + concepts.length;
            
            const newConcept = await createBriefConcept({
                brief_batch_id: batch.id,
                user_id: user.id,
                concept_title: `Concept ${conceptNumber}`,
                body_content_structured: [],
                order_in_batch: concepts.length,
                clickup_id: null,
                clickup_link: null,
                strategist: null,
                video_editor: null,
                status: null,
                media_url: null,
                media_type: null,
                ai_custom_prompt: null,
                caption_hook_options: null,
                spoken_hook_options: null,
                cta_script: null,
                cta_text_overlay: null,
                description: null,
                videoInstructions: brand.default_video_instructions || '',
                designerInstructions: brand.default_designer_instructions || ''
            });
            
            setConcepts(prev => [...prev, newConcept]);
            
            // Initialize local state for the new concept
            setLocalVideoInstructions(prev => ({
                ...prev,
                [newConcept.id]: newConcept.videoInstructions || ''
            }));
            
            setLocalDesignerInstructions(prev => ({
                ...prev,
                [newConcept.id]: newConcept.designerInstructions || ''
            }));
            
            // Only set the new concept as active if there's no active concept already
            if (!activeConceptId) {
                setActiveConceptId(newConcept.id);
            }
        } catch (err) {
            console.error('Failed to create concept:', err);
            setError('Failed to create concept. Please try again.');
        } finally {
            // Removed setSaving(false) as 'saving' state is no longer used
        }
    };

    // Delete concept
    const handleDeleteConcept = async (conceptId: string) => {
        try {
            setSavingConceptId(conceptId);
            await deleteBriefConcept(conceptId);
            
            setConcepts(prev => prev.filter(c => c.id !== conceptId));
            
            if (activeConceptId === conceptId) {
                const remaining = concepts.filter(c => c.id !== conceptId);
                setActiveConceptId(remaining.length > 0 ? remaining[0].id : null);
            }
        } catch (err) {
            console.error('Failed to delete concept:', err);
            setError('Failed to delete concept. Please try again.');
        } finally {
            setSavingConceptId(null);
        }
    };

    // Update concept
    const handleUpdateConcept = async (concept: BriefConcept) => {
        try {
            // Synchronize review_status based on status
            if (concept.status === 'APPROVED' && concept.review_status !== 'approved') {
                concept.review_status = 'approved';
            } else if (concept.status === 'REVISIONS REQUESTED' && concept.review_status !== 'needs_revisions') {
                concept.review_status = 'needs_revisions';
            } else if (concept.status === 'READY FOR REVIEW' && concept.review_status !== 'ready_for_review') {
                concept.review_status = 'ready_for_review';
            }
            
            const updatedConcept = await updateBriefConcept(concept);
            setConcepts(prev => 
                prev.map(c => c.id === updatedConcept.id ? updatedConcept : c)
            );
            return updatedConcept;
        } catch (err) {
            console.error('Error updating concept:', err);
            throw err;
        }
    };

    // Upload media for a concept
    const handleUploadMedia = async (file: File, conceptId: string) => {
        if (!user?.id) return;
        
        try {
            setSavingConceptId(conceptId);
            
            const mediaUrl = await uploadMedia(file, user.id);
            const concept = concepts.find(c => c.id === conceptId);
            const mediaType = file.type.startsWith('video/') ? 'video' : 'image';
            
            if (concept) {
                const updatedConcept = await updateBriefConcept({
                    ...concept,
                    id: conceptId,
                    media_url: mediaUrl,
                    media_type: mediaType
                });
                
                setConcepts(prev => 
                    prev.map(c => c.id === updatedConcept.id ? updatedConcept : c)
                );
                
                // Also update local media type
                setLocalMediaTypes(prev => ({
                    ...prev,
                    [conceptId]: mediaType
                }));
            }
        } catch (err) {
            console.error('Failed to upload media:', err);
            setError('Failed to upload media. Please try again.');
        } finally {
            setSavingConceptId(null);
        }
    };

    // Bulk upload media (EZ UPLOAD)
    const handleBulkUploadMedia = async (files: FileList) => {
        if (!user?.id || !batch) return;
        
        try {
            setGeneratingAI(true);
            setError(null);
            
            const fileCount = files.length;
            console.log(`EZ UPLOAD: Starting to process ${fileCount} files`);
            
            // Convert FileList to array to ensure we can iterate properly
            const filesArray = Array.from(files);
            console.log(`EZ UPLOAD: Converted FileList to array with ${filesArray.length} items`);
            
            // Keep track of all successfully created concepts
            const newConcepts: BriefConcept[] = [];
            
            // Process each file one by one
            for (let i = 0; i < filesArray.length; i++) {
                const file = filesArray[i];
                console.log(`EZ UPLOAD: Processing file ${i+1}/${filesArray.length}: "${file.name}" (${file.type})`);
                
                try {
                    // Step 1: Upload the media file
                    console.log(`EZ UPLOAD: Uploading file ${i+1} to storage...`);
                    const mediaUrl = await uploadMedia(file, user.id);
                    console.log(`EZ UPLOAD: File ${i+1} uploaded successfully: ${mediaUrl}`);
                    
                    // Step 2: Create a new concept with the media URL
                    console.log(`EZ UPLOAD: Creating new concept for file ${i+1}...`);
                    const conceptNumber = startingConceptNumber + concepts.length + newConcepts.length;
                    console.log(`EZ UPLOAD: Using concept number ${conceptNumber}`);
                    
                    const newConcept = await createBriefConcept({
                        brief_batch_id: batch.id,
                        user_id: user.id,
                        concept_title: `Concept ${conceptNumber}`,
                        media_url: mediaUrl,
                        media_type: file.type.startsWith('video/') ? 'video' : 'image',
                        body_content_structured: [],
                        order_in_batch: concepts.length + newConcepts.length,
                        clickup_id: null,
                        clickup_link: null,
                        strategist: null,
                        video_editor: null,
                        status: null,
                        ai_custom_prompt: null,
                        caption_hook_options: null,
                        spoken_hook_options: null,
                        cta_script: null,
                        cta_text_overlay: null,
                        description: null,
                        videoInstructions: brand?.default_video_instructions || '',
                        designerInstructions: brand?.default_designer_instructions || ''
                    });
                    
                    console.log(`EZ UPLOAD: Created new concept for file ${i+1} with ID: ${newConcept.id}`);
                    
                    // Step 3: Add the new concept to our tracking array
                    newConcepts.push(newConcept);
                    console.log(`EZ UPLOAD: Added concept to newConcepts array (now contains ${newConcepts.length} concepts)`);
                    
                    // Force a small delay to ensure processing completes
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    // After adding the concept to newConcepts array
                    // Update local media type state to match
                    setLocalMediaTypes(prev => ({
                        ...prev,
                        [newConcept.id]: file.type.startsWith('video/') ? 'video' : 'image'
                    }));
                    
                } catch (fileErr) {
                    console.error(`EZ UPLOAD: Error processing file ${i+1}/${filesArray.length}:`, fileErr);
                    setError(prev => {
                        const newError = `Failed to process file ${i+1} (${file.name}): ${fileErr instanceof Error ? fileErr.message : 'Unknown error'}`;
                        return prev ? `${prev}\n${newError}` : newError;
                    });
                }
                
                // Force a small delay between files
                console.log(`EZ UPLOAD: Completed processing file ${i+1}/${filesArray.length}, waiting before next file...`);
                await new Promise(resolve => setTimeout(resolve, 1500));
            }
            
            // After all files are processed, update the concepts state once with all new concepts
            console.log(`EZ UPLOAD: All files processed. Created ${newConcepts.length} new concepts. Updating state...`);
            
            if (newConcepts.length > 0) {
                // Update all concepts at once to avoid state race conditions
                setConcepts(prevConcepts => {
                    const allConcepts = [...prevConcepts, ...newConcepts];
                    console.log(`EZ UPLOAD: State update - combining ${prevConcepts.length} existing concepts with ${newConcepts.length} new concepts = ${allConcepts.length} total`);
                    return allConcepts;
                });
                
                // Set the active concept ID if needed
                if (!activeConceptId) {
                    console.log(`EZ UPLOAD: Setting active concept ID to ${newConcepts[0].id}`);
                    setActiveConceptId(newConcepts[0].id);
                }
            }
            
            // Final status message
            if (newConcepts.length === 0) {
                console.error('EZ UPLOAD: Failed to upload any files');
                setError('Failed to upload any files. Please try again.');
            } else if (newConcepts.length < filesArray.length) {
                console.warn(`EZ UPLOAD: Partial success - uploaded ${newConcepts.length}/${filesArray.length} files`);
                setError(`Uploaded ${newConcepts.length}/${filesArray.length} files. Some files could not be uploaded.`);
            } else {
                console.log(`EZ UPLOAD: Success - processed all ${filesArray.length} files`);
            }
            
        } catch (err) {
            console.error('EZ UPLOAD: Fatal error in bulk upload:', err);
            setError(`Failed to upload media: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setGeneratingAI(false);
            console.log(`EZ UPLOAD: Process completed.`);
        }
    };

    // Generate AI brief for a concept
    const handleGenerateAI = async (conceptId: string) => {
        if (!brand || !user?.id) return;
        
        const concept = concepts.find(c => c.id === conceptId);
        if (!concept) return;
        
        try {
            // Save the current prompt first if there's unsaved content in the input field
            const currentPromptValue = localPrompts[conceptId] || '';
            if (currentPromptValue !== concept.ai_custom_prompt) {
                // Clear any pending debounced updates
                if (saveTimeoutRef.current) {
                    clearTimeout(saveTimeoutRef.current);
                    saveTimeoutRef.current = null;
                }
                
                // Update the concept with the current prompt immediately
                const updatedConceptWithPrompt = {
                    ...concept,
                    ai_custom_prompt: currentPromptValue
                };
                
                // Save the updated prompt first
                await updateBriefConcept(updatedConceptWithPrompt);
                
                // Update the local concepts state to reflect the saved prompt
                setConcepts(prev => 
                    prev.map(c => c.id === conceptId ? { ...c, ai_custom_prompt: currentPromptValue } : c)
                );
            }
            
            // Set this specific concept as generating
            setGeneratingConceptIds(prev => ({
                ...prev,
                [conceptId]: true
            }));
            
            // Now use the updated concept with the saved prompt
            const conceptWithSavedPrompt = concepts.find(c => c.id === conceptId) || concept;
            
            // Get the current hook type and count from local state first, falling back to the concept values
            const hookType = localHookTypes[conceptId] || conceptWithSavedPrompt.hook_type || 'both';
            const hookCount = localHookCounts[conceptId] || conceptWithSavedPrompt.hook_count || 5;
            
            // First, save the hook type and count to the database to ensure consistency
            const updatedConceptWithHooks = {
                ...conceptWithSavedPrompt,
                hook_type: hookType,
                hook_count: hookCount
            };
            
            // Save the hook settings
            await updateBriefConcept(updatedConceptWithHooks);
            
            // Update the local concept state
            setConcepts(prev => 
                prev.map(c => c.id === conceptId ? updatedConceptWithHooks : c)
            );
            
            const request: AiBriefingRequest = {
                brandContext: {
                    brand_info_data: brand.brand_info_data,
                    target_audience_data: brand.target_audience_data,
                    competition_data: brand.competition_data
                },
                conceptSpecificPrompt: currentPromptValue, // Use the current prompt value directly
                conceptCurrentData: {
                    caption_hook_options: conceptWithSavedPrompt.caption_hook_options || '',
                    body_content_structured: conceptWithSavedPrompt.body_content_structured || [],
                    cta_script: conceptWithSavedPrompt.cta_script || '',
                    cta_text_overlay: conceptWithSavedPrompt.cta_text_overlay || ''
                },
                media: {
                    url: conceptWithSavedPrompt.media_url || '',
                    type: conceptWithSavedPrompt.media_type || ''
                },
                desiredOutputFields: [
                    'caption_hook_options', 
                    'spoken_hook_options',
                    'body_content_structured_scenes', 
                    'cta_script', 
                    'cta_text_overlay'
                ],
                hookOptions: {
                    type: hookType,
                    count: hookCount
                }
            };
            
            console.log('Sending AI generation request with hook options:', request.hookOptions);
            
            const response = await fetch('/api/ai/generate-brief', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(request)
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                const errorMessage = errorData?.error || `Failed to generate AI brief (HTTP ${response.status})`;
                throw new Error(errorMessage);
            }
            
            const aiResponse = await response.json();
            
            // Update concept with AI response
            const updatedConceptWithAI = await updateBriefConcept({
                 ...conceptWithSavedPrompt,
                 caption_hook_options: aiResponse.caption_hook_options || conceptWithSavedPrompt.caption_hook_options,
                 spoken_hook_options: aiResponse.spoken_hook_options || conceptWithSavedPrompt.spoken_hook_options,
                 body_content_structured: aiResponse.body_content_structured_scenes || conceptWithSavedPrompt.body_content_structured,
                 cta_script: aiResponse.cta_script || conceptWithSavedPrompt.cta_script,
                 cta_text_overlay: aiResponse.cta_text_overlay || conceptWithSavedPrompt.cta_text_overlay
              });
              
              // Update local caption and spoken hooks state
              if (aiResponse.caption_hook_options) {
                  console.log('AI Response - Caption hooks received:', aiResponse.caption_hook_options);
                  setLocalCaptionHooks(prev => ({
                      ...prev,
                      [conceptId]: aiResponse.caption_hook_options
                  }));
                  // Also update the caption hooks list for the UI
                  const parsedCaptionHooks = parseHooksFromString(aiResponse.caption_hook_options);
                  console.log('Parsed caption hooks:', parsedCaptionHooks);
                  setLocalCaptionHooksList(prev => ({
                      ...prev,
                      [conceptId]: parsedCaptionHooks
                  }));
              }
              
              // Update local spoken hooks state when received from AI
              if (aiResponse.spoken_hook_options) {
                  console.log('AI Response - Spoken hooks received:', aiResponse.spoken_hook_options);
                  setLocalSpokenHooks(prev => ({
                      ...prev,
                      [conceptId]: aiResponse.spoken_hook_options
                  }));
                  // Also update the spoken hooks list for the UI
                  const parsedSpokenHooks = parseHooksFromString(aiResponse.spoken_hook_options);
                  console.log('Parsed spoken hooks:', parsedSpokenHooks);
                  setLocalSpokenHooksList(prev => ({
                      ...prev,
                      [conceptId]: parsedSpokenHooks
                  }));
              } else {
                  console.log('AI Response - No spoken hooks received. Full AI response:', aiResponse);
              }
              
              setConcepts(prev => 
                  prev.map(c => c.id === updatedConceptWithAI.id ? updatedConceptWithAI : c)
              );
        } catch (err: unknown) {
            console.error('Failed to generate AI brief:', err);
            setError(`AI brief generation failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            // Clear the loading state for this specific concept
            setGeneratingConceptIds(prev => {
                const updated = { ...prev };
                delete updated[conceptId];
                return updated;
            });
        }
    };

    // Generate AI briefs for all concepts
    const handleGenerateAllAI = async () => {
        if (!brand || !user?.id || concepts.length === 0) return;
        
        try {
            setGeneratingAI(true);
            setError(null);
            
            // First, save any unsaved prompts for all concepts
            for (const concept of concepts) {
                const currentPromptValue = localPrompts[concept.id] || '';
                if (currentPromptValue !== concept.ai_custom_prompt) {
                    try {
                        // Update the concept with the current prompt immediately
                        const updatedConceptWithPrompt = {
                            ...concept,
                            ai_custom_prompt: currentPromptValue
                        };
                        
                        // Save the updated prompt
                        const savedConcept = await updateBriefConcept(updatedConceptWithPrompt);
                        
                        // Update the local concepts state to reflect the saved prompt
                        setConcepts(prev => 
                            prev.map(c => c.id === concept.id ? savedConcept : c)
                        );
                    } catch (promptSaveError) {
                        console.error(`Failed to save prompt for concept ${concept.id}:`, promptSaveError);
                        // Continue with the next concept even if saving this prompt fails
                    }
                }
                
                // Also save hook type and count settings if they differ from the database
                const localHookType = localHookTypes[concept.id] || 'both';
                const localHookCount = localHookCounts[concept.id] || 5;
                
                if (localHookType !== concept.hook_type || localHookCount !== concept.hook_count) {
                    try {
                        // Update the concept with the current hook settings
                        const updatedConceptWithHooks = {
                            ...concept,
                            hook_type: localHookType,
                            hook_count: localHookCount
                        };
                        
                        // Save the updated hook settings
                        const savedConcept = await updateBriefConcept(updatedConceptWithHooks);
                        
                        // Update the local concepts state
                        setConcepts(prev => 
                            prev.map(c => c.id === concept.id ? savedConcept : c)
                        );
                    } catch (hookSaveError) {
                        console.error(`Failed to save hook settings for concept ${concept.id}:`, hookSaveError);
                        // Continue with the next concept even if saving hook settings fails
                    }
                }
            }
            
            // Clear any pending debounced updates
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
                saveTimeoutRef.current = null;
            }
            
            // Get the refreshed concepts list after saving all prompts
            const refreshedConcepts = [...concepts];
            
            let successCount = 0;
            let failCount = 0;
            
            for (const concept of refreshedConcepts) {
                try {
                    console.log(`Generating AI brief for concept: ${concept.id} (${concept.concept_title})`);
                    // Add this concept to the loading states
                    setGeneratingConceptIds(prev => ({
                        ...prev,
                        [concept.id]: true
                    }));
                    
                    // Get the latest prompt from local state (which should be synchronized with DB at this point)
                    const currentPromptValue = localPrompts[concept.id] || concept.ai_custom_prompt || '';
                    
                    // Get the hook type and count for this concept
                    const hookType = localHookTypes[concept.id] || concept.hook_type || 'both';
                    const hookCount = localHookCounts[concept.id] || concept.hook_count || 5;
                    
                    console.log(`Using hook type: ${hookType}, hook count: ${hookCount} for concept ${concept.id}`);
                    
                    const request: AiBriefingRequest = {
                        brandContext: {
                            brand_info_data: brand.brand_info_data,
                            target_audience_data: brand.target_audience_data,
                            competition_data: brand.competition_data
                        },
                        conceptSpecificPrompt: currentPromptValue,
                        conceptCurrentData: {
                            caption_hook_options: concept.caption_hook_options || '',
                            body_content_structured: concept.body_content_structured || [],
                            cta_script: concept.cta_script || '',
                            cta_text_overlay: concept.cta_text_overlay || ''
                        },
                        media: {
                            url: concept.media_url || '',
                            type: concept.media_type || ''
                        },
                        desiredOutputFields: [
                            'caption_hook_options', 
                            'spoken_hook_options',
                            'body_content_structured_scenes', 
                            'cta_script', 
                            'cta_text_overlay'
                        ],
                        hookOptions: {
                            type: hookType,
                            count: hookCount
                        }
                    };
                    
                    const response = await fetch('/api/ai/generate-brief', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(request)
                    });
                    
                    if (!response.ok) {
                        const errorData = await response.json().catch(() => null);
                        const errorMessage = errorData?.error || `Failed to generate AI brief (HTTP ${response.status})`;
                        throw new Error(errorMessage);
                    }
                    
                    const aiResponse = await response.json();
                    
                    // Update concept with AI response
                    const updatedConcept = await updateBriefConcept({
                        ...concept,
                        id: concept.id,
                        caption_hook_options: aiResponse.caption_hook_options || concept.caption_hook_options,
                        spoken_hook_options: aiResponse.spoken_hook_options || concept.spoken_hook_options,
                        body_content_structured: aiResponse.body_content_structured_scenes || concept.body_content_structured,
                        cta_script: aiResponse.cta_script || concept.cta_script,
                        cta_text_overlay: aiResponse.cta_text_overlay || concept.cta_text_overlay
                    });
                    
                    // Update local state for hooks
                    if (aiResponse.caption_hook_options) {
                        console.log(`Generate All AI - Caption hooks received for concept ${concept.id}:`, aiResponse.caption_hook_options);
                        setLocalCaptionHooks(prev => ({
                            ...prev,
                            [concept.id]: aiResponse.caption_hook_options
                        }));
                        // Also update the caption hooks list for the UI
                        const parsedCaptionHooks = parseHooksFromString(aiResponse.caption_hook_options);
                        console.log(`Parsed caption hooks for concept ${concept.id}:`, parsedCaptionHooks);
                        setLocalCaptionHooksList(prev => ({
                            ...prev,
                            [concept.id]: parsedCaptionHooks
                        }));
                    }
                    
                    if (aiResponse.spoken_hook_options) {
                        console.log(`Generate All AI - Spoken hooks received for concept ${concept.id}:`, aiResponse.spoken_hook_options);
                        setLocalSpokenHooks(prev => ({
                            ...prev,
                            [concept.id]: aiResponse.spoken_hook_options
                        }));
                        // Also update the spoken hooks list for the UI
                        const parsedSpokenHooks = parseHooksFromString(aiResponse.spoken_hook_options);
                        console.log(`Parsed spoken hooks for concept ${concept.id}:`, parsedSpokenHooks);
                        setLocalSpokenHooksList(prev => ({
                            ...prev,
                            [concept.id]: parsedSpokenHooks
                        }));
                    } else {
                        console.log(`Generate All AI - No spoken hooks received for concept ${concept.id}. Full AI response:`, aiResponse);
                    }
                    
                    setConcepts(prev => 
                        prev.map(c => c.id === updatedConcept.id ? updatedConcept : c)
                    );
                    
                    successCount++;
                    console.log(`Successfully generated AI brief for concept: ${concept.id} (${successCount}/${concepts.length})`);
                    
                    // Add a small delay between requests to prevent rate limiting
                    await new Promise(resolve => setTimeout(resolve, 500));
                } catch (conceptErr: unknown) {
                    console.error(`Failed to generate AI brief for concept ${concept.id}:`, conceptErr);
                    failCount++;
                } finally {
                    // Clear the loading state for this concept when done
                    setGeneratingConceptIds(prev => {
                        const updated = { ...prev };
                        delete updated[concept.id];
                        return updated;
                    });
                }
            }
            
            // Set final status message
            if (failCount > 0) {
                if (successCount > 0) {
                    setError(`Generated AI briefs for ${successCount}/${concepts.length} concepts. ${failCount} failed.`);
                } else {
                    setError('Failed to generate any AI briefs. Please try again.');
                }
            } else {
                // No error if all succeeded
                console.log(`Successfully generated AI briefs for all ${concepts.length} concepts.`);
            }
        } catch (err: unknown) {
            console.error('Failed to generate AI briefs for all concepts:', err);
            setError(`AI briefs generation failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setGeneratingAI(false);
        }
    };

    // Add scene to concept
    const handleAddScene = (conceptId: string) => {
        const concept = concepts.find(c => c.id === conceptId);
        if (!concept) return;
        
        const newScene: Scene = {
            scene_title: `Scene ${concept.body_content_structured.length + 1}`,
            script: '',
            visuals: ''
        };
        
        const updatedConcept = {
            ...concept,
            body_content_structured: [...concept.body_content_structured, newScene]
        };
        
        handleUpdateConcept(updatedConcept);
    };

    // Remove scene from concept
    const handleRemoveScene = (conceptId: string, sceneIndex: number) => {
        const concept = concepts.find(c => c.id === conceptId);
        if (!concept) return;
        
        const updatedConcept = {
            ...concept,
            body_content_structured: concept.body_content_structured.filter((_, i) => i !== sceneIndex)
        };
        
        handleUpdateConcept(updatedConcept);
    };

    // Update scene in concept
    const handleUpdateScene = (conceptId: string, sceneIndex: number, updatedScene: Scene) => {
        const concept = concepts.find(c => c.id === conceptId);
        if (!concept) return;
        
        const updatedScenes = [...concept.body_content_structured];
        updatedScenes[sceneIndex] = updatedScene;
        
        const updatedConcept = {
            ...concept,
            body_content_structured: updatedScenes
        };
        
        handleUpdateConcept(updatedConcept);
    };

    // Move scene up in concept
    const handleMoveSceneUp = (conceptId: string, sceneIndex: number) => {
        if (sceneIndex === 0) return;
        
        const concept = concepts.find(c => c.id === conceptId);
        if (!concept) return;
        
        const updatedScenes = [...concept.body_content_structured];
        const temp = updatedScenes[sceneIndex - 1];
        updatedScenes[sceneIndex - 1] = updatedScenes[sceneIndex];
        updatedScenes[sceneIndex] = temp;
        
        const updatedConcept = {
            ...concept,
            body_content_structured: updatedScenes
        };
        
        handleUpdateConcept(updatedConcept);
    };

    // Move scene down in concept
    const handleMoveSceneDown = (conceptId: string, sceneIndex: number) => {
        const concept = concepts.find(c => c.id === conceptId);
        if (!concept || sceneIndex >= concept.body_content_structured.length - 1) return;
        
        const updatedScenes = [...concept.body_content_structured];
        const temp = updatedScenes[sceneIndex + 1];
        updatedScenes[sceneIndex + 1] = updatedScenes[sceneIndex];
        updatedScenes[sceneIndex] = temp;
        
        const updatedConcept = {
            ...concept,
            body_content_structured: updatedScenes
        };
        
        handleUpdateConcept(updatedConcept);
    };

    // Update concept with debounce
    const debouncedUpdateConcept = (concept: BriefConcept) => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        
        saveTimeoutRef.current = setTimeout(() => {
            handleUpdateConcept(concept);
            saveTimeoutRef.current = null;
        }, 1000); // 1 second debounce
    };

    // Clean up timeout on component unmount
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, []);

    // Debounced update scene
    const debouncedUpdateScene = (conceptId: string, sceneIndex: number, updatedScene: Scene) => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        
        saveTimeoutRef.current = setTimeout(() => {
            handleUpdateScene(conceptId, sceneIndex, updatedScene);
            saveTimeoutRef.current = null;
        }, 1000); // 1 second debounce
    };

    // Update localPrompts when concepts change
    useEffect(() => {
        const promptMap: Record<string, string> = {};
        const captionHooksMap: Record<string, string> = {};
        const spokenHooksMap: Record<string, string> = {};
        const ctaScriptMap: Record<string, string> = {};
        const ctaTextOverlayMap: Record<string, string> = {};
        const scenesMap: Record<string, Scene[]> = {};
        const clickupLinksMap: Record<string, string> = {};
        const strategistsMap: Record<string, string> = {};
        const videoEditorsMap: Record<string, string> = {};
        const videoInstructionsMap: Record<string, string> = {};
        const designerInstructionsMap: Record<string, string> = {};
        const mediaTypesMap: Record<string, 'video' | 'image'> = {};
        const descriptionsMap: Record<string, string> = {};
        const captionHooksListMap: Record<string, Hook[]> = {};
        const spokenHooksListMap: Record<string, Hook[]> = {};
        
        concepts.forEach(concept => {
            promptMap[concept.id] = concept.ai_custom_prompt || '';
            captionHooksMap[concept.id] = concept.caption_hook_options || '';
            spokenHooksMap[concept.id] = concept.spoken_hook_options || '';
            ctaScriptMap[concept.id] = concept.cta_script || '';
            ctaTextOverlayMap[concept.id] = concept.cta_text_overlay || '';
            scenesMap[concept.id] = [...(concept.body_content_structured || [])];
            clickupLinksMap[concept.id] = concept.clickup_id || '';
            strategistsMap[concept.id] = concept.strategist || '';
            videoEditorsMap[concept.id] = concept.video_editor || '';
            videoInstructionsMap[concept.id] = concept.videoInstructions || '';
            designerInstructionsMap[concept.id] = concept.designerInstructions || '';
            mediaTypesMap[concept.id] = (concept.media_type as 'video' | 'image') || 'video';
            descriptionsMap[concept.id] = concept.description || '';
            captionHooksListMap[concept.id] = parseHooksFromString(concept.caption_hook_options || '');
            spokenHooksListMap[concept.id] = parseHooksFromString(concept.spoken_hook_options || '');
        });
        
        setLocalPrompts(promptMap);
        setLocalCaptionHooks(captionHooksMap);
        setLocalSpokenHooks(spokenHooksMap);
        setLocalCtaScript(ctaScriptMap);
        setLocalCtaTextOverlay(ctaTextOverlayMap);
        setLocalScenes(scenesMap);
        setLocalClickupLinks(clickupLinksMap);
        setLocalStrategists(strategistsMap);
        setLocalVideoEditors(videoEditorsMap);
        setLocalVideoInstructions(videoInstructionsMap);
        setLocalDesignerInstructions(designerInstructionsMap);
        setLocalMediaTypes(mediaTypesMap);
        setLocalDescriptions(descriptionsMap);
        setLocalCaptionHooksList(captionHooksListMap);
        setLocalSpokenHooksList(spokenHooksListMap);
    }, [concepts]);

    // Debug prompt for a concept
    const handleDebugPrompt = async (conceptId: string) => {
        if (!brand || !user?.id) return;
        
        const concept = concepts.find(c => c.id === conceptId);
        if (!concept) return;
        
        // Use the local state value for the custom prompt
        const customPrompt = localPrompts[conceptId] || concept.ai_custom_prompt || '';
        
        // Determine media type
        const mediaType = concept.media_type || 'video';
        
        // Construct the request object that would be sent to the API
        const request: AiBriefingRequest = {
            brandContext: {
                brand_info_data: brand.brand_info_data,
                target_audience_data: brand.target_audience_data,
                competition_data: brand.competition_data,
                system_instructions_image: brand.system_instructions_image,
                system_instructions_video: brand.system_instructions_video
            },
            conceptSpecificPrompt: customPrompt, // Use the local value
            conceptCurrentData: {
                caption_hook_options: localCaptionHooks[conceptId] || concept.caption_hook_options || '',
                body_content_structured: localScenes[conceptId] || concept.body_content_structured || [],
                cta_script: localCtaScript[conceptId] || concept.cta_script || '',
                cta_text_overlay: localCtaTextOverlay[conceptId] || concept.cta_text_overlay || '',
                description: localDescriptions[conceptId] || concept.description || ''
            },
            media: {
                url: concept.media_url || '',
                type: mediaType
            },
            desiredOutputFields: mediaType === 'image' 
                ? ['description', 'cta'] // For image briefs (using system_instructions_image format)
                : ['caption_hook_options', 'spoken_hook_options', 'body_content_structured_scenes', 'cta_script', 'cta_text_overlay'], // For video briefs
            hookOptions: {
                type: concept.hook_type || localHookTypes[conceptId] || 'both',
                count: concept.hook_count || localHookCounts[conceptId] || 5
            }
        };
        
        // Simulate the prompt construction similar to what happens in the API route
        const brandContextStr = JSON.stringify(request.brandContext, null, 2);
        
        // Create media type appropriate currentData string
        let currentDataStr;
        if (mediaType === 'image') {
            // For image briefs, only include description and cta
            currentDataStr = JSON.stringify({
                description: localDescriptions[conceptId] || concept.description || '',
                cta: localCtaScript[conceptId] || concept.cta_script || ''
            }, null, 2);
        } else {
            // For video briefs, use the full structure
            currentDataStr = JSON.stringify({
                caption_hook_options: localCaptionHooks[conceptId] || concept.caption_hook_options || '',
                body_content_structured: localScenes[conceptId] || concept.body_content_structured || [],
                cta_script: localCtaScript[conceptId] || concept.cta_script || '',
                cta_text_overlay: localCtaTextOverlay[conceptId] || concept.cta_text_overlay || ''
            }, null, 2);
        }
        
        const fieldsStr = request.desiredOutputFields.join(', ');
        
        // Get media information - update to show that binary data is now sent
        const hasMedia = request.media && request.media.url;
        const mediaInfo = hasMedia ? 
            `MEDIA INFORMATION:
Type: ${request.media?.type || 'unknown'}
URL: ${request.media?.url}

NOTE: In the actual API request, the media file is downloaded and sent as binary data directly to Gemini, 
allowing it to properly analyze images and videos. This is just a text representation for debugging purposes.` :
            'No media provided for this concept.';
        
        // Enhance custom prompt importance
        let enhancedCustomPrompt = request.conceptSpecificPrompt || "";
        if (enhancedCustomPrompt) {
            // Make custom prompt stand out more by formatting it
            enhancedCustomPrompt = `IMPORTANT INSTRUCTION: ${enhancedCustomPrompt.toUpperCase()}`;
        }
        
        // Handle hook options
        let hookInstructions = '';
        if (request.hookOptions) {
            const { type, count } = request.hookOptions;
            hookInstructions = `\nHOOK OPTIONS INSTRUCTIONS:
- Generate ${count} unique hook options
- Hook type: ${type}
- For caption hooks: Use emojis and catchy phrases suitable for social media captions
- For verbal hooks: Create spoken phrases that would work well when read aloud in videos
- If hook type is 'caption', only populate the caption_hook_options field
- If hook type is 'verbal', only populate the spoken_hook_options field 
- If hook type is 'both', populate both fields with ${count} options each
`;
        }
        
        // Get the appropriate system instructions based on media type
        let systemPrompt = '';
        
        // Check if brand-specific system instructions are provided
        if (request.brandContext.system_instructions_image && request.media?.type === 'image') {
            systemPrompt = request.brandContext.system_instructions_image;
        } else if (request.brandContext.system_instructions_video && request.media?.type === 'video') {
            systemPrompt = request.brandContext.system_instructions_video;
        } else {
            // Fallback to default system prompt if no custom instructions are available
            if (request.media?.type === 'image') {
                systemPrompt = `You are an expert advertising strategist and copywriter specializing in direct response marketing.

Given the brand context (positioning, target audience, competitors), concept prompt, and image (if provided), analyze the ad and generate a short, punchy image ad brief containing only the description and call to action (CTA). The description should highlight the key emotional or functional benefit in a compelling way that matches the visual. The CTA should clearly tell the viewer what to do next.

IMPORTANT: Your response MUST be valid JSON and nothing else. Format:

{
  "description": "description of the image, details for how to interpret will be given in the prompt",
  "cta": "if needed, based on the content of the prompt and image as well"
}

Only return that JSON structure and no other text.`;
            } else {
                systemPrompt = `You are an expert advertising strategist and copywriter specializing in direct response marketing. 
Given the brand context (positioning, target audience, competitors), concept prompt, and video content (if provided), generate ad creative components that specifically relate to the video content.

IMPORTANT: Your response MUST be valid JSON and nothing else. Format:
{
  "caption_hook_options": "A string with multiple options for caption hooks (with emojis)",
  "spoken_hook_options": "A string with multiple options for verbal/spoken hooks",
  "body_content_structured_scenes": [
    { 
      "scene_title": "Scene 1 (optional)", 
      "script": "Script content for this scene", 
      "visuals": "Visual description for this scene" 
    },
    // Add more scenes as needed
  ],
  "cta_script": "Call to action script",
  "cta_text_overlay": "Text overlay for the CTA"
}`;
            }
        }
        
        // Add explanation about system instructions for clarity in debug view
        if (request.brandContext.system_instructions_image || request.brandContext.system_instructions_video) {
            // Add a note about which system instructions were used
            const usedInstructions = request.media?.type === 'image' ? 'image' : request.media?.type === 'video' ? 'video' : 'default';
            systemPrompt = `/* Using ${usedInstructions} system instructions */\n\n` + systemPrompt;
        }

        const userPrompt = `${enhancedCustomPrompt ? `${enhancedCustomPrompt}\n\n` : ''}${hookInstructions}
BRAND CONTEXT:
\`\`\`json
${brandContextStr}
\`\`\`

${mediaInfo}

CURRENT CONTENT (for refinement):
\`\`\`json
${currentDataStr}
\`\`\`

Please generate content for these fields: ${fieldsStr}
If media is provided, make sure your content directly references and relates to what's shown in the media.
Ensure your response is ONLY valid JSON matching the structure in my instructions. Do not include any other text.`;

        // Set the debug prompt
        const fullPrompt = systemPrompt + "\n\n" + userPrompt;
        setDebugPrompt(fullPrompt);
        setShowPromptDebugDialog(true);
    };

    // Handle copying to clipboard
    const handleCopyPrompt = () => {
        navigator.clipboard.writeText(debugPrompt)
            .then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            })
            .catch(err => {
                console.error('Failed to copy text: ', err);
            });
    };

    // Share batch via link
    const handleShareBatchViaLink = async () => {
        if (!batch) return;
        
        try {
            setSharingInProgress(true);
            setShareSuccess(false);
            
            const shareSettings: ShareSettings = {
                is_editable: shareIsEditable,
                expires_at: null // No expiration
            };
            
            const shareResult = await shareBriefBatch(batch.id, 'link', shareSettings);
            
            setShareLink(shareResult.share_url);
            setShareSuccess(true);
        } catch (err) {
            console.error('Failed to share batch:', err);
            setError('Failed to create share link. Please try again.');
        } finally {
            setSharingInProgress(false);
        }
    };
    
    // Share batch via email
    const handleShareBatchViaEmail = async () => {
        if (!batch || !shareEmail) return;
        
        try {
            setSharingInProgress(true);
            setShareSuccess(false);
            
            const shareSettings: ShareSettings = {
                is_editable: shareIsEditable,
                expires_at: null, // No expiration
                email: shareEmail
            };
            
            await shareBriefBatch(batch.id, 'email', shareSettings);
            
            setShareSuccess(true);
            setShareEmail('');
        } catch (err) {
            console.error('Failed to share batch via email:', err);
            setError('Failed to share via email. Please try again.');
        } finally {
            setSharingInProgress(false);
        }
    };
    
    // Share concept via link
    const handleShareConceptViaLink = async () => {
        if (!sharingConceptId) return;
        
        try {
            setSharingInProgress(true);
            setShareSuccess(false);
            
            const shareSettings: ShareSettings = {
                is_editable: true, // Changed from false to true to allow editors to submit their work
                expires_at: null // No expiration
            };
            
            const shareResult = await shareBriefConcept(sharingConceptId, 'link', shareSettings);
            
            setShareLink(shareResult.share_url);
            setShareSuccess(true);
        } catch (err) {
            console.error('Failed to share concept:', err);
            setError('Failed to create share link. Please try again.');
        } finally {
            setSharingInProgress(false);
        }
    };
    
    // Copy share link to clipboard
    const handleCopyShareLink = () => {
        navigator.clipboard.writeText(shareLink)
            .then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            })
            .catch(err => {
                console.error('Failed to copy share link: ', err);
            });
    };
    
    // Reset sharing state when dialogs are closed
    useEffect(() => {
        if (!showShareBatchDialog && !showShareConceptDialog) {
            setShareLink('');
            setShareEmail('');
            setShareSuccess(false);
        }
    }, [showShareBatchDialog, showShareConceptDialog]);

    // Handle media type change
    const handleMediaTypeChange = (conceptId: string, mediaType: 'video' | 'image') => {
        const concept = concepts.find(c => c.id === conceptId);
        if (!concept) return;
        
        // Update local state
        setLocalMediaTypes(prev => ({
            ...prev,
            [conceptId]: mediaType
        }));
        
        // Update concept in database
        const updatedConcept = {
            ...concept,
            media_type: mediaType
        };
        
        handleUpdateConcept(updatedConcept);
    };

    // Hook handling functions
    const parseHooksFromString = (hooksString: string): Hook[] => {
        if (!hooksString) return [];
        
        // First, try to split by common separators
        let hooks: string[] = [];
        
        // Try splitting by "OR" first (case insensitive)
        if (hooksString.match(/\bOR\b/i)) {
            hooks = hooksString.split(/\bOR\b/i).map(hook => hook.trim()).filter(hook => hook);
        } 
        // Try splitting by numbered patterns like "1.", "2.", etc.
        else if (hooksString.match(/^\s*\d+\./m)) {
            hooks = hooksString.split(/(?=^\s*\d+\.)/m).map(hook => hook.trim()).filter(hook => hook);
        }
        // Try splitting by bullet points like "-" or "*"
        else if (hooksString.match(/^\s*[-*•]/m)) {
            hooks = hooksString.split(/(?=^\s*[-*•])/m).map(hook => hook.trim()).filter(hook => hook);
        }
        // Fallback to newline splitting, but filter out common separators
        else {
            hooks = hooksString.split('\n')
                .map(line => line.trim())
                .filter(line => line && !line.match(/^(OR|and|&|\|)$/i));
        }
        
        // Clean up each hook by removing leading numbers, bullets, or separators
        hooks = hooks.map(hook => {
            return hook
                .replace(/^\s*\d+\.\s*/, '') // Remove leading numbers like "1. "
                .replace(/^\s*[-*•]\s*/, '') // Remove leading bullets
                .replace(/^\s*(OR|and|&|\|)\s*/i, '') // Remove leading separators
                .trim();
        }).filter(hook => hook && hook.length > 3); // Filter out very short hooks
        
        return hooks.map((hook, index) => ({
            id: `hook-${Date.now()}-${index}`,
            title: `Hook ${index + 1}`,
            content: hook
        }));
    };

    const convertHooksToString = (hooks: Hook[]): string => {
        return hooks.map(hook => hook.content).join('\n');
    };

    // Add caption hook
    const handleAddCaptionHook = (conceptId: string) => {
        const currentHooks = localCaptionHooksList[conceptId] || [];
        const newHook: Hook = {
            id: `caption-hook-${Date.now()}`,
            title: `Hook ${currentHooks.length + 1}`,
            content: ''
        };
        
        const updatedHooks = [...currentHooks, newHook];
        setLocalCaptionHooksList(prev => ({
            ...prev,
            [conceptId]: updatedHooks
        }));
        
        // Update the string version for database compatibility
        const concept = concepts.find(c => c.id === conceptId);
        if (concept) {
            const updatedConcept = {
                ...concept,
                caption_hook_options: convertHooksToString(updatedHooks)
            };
            debouncedUpdateConcept(updatedConcept);
        }
    };

    // Remove caption hook
    const handleRemoveCaptionHook = (conceptId: string, hookId: string) => {
        const currentHooks = localCaptionHooksList[conceptId] || [];
        const updatedHooks = currentHooks.filter(hook => hook.id !== hookId);
        
        setLocalCaptionHooksList(prev => ({
            ...prev,
            [conceptId]: updatedHooks
        }));
        
        // Update the string version for database compatibility
        const concept = concepts.find(c => c.id === conceptId);
        if (concept) {
            const updatedConcept = {
                ...concept,
                caption_hook_options: convertHooksToString(updatedHooks)
            };
            handleUpdateConcept(updatedConcept);
        }
    };

    // Update caption hook
    const handleUpdateCaptionHook = (conceptId: string, hookId: string, content: string) => {
        const currentHooks = localCaptionHooksList[conceptId] || [];
        const updatedHooks = currentHooks.map(hook => 
            hook.id === hookId ? { ...hook, content } : hook
        );
        
        setLocalCaptionHooksList(prev => ({
            ...prev,
            [conceptId]: updatedHooks
        }));
        
        // Update the string version for database compatibility
        const concept = concepts.find(c => c.id === conceptId);
        if (concept) {
            const updatedConcept = {
                ...concept,
                caption_hook_options: convertHooksToString(updatedHooks)
            };
            debouncedUpdateConcept(updatedConcept);
        }
    };

    // Add spoken hook
    const handleAddSpokenHook = (conceptId: string) => {
        const currentHooks = localSpokenHooksList[conceptId] || [];
        const newHook: Hook = {
            id: `spoken-hook-${Date.now()}`,
            title: `Hook ${currentHooks.length + 1}`,
            content: ''
        };
        
        const updatedHooks = [...currentHooks, newHook];
        setLocalSpokenHooksList(prev => ({
            ...prev,
            [conceptId]: updatedHooks
        }));
        
        // Update the string version for database compatibility
        const concept = concepts.find(c => c.id === conceptId);
        if (concept) {
            const updatedConcept = {
                ...concept,
                spoken_hook_options: convertHooksToString(updatedHooks)
            };
            debouncedUpdateConcept(updatedConcept);
        }
    };

    // Remove spoken hook
    const handleRemoveSpokenHook = (conceptId: string, hookId: string) => {
        const currentHooks = localSpokenHooksList[conceptId] || [];
        const updatedHooks = currentHooks.filter(hook => hook.id !== hookId);
        
        setLocalSpokenHooksList(prev => ({
            ...prev,
            [conceptId]: updatedHooks
        }));
        
        // Update the string version for database compatibility
        const concept = concepts.find(c => c.id === conceptId);
        if (concept) {
            const updatedConcept = {
                ...concept,
                spoken_hook_options: convertHooksToString(updatedHooks)
            };
            handleUpdateConcept(updatedConcept);
        }
    };

    // Update spoken hook
    const handleUpdateSpokenHook = (conceptId: string, hookId: string, content: string) => {
        const currentHooks = localSpokenHooksList[conceptId] || [];
        const updatedHooks = currentHooks.map(hook => 
            hook.id === hookId ? { ...hook, content } : hook
        );
        
        setLocalSpokenHooksList(prev => ({
            ...prev,
            [conceptId]: updatedHooks
        }));
        
        // Update the string version for database compatibility
        const concept = concepts.find(c => c.id === conceptId);
        if (concept) {
            const updatedConcept = {
                ...concept,
                spoken_hook_options: convertHooksToString(updatedHooks)
            };
            debouncedUpdateConcept(updatedConcept);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[200px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            </div>
        );
    }

    if (!brand || !batch) {
        return (
            <div className="p-6">
                <Alert>
                    <AlertDescription>Batch not found.</AlertDescription>
                </Alert>
                <Link href={`/app/powerbrief/${brandId}`}>
                    <Button className="mt-4">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Brand
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
                    <Link href={`/app/powerbrief/${brandId}`}>
                        <Button variant="outline">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Brand
                        </Button>
                    </Link>
                    <h1 className="text-2xl font-bold">{batch.name}</h1>
                </div>
                <div className="flex space-x-2">
                    <Button
                        variant="outline"
                        onClick={() => setShowBatchSettingsDialog(true)}
                    >
                        Batch Settings
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => setShowShareBatchDialog(true)}
                    >
                        <Share2 className="h-4 w-4 mr-2" />
                        Share Batch
                    </Button>
                    <Button
                        variant="outline"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setShowDeleteBatchDialog(true)}
                    >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Batch
                    </Button>
                    <Button
                        className="bg-red-600 text-white hover:bg-red-700"
                        onClick={handleGenerateAllAI}
                        disabled={generatingAI || concepts.length === 0}
                    >
                        {generatingAI ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Sparkles className="h-4 w-4 mr-2" />
                                EZ - BRIEF - ALL
                            </>
                        )}
                    </Button>
                    <Button
                        className="bg-green-600 text-white hover:bg-green-700"
                        onClick={() => {
                            console.log("EZ UPLOAD: Button clicked, opening file selector");
                            if (multipleFileInputRef.current) {
                                multipleFileInputRef.current.click();
                            } else {
                                console.error("EZ UPLOAD: File input reference is null");
                                setError("Cannot open file selector. Please try again.");
                            }
                        }}
                        disabled={generatingAI}
                    >
                        {generatingAI ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Uploading...
                            </>
                        ) : (
                            <>
                                <FileUp className="h-4 w-4 mr-2" />
                                EZ UPLOAD
                            </>
                        )}
                    </Button>
                </div>
            </div>
            
            {error && (
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
            
            <div className="flex flex-col space-y-4">
                {/* Concept Cards with scroll indicators */}
                <div className="relative">
                    <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-12 h-full bg-gradient-to-r from-background to-transparent z-10 pointer-events-none"></div>
                    
                    <div className="flex overflow-x-auto pb-4 space-x-6 hide-scrollbar" style={{ scrollbarWidth: 'none', minHeight: "750px" }}>
                        {concepts.map((concept) => (
                            <Card 
                                key={concept.id} 
                                className={`${
                                    concept.status === "REVISIONS REQUESTED" 
                                    ? "border-amber-300 border-2" 
                                    : concept.status === "APPROVED" 
                                        ? "border-green-300 border-2"
                                        : ""
                                } mb-4 transition-all duration-200 ease-in-out p-3 relative`}
                            >
                                <CardHeader className="relative">
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="text-base">
                                            {concept.concept_title}
                                        </CardTitle>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 rounded-full"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteConcept(concept.id);
                                            }}
                                            disabled={savingConceptId === concept.id}
                                        >
                                            {savingConceptId === concept.id ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <X className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                    
                                    {/* ClickUp ID Field */}
                                    <div className="mt-2">
                                        <label className="block text-xs font-medium mb-1">ClickUp ID:</label>
                                        <Input
                                            value={localClickupLinks[concept.id] || ''}
                                            onChange={(e) => {
                                                // Update the local state for UI updates
                                                setLocalClickupLinks(prev => ({
                                                    ...prev,
                                                    [concept.id]: e.target.value
                                                }));
                                                
                                                // Also update the concepts state directly for immediate feedback
                                                setConcepts(prevConcepts => 
                                                    prevConcepts.map(c => 
                                                        c.id === concept.id ? { ...c, clickup_id: e.target.value } : c
                                                    )
                                                );
                                                
                                                const updatedConcept = {
                                                    ...concept,
                                                    clickup_id: e.target.value
                                                };
                                                debouncedUpdateConcept(updatedConcept);
                                            }}
                                            onBlur={() => {
                                                if (saveTimeoutRef.current) {
                                                    clearTimeout(saveTimeoutRef.current);
                                                    saveTimeoutRef.current = null;
                                                }
                                                
                                                const updatedConcept = {
                                                    ...concept,
                                                    clickup_id: localClickupLinks[concept.id] || ''
                                                };
                                                handleUpdateConcept(updatedConcept);
                                            }}
                                            placeholder="Enter ClickUp ID"
                                            className="text-sm"
                                        />
                                    </div>
                                    
                                    {/* ClickUp Link Field */}
                                    <div className="mt-2">
                                        <label className="block text-xs font-medium mb-1">ClickUp Link:</label>
                                        <div className="flex">
                                            {editingClickupLink === concept.id ? (
                                                <div className="flex w-full">
                                                    <Input
                                                        value={concept.clickup_link || ''}
                                                        onChange={(e) => {
                                                            // Store the value directly in a temporary variable to prevent loss
                                                            const newValue = e.target.value;
                                                            // Update the concept in state immediately for better typing responsiveness
                                                            setConcepts(prevConcepts => 
                                                                prevConcepts.map(c => 
                                                                    c.id === concept.id ? { ...c, clickup_link: newValue } : c
                                                                )
                                                            );
                                                            
                                                            // Still send the update to the debounced handler
                                                            const updatedConcept = {
                                                                ...concept,
                                                                clickup_link: newValue
                                                            };
                                                            debouncedUpdateConcept(updatedConcept);
                                                        }}
                                                        onBlur={() => {
                                                            setEditingClickupLink(null);
                                                            
                                                            if (saveTimeoutRef.current) {
                                                                clearTimeout(saveTimeoutRef.current);
                                                                saveTimeoutRef.current = null;
                                                            }
                                                            
                                                            handleUpdateConcept(concept);
                                                        }}
                                                        placeholder="Paste ClickUp URL"
                                                        className="text-sm"
                                                        autoFocus
                                                    />
                                                    <Button 
                                                        size="sm" 
                                                        variant="ghost" 
                                                        onClick={() => {
                                                            setEditingClickupLink(null);
                                                            
                                                            if (saveTimeoutRef.current) {
                                                                clearTimeout(saveTimeoutRef.current);
                                                                saveTimeoutRef.current = null;
                                                            }
                                                            
                                                            handleUpdateConcept(concept);
                                                        }}
                                                        className="ml-1"
                                                    >
                                                        <Check className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="flex w-full items-center">
                                                    {concept.clickup_link ? (
                                                        <a 
                                                            href={concept.clickup_link} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="text-blue-600 hover:underline text-sm truncate flex-1"
                                                        >
                                                            {concept.clickup_link}
                                                        </a>
                                                    ) : (
                                                        <span className="text-gray-500 text-sm italic flex-1">No link added</span>
                                                    )}
                                                    <Button 
                                                        size="sm" 
                                                        variant="ghost"
                                                        onClick={() => setEditingClickupLink(concept.id)}
                                                    >
                                                        <Pencil className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Frame.io Review Link - Display when concept is ready for review or approved */}
                                    {(concept.status === 'READY FOR REVIEW' || concept.status === 'APPROVED' || concept.review_status === 'ready_for_review' || concept.review_status === 'approved') && 
                                        concept.review_link && (
                                        <div className="mt-2">
                                            <label className="block text-xs font-medium mb-1">Frame.io Review Link:</label>
                                            <div className="flex w-full items-center">
                                                <a 
                                                    href={concept.review_link} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 hover:underline text-sm truncate flex-1"
                                                >
                                                    {concept.review_link}
                                                </a>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Status Dropdown */}
                                    <div className="mt-2">
                                        <label className="block text-xs font-medium mb-1" id={`status-label-${concept.id}`}>Status:</label>
                                        <select
                                            value={concept.status || ''}
                                            onChange={(e) => {
                                                const updatedConcept = {
                                                    ...concept,
                                                    status: e.target.value
                                                };
                                                handleUpdateConcept(updatedConcept);
                                            }}
                                            className="w-full p-2 text-sm border rounded"
                                            aria-labelledby={`status-label-${concept.id}`}
                                        >
                                            <option value="">Select Status</option>
                                            <option value="BRIEFING IN PROGRESS">BRIEFING IN PROGRESS</option>
                                            <option value="BRIEF REVIEW">BRIEF REVIEW</option>
                                            <option value="READY FOR DESIGNER">READY FOR DESIGNER</option>
                                            <option value="READY FOR EDITOR">READY FOR EDITOR</option>
                                            <option value="READY FOR REVIEW">READY FOR REVIEW</option>
                                            <option value="APPROVED">APPROVED</option>
                                            <option value="REVISIONS REQUESTED">REVISIONS REQUESTED</option>
                                        </select>
                                    </div>
                                    
                                    {/* Strategist Field */}
                                    <div className="mt-2">
                                        <label className="block text-xs font-medium mb-1">Strategist:</label>
                                        <Input
                                            value={localStrategists[concept.id] || ''}
                                            onChange={(e) => {
                                                // Only update local state during typing
                                                setLocalStrategists(prev => ({
                                                    ...prev,
                                                    [concept.id]: e.target.value
                                                }));
                                            }}
                                            onBlur={() => {
                                                // Save to database only when field loses focus
                                                const updatedConcept = {
                                                    ...concept,
                                                    strategist: localStrategists[concept.id] || ''
                                                };
                                                handleUpdateConcept(updatedConcept);
                                            }}
                                            placeholder="Enter strategist name"
                                            className="text-sm"
                                        />
                                    </div>
                                    
                                    {/* Video Editor/Designer Field */}
                                    <div className="mt-2">
                                        <label className="block text-xs font-medium mb-1">Video Editor/Designer:</label>
                                        <Input
                                            value={localVideoEditors[concept.id] || ''}
                                            onChange={(e) => {
                                                // Only update local state during typing
                                                setLocalVideoEditors(prev => ({
                                                    ...prev,
                                                    [concept.id]: e.target.value
                                                }));
                                            }}
                                            onBlur={() => {
                                                // Save to database only when field loses focus
                                                const updatedConcept = {
                                                    ...concept,
                                                    video_editor: localVideoEditors[concept.id] || ''
                                                };
                                                handleUpdateConcept(updatedConcept);
                                            }}
                                            placeholder="Enter editor/designer name"
                                            className="text-sm"
                                        />
                                    </div>
                                    
                                    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
                                        {concept.status && (
                                            <div className={`text-xs px-3 py-1.5 rounded-full font-medium ${
                                                concept.status === "REVISIONS REQUESTED" 
                                                ? "bg-amber-100 text-amber-800 border border-amber-300" 
                                                : concept.status === "APPROVED" 
                                                    ? "bg-green-100 text-green-800 border border-green-300"
                                                    : concept.status === "READY FOR REVIEW"
                                                        ? "bg-blue-100 text-blue-800 border border-blue-300"
                                                        : "bg-green-100 text-green-700 border border-green-200"
                                            }`}>
                                                Status: {concept.status}
                                            </div>
                                        )}
                                        {concept.strategist && (
                                            <div className="text-xs px-3 py-1.5 bg-indigo-100 text-indigo-800 rounded-full font-medium border border-indigo-200">
                                                Strategist: {concept.strategist}
                                            </div>
                                        )}
                                        {concept.video_editor && (
                                            <div className="text-xs px-3 py-1.5 bg-purple-100 text-purple-800 rounded-full font-medium border border-purple-200">
                                                Editor: {concept.video_editor}
                                            </div>
                                        )}
                                        {concept.review_link && (
                                            <div className="text-xs px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full font-medium border border-blue-200 flex items-center">
                                                <LinkIcon className="h-3 w-3 mr-1" />
                                                Frame.io Available
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Share button for individual concept */}
                                    <div className="flex justify-end mt-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setSharingConceptId(concept.id);
                                                setShowShareConceptDialog(true);
                                            }}
                                        >
                                            <Share2 className="h-3 w-3 mr-1" />
                                            Share
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Media Preview */}
                                    <div 
                                        className="h-[150px] bg-gray-100 rounded flex items-center justify-center cursor-pointer"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (fileInputRef.current) {
                                                fileInputRef.current.setAttribute('data-concept-id', concept.id);
                                                fileInputRef.current.click();
                                            }
                                        }}
                                    >
                                        {concept.media_url ? (
                                            concept.media_type === 'video' ? (
                                                <video
                                                    src={concept.media_url}
                                                    controls
                                                    className="h-full w-full object-contain"
                                                />
                                            ) : (
                                                <img
                                                    src={concept.media_url}
                                                    alt="Concept media"
                                                    className="h-full w-full object-contain"
                                                />
                                            )
                                        ) : (
                                            <p className="text-gray-500">Upload video/image</p>
                                        )}
                                    </div>
                                    
                                    {/* Media Type Selector */}
                                    <div className="flex items-center space-x-2">
                                        <label className="text-xs font-medium">Media Type:</label>
                                        <div className="flex space-x-1">
                                            <Button
                                                variant={localMediaTypes[concept.id] === 'video' ? 'default' : 'outline'}
                                                size="sm"
                                                className={`flex items-center ${localMediaTypes[concept.id] === 'video' ? 'bg-primary-600 text-white' : ''}`}
                                                onClick={() => handleMediaTypeChange(concept.id, 'video')}
                                            >
                                                <Film className="h-3 w-3 mr-1" />
                                                Video
                                            </Button>
                                            <Button
                                                variant={localMediaTypes[concept.id] === 'image' ? 'default' : 'outline'}
                                                size="sm"
                                                className={`flex items-center ${localMediaTypes[concept.id] === 'image' ? 'bg-primary-600 text-white' : ''}`}
                                                onClick={() => handleMediaTypeChange(concept.id, 'image')}
                                            >
                                                <FileImage className="h-3 w-3 mr-1" />
                                                Image
                                            </Button>
                                        </div>
                                    </div>
                                    
                                    {/* AI Prompt */}
                                    <div>
                                        <Textarea
                                            placeholder="Custom prompt here..."
                                            value={localPrompts[concept.id] || ''}
                                            onChange={(e) => {
                                                // Update local state immediately for responsive typing
                                                setLocalPrompts(prev => ({
                                                    ...prev,
                                                    [concept.id]: e.target.value
                                                }));
                                                
                                                // Debounce the actual save operation
                                                const updatedConcept = {
                                                    ...concept,
                                                    ai_custom_prompt: e.target.value
                                                };
                                                debouncedUpdateConcept(updatedConcept);
                                            }}
                                            onBlur={() => {
                                                // Save immediately on blur (when user tabs out or clicks elsewhere)
                                                if (saveTimeoutRef.current) {
                                                    clearTimeout(saveTimeoutRef.current);
                                                    saveTimeoutRef.current = null;
                                                }
                                                
                                                const updatedConcept = {
                                                    ...concept,
                                                    ai_custom_prompt: localPrompts[concept.id] || ''
                                                };
                                                handleUpdateConcept(updatedConcept);
                                            }}
                                            className="text-sm w-full min-h-fit"
                                            style={{ height: 'auto', overflow: 'hidden' }}
                                        />
                                    </div>
                                    
                                    {/* AI Button */}
                                    {concept.media_url && (
                                        <Button
                                            size="sm"
                                            className="ml-2 bg-primary-600 text-white hover:bg-primary-700 flex items-center"
                                            disabled={generatingConceptIds[concept.id]}
                                            onClick={() => handleGenerateAI(concept.id)}
                                        >
                                            {generatingConceptIds[concept.id] ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                    Generating...
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles className="h-4 w-4 mr-2" />
                                                    Generate AI
                                                </>
                                            )}
                                        </Button>
                                    )}
                                    
                                    {/* Debug Prompt Button */}
                                    <Button
                                        size="sm"
                                        className="ml-2 bg-gray-500 text-white hover:bg-gray-600 flex items-center"
                                        onClick={() => handleDebugPrompt(concept.id)}
                                    >
                                        <Bug className="h-4 w-4 mr-2" />
                                        Debug Prompt
                                    </Button>
                                    
                                    {/* Hook Options UI - only for videos */}
                                    {localMediaTypes[concept.id] !== 'image' && (
                                        <div className="space-y-2 mt-4">
                                            <h3 className="font-medium text-sm mb-1">Hook Generation Options</h3>
                                            <div className="flex flex-col space-y-2">
                                                <div className="flex items-center space-x-2">
                                                    <label className="text-xs font-medium">Hook Type:</label>
                                                    <div className="flex space-x-1">
                                                        <Button
                                                            variant={localHookTypes[concept.id] === 'caption' ? 'default' : 'outline'}
                                                            size="sm"
                                                            className={`flex items-center ${localHookTypes[concept.id] === 'caption' ? 'bg-primary-600 text-white' : ''}`}
                                                            onClick={() => {
                                                                // Update local state first
                                                                setLocalHookTypes(prev => ({
                                                                    ...prev,
                                                                    [concept.id]: 'caption'
                                                                }));
                                                                
                                                                // Update concept in database
                                                                const hookTypeCaption = 'caption' as const;
                                                                const updatedConcept = {
                                                                    ...concept,
                                                                    hook_type: hookTypeCaption
                                                                };
                                                                handleUpdateConcept(updatedConcept);
                                                            }}
                                                        >
                                                            Caption
                                                        </Button>
                                                        <Button
                                                            variant={localHookTypes[concept.id] === 'verbal' ? 'default' : 'outline'}
                                                            size="sm"
                                                            className={`flex items-center ${localHookTypes[concept.id] === 'verbal' ? 'bg-primary-600 text-white' : ''}`}
                                                            onClick={() => {
                                                                // Update local state first
                                                                setLocalHookTypes(prev => ({
                                                                    ...prev,
                                                                    [concept.id]: 'verbal'
                                                                }));
                                                                
                                                                // Update concept in database
                                                                const hookTypeVerbal = 'verbal' as const;
                                                                const updatedConcept = {
                                                                    ...concept,
                                                                    hook_type: hookTypeVerbal
                                                                };
                                                                handleUpdateConcept(updatedConcept);
                                                            }}
                                                        >
                                                            Verbal
                                                        </Button>
                                                        <Button
                                                            variant={!localHookTypes[concept.id] || localHookTypes[concept.id] === 'both' ? 'default' : 'outline'}
                                                            size="sm"
                                                            className={`flex items-center ${!localHookTypes[concept.id] || localHookTypes[concept.id] === 'both' ? 'bg-primary-600 text-white' : ''}`}
                                                            onClick={() => {
                                                                // Update local state first
                                                                setLocalHookTypes(prev => ({
                                                                    ...prev,
                                                                    [concept.id]: 'both'
                                                                }));
                                                                
                                                                // Update concept in database
                                                                const hookTypeBoth = 'both' as const;
                                                                const updatedConcept = {
                                                                    ...concept,
                                                                    hook_type: hookTypeBoth
                                                                };
                                                                handleUpdateConcept(updatedConcept);
                                                            }}
                                                        >
                                                            Both
                                                        </Button>
                                                    </div>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <label className="text-xs font-medium">Number of Hooks:</label>
                                                    <Input
                                                        type="number"
                                                        min={1}
                                                        max={10}
                                                        value={localHookCounts[concept.id] || 5}
                                                        onChange={(e) => {
                                                            const count = parseInt(e.target.value) || 5;
                                                            
                                                            // Update local state first
                                                            setLocalHookCounts(prev => ({
                                                                ...prev,
                                                                [concept.id]: count
                                                            }));
                                                            
                                                            // Update concept in database
                                                            const updatedConcept = {
                                                                ...concept,
                                                                hook_count: count
                                                            };
                                                            handleUpdateConcept(updatedConcept);
                                                        }}
                                                        className="w-20 text-sm"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Caption Hook Box - Moved Below Generate AI */}
                                    {localMediaTypes[concept.id] === 'video' && (
                                        <div className="mt-4">
                                            <div className="flex justify-between items-center mb-2">
                                                <h3 className="font-medium text-sm">Caption Hook options (with emojis)</h3>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleAddCaptionHook(concept.id);
                                                    }}
                                                >
                                                    <Plus className="h-3 w-3 mr-1" />
                                                    Add Hook
                                                </Button>
                                            </div>
                                            
                                            {(localCaptionHooksList[concept.id] || []).length === 0 ? (
                                                <div className="p-4 bg-gray-50 rounded text-sm text-gray-500 text-center">
                                                    No caption hooks yet. Add a hook or use AI to generate content.
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {(localCaptionHooksList[concept.id] || []).map((hook) => (
                                                        <div key={hook.id} className="p-3 border rounded space-y-2">
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-xs font-medium text-gray-600">{hook.title}</span>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-6 w-6 text-red-500"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleRemoveCaptionHook(concept.id, hook.id);
                                                                    }}
                                                                >
                                                                    <X className="h-3 w-3" />
                                                                </Button>
                                                            </div>
                                                            <Textarea
                                                                value={hook.content}
                                                                onChange={(e) => {
                                                                    handleUpdateCaptionHook(concept.id, hook.id, e.target.value);
                                                                }}
                                                                placeholder="Enter caption hook with emojis"
                                                                className="text-sm w-full min-h-fit"
                                                                style={{ height: 'auto', overflow: 'hidden' }}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    
                                    {/* Spoken Hook Box - Moved Below Generate AI */}
                                    {localMediaTypes[concept.id] === 'video' && (
                                        <div className="mt-2">
                                            <div className="flex justify-between items-center mb-2">
                                                <h3 className="font-medium text-sm">Spoken Hook options</h3>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleAddSpokenHook(concept.id);
                                                    }}
                                                >
                                                    <Plus className="h-3 w-3 mr-1" />
                                                    Add Hook
                                                </Button>
                                            </div>
                                            
                                            {(localSpokenHooksList[concept.id] || []).length === 0 ? (
                                                <div className="p-4 bg-gray-50 rounded text-sm text-gray-500 text-center">
                                                    No spoken hooks yet. Add a hook or use AI to generate content.
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {(localSpokenHooksList[concept.id] || []).map((hook) => (
                                                        <div key={hook.id} className="p-3 border rounded space-y-2">
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-xs font-medium text-gray-600">{hook.title}</span>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-6 w-6 text-red-500"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleRemoveSpokenHook(concept.id, hook.id);
                                                                    }}
                                                                >
                                                                    <X className="h-3 w-3" />
                                                                </Button>
                                                            </div>
                                                            <Textarea
                                                                value={hook.content}
                                                                onChange={(e) => {
                                                                    handleUpdateSpokenHook(concept.id, hook.id, e.target.value);
                                                                }}
                                                                placeholder="Enter spoken hook"
                                                                className="text-sm w-full min-h-fit"
                                                                style={{ height: 'auto', overflow: 'hidden' }}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    
                                    {/* Body Content - conditional based on media type */}
                                    <div className="space-y-4 mt-4">
                                        <div className="flex justify-between items-center">
                                            <h3 className="font-medium text-sm">
                                                {localMediaTypes[concept.id] === 'video' 
                                                    ? "Body (Script & Visual Recommendations)" 
                                                    : "Image Description"}
                                            </h3>
                                            {localMediaTypes[concept.id] === 'video' && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleAddScene(concept.id);
                                                    }}
                                                >
                                                    <Plus className="h-3 w-3 mr-1" />
                                                    Add Scene
                                                </Button>
                                            )}
                                        </div>
                                        
                                        {localMediaTypes[concept.id] === 'video' ? (
                                            // Video content with scenes
                                            concept.body_content_structured.length === 0 ? (
                                                <div className="p-4 bg-gray-50 rounded text-sm text-gray-500 text-center">
                                                    No scenes yet. Add a scene or use AI to generate content.
                                                </div>
                                            ) : (
                                                <div className="space-y-4">
                                                    {(localScenes[concept.id] || []).map((scene, index) => (
                                                        <div key={index} className="p-4 border rounded space-y-2">
                                                            <div className="flex justify-between items-center">
                                                                                                            <Textarea
                                                value={scene.scene_title}
                                                onChange={(e) => {
                                                    const updatedScenes = [...(localScenes[concept.id] || [])];
                                                    updatedScenes[index] = {
                                                        ...scene,
                                                        scene_title: e.target.value
                                                    };
                                                    
                                                    // Update local state
                                                    setLocalScenes(prev => ({
                                                        ...prev,
                                                        [concept.id]: updatedScenes
                                                    }));
                                                    
                                                    // Debounce save
                                                    debouncedUpdateScene(
                                                        concept.id, 
                                                        index, 
                                                        updatedScenes[index]
                                                    );
                                                }}
                                                onBlur={() => {
                                                    if (saveTimeoutRef.current) {
                                                        clearTimeout(saveTimeoutRef.current);
                                                        saveTimeoutRef.current = null;
                                                    }
                                                    
                                                    handleUpdateScene(
                                                        concept.id, 
                                                        index, 
                                                        (localScenes[concept.id] || [])[index]
                                                    );
                                                }}
                                                placeholder="Scene Title (optional)"
                                                className="text-sm font-medium w-full min-h-fit"
                                                style={{ height: 'auto', overflow: 'hidden', resize: 'none' }}
                                            />
                                                                <div className="flex space-x-1">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8"
                                                                        disabled={index === 0}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleMoveSceneUp(concept.id, index);
                                                                        }}
                                                                    >
                                                                        <MoveUp className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8"
                                                                        disabled={index === concept.body_content_structured.length - 1}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleMoveSceneDown(concept.id, index);
                                                                        }}
                                                                    >
                                                                        <MoveDown className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 text-red-500"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleRemoveScene(concept.id, index);
                                                                        }}
                                                                    >
                                                                        <X className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                            
                                                            <div>
                                                                <label className="block text-xs font-medium mb-1">Script:</label>
                                                                <Textarea
                                                                    value={scene.script}
                                                                    onChange={(e) => {
                                                                        const updatedScenes = [...(localScenes[concept.id] || [])];
                                                                        updatedScenes[index] = {
                                                                            ...scene,
                                                                            script: e.target.value
                                                                        };
                                                                        
                                                                        // Update local state
                                                                        setLocalScenes(prev => ({
                                                                            ...prev,
                                                                            [concept.id]: updatedScenes
                                                                        }));
                                                                        
                                                                        // Debounce save
                                                                        debouncedUpdateScene(
                                                                            concept.id, 
                                                                            index, 
                                                                            updatedScenes[index]
                                                                        );
                                                                    }}
                                                                    onBlur={() => {
                                                                        if (saveTimeoutRef.current) {
                                                                            clearTimeout(saveTimeoutRef.current);
                                                                            saveTimeoutRef.current = null;
                                                                        }
                                                                        
                                                                        handleUpdateScene(
                                                                            concept.id, 
                                                                            index, 
                                                                            (localScenes[concept.id] || [])[index]
                                                                        );
                                                                    }}
                                                                    placeholder="Enter script content"
                                                                    rows={3}
                                                                    className="text-sm"
                                                                />
                                                            </div>
                                                            
                                                            <div>
                                                                <label className="block text-xs font-medium mb-1">Visuals:</label>
                                                                <Textarea
                                                                    value={scene.visuals}
                                                                    onChange={(e) => {
                                                                        const updatedScenes = [...(localScenes[concept.id] || [])];
                                                                        updatedScenes[index] = {
                                                                            ...scene,
                                                                            visuals: e.target.value
                                                                        };
                                                                        
                                                                        // Update local state
                                                                        setLocalScenes(prev => ({
                                                                            ...prev,
                                                                            [concept.id]: updatedScenes
                                                                        }));
                                                                        
                                                                        // Debounce save
                                                                        debouncedUpdateScene(
                                                                            concept.id, 
                                                                            index, 
                                                                            updatedScenes[index]
                                                                        );
                                                                    }}
                                                                    onBlur={() => {
                                                                        if (saveTimeoutRef.current) {
                                                                            clearTimeout(saveTimeoutRef.current);
                                                                            saveTimeoutRef.current = null;
                                                                        }
                                                                        
                                                                        handleUpdateScene(
                                                                            concept.id, 
                                                                            index, 
                                                                            (localScenes[concept.id] || [])[index]
                                                                        );
                                                                    }}
                                                                    placeholder="Describe visuals for this scene"
                                                                    rows={3}
                                                                    className="text-sm"
                                                                />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )
                                        ) : (
                                            // Image content (single description block)
                                            <div className="p-4 border rounded space-y-2">
                                                <label className="block text-xs font-medium mb-1">Description:</label>
                                                <Textarea
                                                    value={
                                                        // Use local description state if available, otherwise use the concept description
                                                        localDescriptions[concept.id] !== undefined
                                                            ? localDescriptions[concept.id]
                                                            : concept.description || ""
                                                    }
                                                    onChange={(e) => {
                                                        // Update local description state
                                                        setLocalDescriptions(prev => ({
                                                            ...prev,
                                                            [concept.id]: e.target.value
                                                        }));
                                                        
                                                        // Debounce the actual save operation
                                                        const updatedConcept = {
                                                            ...concept,
                                                            description: e.target.value
                                                        };
                                                        debouncedUpdateConcept(updatedConcept);
                                                    }}
                                                    onBlur={() => {
                                                        if (saveTimeoutRef.current) {
                                                            clearTimeout(saveTimeoutRef.current);
                                                            saveTimeoutRef.current = null;
                                                        }
                                                        
                                                        // Save the description field
                                                        const updatedConcept = {
                                                            ...concept,
                                                            description: localDescriptions[concept.id] || ""
                                                        };
                                                        
                                                        handleUpdateConcept(updatedConcept);
                                                    }}
                                                    placeholder="Describe the image content, style, elements, and composition..."
                                                    className="text-sm w-full min-h-fit"
                                                    style={{ height: 'auto', overflow: 'hidden' }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* CTA Section */}
                                    <div className="space-y-2">
                                        <h3 className="font-medium text-sm">CTA (Call to Action)</h3>
                                        
                                        <div>
                                            <label className="block text-xs font-medium mb-1">Script:</label>
                                            <MarkdownTextarea
                                                value={localCtaScript[concept.id] || ''}
                                                onChange={(value) => {
                                                    // Update local state immediately for responsive typing
                                                    setLocalCtaScript(prev => ({
                                                        ...prev,
                                                        [concept.id]: value
                                                    }));
                                                    
                                                    // Debounce the actual save operation
                                                    const updatedConcept = {
                                                        ...concept,
                                                        cta_script: value
                                                    };
                                                    debouncedUpdateConcept(updatedConcept);
                                                }}
                                                onBlur={() => {
                                                    // Save immediately on blur
                                                    if (saveTimeoutRef.current) {
                                                        clearTimeout(saveTimeoutRef.current);
                                                        saveTimeoutRef.current = null;
                                                    }
                                                    
                                                    const updatedConcept = {
                                                        ...concept,
                                                        cta_script: localCtaScript[concept.id] || ''
                                                    };
                                                    handleUpdateConcept(updatedConcept);
                                                }}
                                                placeholder="Enter CTA script"
                                                className="text-sm w-full min-h-fit"
                                            />
                                        </div>
                                        
                                        <div>
                                            <label className="block text-xs font-medium mb-1">Text overlay:</label>
                                            <MarkdownTextarea
                                                value={localCtaTextOverlay[concept.id] || ''}
                                                onChange={(value) => {
                                                    // Update local state immediately for responsive typing
                                                    setLocalCtaTextOverlay(prev => ({
                                                        ...prev,
                                                        [concept.id]: value
                                                    }));
                                                    
                                                    // Debounce the actual save operation
                                                    const updatedConcept = {
                                                        ...concept,
                                                        cta_text_overlay: value
                                                    };
                                                    debouncedUpdateConcept(updatedConcept);
                                                }}
                                                onBlur={() => {
                                                    // Save immediately on blur
                                                    if (saveTimeoutRef.current) {
                                                        clearTimeout(saveTimeoutRef.current);
                                                        saveTimeoutRef.current = null;
                                                    }
                                                    
                                                    const updatedConcept = {
                                                        ...concept,
                                                        cta_text_overlay: localCtaTextOverlay[concept.id] || ''
                                                    };
                                                    handleUpdateConcept(updatedConcept);
                                                }}
                                                placeholder="Enter text overlay"
                                                className="text-sm w-full min-h-fit"
                                            />
                                        </div>
                                    </div>
                                    
                                    {/* Voice Generator - moved below CTA */}
                                    <div className="mt-4 pt-4 border-t border-gray-100">
                                        <ConceptVoiceGenerator 
                                            scenes={localScenes[concept.id] || concept.body_content_structured || []}
                                            spokenHooks={localSpokenHooks[concept.id] || concept.spoken_hook_options || ''}
                                            ctaScript={localCtaScript[concept.id] || concept.cta_script || ''}
                                            conceptId={concept.id}
                                            brandId={brandId}
                                        />
                                    </div>
                                    
                                    {/* Creative Instructions Section */}
                                    <div className="space-y-2 mt-4 pt-4 border-t border-gray-100">
                                        <h3 className="font-medium text-sm">Creative Instructions</h3>
                                        
                                        {/* Only show video instructions for video media type */}
                                        {localMediaTypes[concept.id] === 'video' && (
                                            <div>
                                                <label className="block text-xs font-medium mb-1">Video Editor Instructions:</label>
                                                <MarkdownTextarea
                                                    value={localVideoInstructions[concept.id] || ''}
                                                    onChange={(value) => {
                                                        // Update local state immediately for responsive typing
                                                        setLocalVideoInstructions(prev => ({
                                                            ...prev,
                                                            [concept.id]: value
                                                        }));
                                                        
                                                        // Debounce the actual save operation
                                                        const updatedConcept = {
                                                            ...concept,
                                                            videoInstructions: value
                                                        };
                                                        debouncedUpdateConcept(updatedConcept);
                                                    }}
                                                    onBlur={() => {
                                                        // Save immediately on blur
                                                        if (saveTimeoutRef.current) {
                                                            clearTimeout(saveTimeoutRef.current);
                                                            saveTimeoutRef.current = null;
                                                        }
                                                        
                                                        const updatedConcept = {
                                                            ...concept,
                                                            videoInstructions: localVideoInstructions[concept.id] || ''
                                                        };
                                                        handleUpdateConcept(updatedConcept);
                                                    }}
                                                    placeholder="Instructions for video editors... e.g.&#10;- Use AI voiceover from ElevenLabs&#10;- Add B-roll footage&#10;- Logo at 10-15% opacity&#10;- Add captions&#10;- Add light background music"
                                                    className="text-sm"
                                                />
                                            </div>
                                        )}
                                        
                                        {/* Only show designer instructions for image media type */}
                                        {localMediaTypes[concept.id] === 'image' && (
                                            <div>
                                                <label className="block text-xs font-medium mb-1">Designer Instructions (for Images):</label>
                                                <MarkdownTextarea
                                                    value={localDesignerInstructions[concept.id] || ''}
                                                    onChange={(value) => {
                                                        // Update local state immediately for responsive typing
                                                        setLocalDesignerInstructions(prev => ({
                                                            ...prev,
                                                            [concept.id]: value
                                                        }));
                                                        
                                                        // Debounce the actual save operation
                                                        const updatedConcept = {
                                                            ...concept,
                                                            designerInstructions: value
                                                        };
                                                        debouncedUpdateConcept(updatedConcept);
                                                    }}
                                                    onBlur={() => {
                                                        // Save immediately on blur
                                                        if (saveTimeoutRef.current) {
                                                            clearTimeout(saveTimeoutRef.current);
                                                            saveTimeoutRef.current = null;
                                                        }
                                                        
                                                        const updatedConcept = {
                                                            ...concept,
                                                            designerInstructions: localDesignerInstructions[concept.id] || ''
                                                        };
                                                        handleUpdateConcept(updatedConcept);
                                                    }}
                                                    placeholder="Instructions for designers creating image assets..."
                                                    className="text-sm"
                                                />
                                            </div>
                                        )}
                                        
                                        {/* Show a message if no media type is selected */}
                                        {!localMediaTypes[concept.id] && (
                                            <div className="text-gray-500 text-sm p-2">
                                                Select a media type (Image/Video) to see relevant instructions
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                        
                        {/* Add Concept Card */}
                        <div 
                            className="min-w-[350px] max-w-[350px] flex-shrink-0 border-2 border-dashed rounded-lg h-[600px] flex items-center justify-center cursor-pointer hover:bg-gray-50"
                            onClick={handleCreateConcept}
                        >
                            <div className="text-center">
                                <Plus className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                                <p className="text-gray-500">Add New Concept</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-12 h-full bg-gradient-to-l from-background to-transparent z-10 pointer-events-none"></div>
                </div>
            </div>
            
            {/* Delete Batch Dialog */}
            <Dialog open={showDeleteBatchDialog} onOpenChange={setShowDeleteBatchDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Batch</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this batch? This action cannot be undone and will delete all concepts in this batch.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button 
                            variant="outline" 
                            onClick={() => setShowDeleteBatchDialog(false)}
                            disabled={deletingBatch}
                        >
                            Cancel
                        </Button>
                        <Button 
                            variant="destructive"
                            onClick={handleDeleteBatch}
                            disabled={deletingBatch}
                        >
                            {deletingBatch ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete Batch
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            {/* Hidden File Input for Single Upload */}
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden"
                accept="image/*,video/*"
                aria-label="Upload media file"
                title="Upload media file"
                onChange={(e) => {
                    if (e.target.files?.[0]) {
                        // Get the concept ID from the data attribute set when clicking upload
                        const conceptId = e.target.getAttribute('data-concept-id');
                        if (conceptId) {
                            handleUploadMedia(e.target.files[0], conceptId);
                            e.target.value = ''; // Reset input
                        } else if (activeConceptId) {
                            handleUploadMedia(e.target.files[0], activeConceptId);
                            e.target.value = ''; // Reset input
                        }
                    }
                }}
            />
            
            {/* Hidden File Input for Bulk Upload */}
            <input 
                type="file" 
                ref={multipleFileInputRef} 
                className="hidden"
                accept="image/*,video/*"
                multiple={true}
                aria-label="Bulk upload media files"
                title="Bulk upload media files"
                onChange={(e) => {
                    try {
                        // Ensure we have a valid file input event
                        if (!e.target || !e.target.files) {
                            console.error("EZ UPLOAD: File input event or files property is null");
                            setError("File selection failed. Please try again.");
                            return;
                        }
                        
                        // Check if any files were selected
                        const fileCount = e.target.files.length;
                        if (fileCount === 0) {
                            console.log("EZ UPLOAD: No files were selected");
                            return;
                        }
                        
                        console.log(`EZ UPLOAD: File input change detected - ${fileCount} files selected`);
                        
                        // Log each file that was selected to verify we have the correct files
                        for (let i = 0; i < fileCount; i++) {
                            const file = e.target.files[i];
                            console.log(`EZ UPLOAD: Selected file ${i+1}: ${file.name} (${file.type}, ${Math.round(file.size/1024)}KB)`);
                        }
                        
                        // Start the bulk upload process
                        console.log("EZ UPLOAD: Starting bulk upload process...");
                        handleBulkUploadMedia(e.target.files);
                        
                        // Reset the file input to allow reselection of the same files
                        e.target.value = '';
                        console.log("EZ UPLOAD: File input has been reset");
                    } catch (err) {
                        console.error("EZ UPLOAD: Error in file input handler:", err);
                        setError(`File selection error: ${err instanceof Error ? err.message : 'Unknown error'}`);
                        
                        // Make sure to reset the file input even if an error occurs
                        if (e.target) {
                            e.target.value = '';
                        }
                    }
                }}
            />
            
            {/* Debug Prompt Dialog */}
            <Dialog open={showPromptDebugDialog} onOpenChange={setShowPromptDebugDialog}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>AI Prompt Debug</DialogTitle>
                        <DialogDescription className="text-sm text-gray-500">
                            This shows the prompt structure that will be sent to the AI model. 
                            <span className="text-green-600 font-medium block mt-2">
                                Media files (images and videos) are now directly uploaded to Gemini as binary data, enabling accurate analysis of visual content. The actual API request will include the binary data, not just the URL shown here.
                            </span>
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="mt-4 bg-gray-900 text-gray-200 p-4 rounded-md overflow-x-auto whitespace-pre-wrap font-mono text-sm relative">
                        {debugPrompt}
                        <Button 
                            variant="outline" 
                            size="sm"
                            className="absolute top-2 right-2 bg-gray-800 hover:bg-gray-700"
                            onClick={handleCopyPrompt}
                        >
                            {copied ? (
                                <span className="text-green-400 flex items-center">
                                    <Check className="h-3 w-3 mr-1" />
                                    Copied!
                                </span>
                            ) : (
                                <span className="text-gray-300 flex items-center">
                                    <Copy className="h-3 w-3 mr-1" />
                                    Copy
                                </span>
                            )}
                        </Button>
                    </div>
                    
                    <DialogFooter className="mt-4">
                        <Button 
                            variant="outline"
                            onClick={() => setShowPromptDebugDialog(false)}
                        >
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            {/* Batch Settings Dialog */}
            <Dialog open={showBatchSettingsDialog} onOpenChange={setShowBatchSettingsDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Batch Settings</DialogTitle>
                        <DialogDescription>
                            Configure settings for this batch of concepts
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="py-4 space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Starting Concept Number:</label>
                            <div className="flex items-center space-x-2">
                                <Input 
                                    type="number" 
                                    min="1"
                                    value={startingConceptNumber}
                                    onChange={(e) => setStartingConceptNumber(parseInt(e.target.value) || 1)}
                                />
                                <Button
                                    onClick={() => updateConceptNumbering(startingConceptNumber)}
                                >
                                    Apply
                                </Button>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">This will renumber all concepts in the batch, starting from this number</p>
                        </div>
                    </div>
                    
                    <DialogFooter>
                        <Button 
                            variant="outline" 
                            onClick={() => setShowBatchSettingsDialog(false)}
                        >
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            {/* Share Batch Dialog */}
            <Dialog open={showShareBatchDialog} onOpenChange={setShowShareBatchDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Share Batch</DialogTitle>
                        <DialogDescription>
                            Create a sharable link or invite users via email to view this batch.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="py-4 space-y-4">
                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="shareEditable"
                                checked={shareIsEditable}
                                onChange={(e) => setShareIsEditable(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300"
                            />
                            <label htmlFor="shareEditable" className="text-sm font-medium text-gray-700">
                                Allow editing
                            </label>
                        </div>
                        
                        <div className="space-y-2">
                            <h3 className="text-sm font-medium">Share via Link</h3>
                            {shareSuccess && shareLink ? (
                                <div className="flex items-center space-x-2">
                                    <Input value={shareLink} readOnly className="flex-1" />
                                    <Button size="sm" onClick={handleCopyShareLink}>
                                        {copied ? (
                                            <Check className="h-4 w-4" />
                                        ) : (
                                            <Copy className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            ) : (
                                <Button 
                                    onClick={handleShareBatchViaLink}
                                    disabled={sharingInProgress}
                                    className="w-full"
                                >
                                    {sharingInProgress ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <LinkIcon className="h-4 w-4 mr-2" />
                                    )}
                                    Create Link
                                </Button>
                            )}
                        </div>
                        
                        <div className="space-y-2 pt-2 border-t">
                            <h3 className="text-sm font-medium">Invite via Email</h3>
                            <div className="flex space-x-2">
                                <Input
                                    type="email"
                                    placeholder="Email address"
                                    value={shareEmail}
                                    onChange={(e) => setShareEmail(e.target.value)}
                                    className="flex-1"
                                />
                                <Button
                                    onClick={handleShareBatchViaEmail}
                                    disabled={sharingInProgress || !shareEmail}
                                >
                                    {sharingInProgress ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <Mail className="h-4 w-4 mr-2" />
                                    )}
                                    Invite
                                </Button>
                            </div>
                            {shareSuccess && !shareLink && (
                                <p className="text-sm text-green-600">Invitation sent!</p>
                            )}
                        </div>
                    </div>
                    
                    <DialogFooter>
                        <Button 
                            variant="outline" 
                            onClick={() => setShowShareBatchDialog(false)}
                        >
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            {/* Share Concept Dialog */}
            <Dialog open={showShareConceptDialog} onOpenChange={setShowShareConceptDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Share Concept</DialogTitle>
                        <DialogDescription>
                            Create a view-only sharable link for this concept.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="py-4 space-y-4">
                        <p className="text-sm text-gray-500">
                            This will create a public view-only link to share just this concept. Anyone with the link can view it, but cannot make edits.
                        </p>
                        
                        {shareSuccess && shareLink ? (
                            <div className="flex items-center space-x-2">
                                <Input value={shareLink} readOnly className="flex-1" />
                                <Button size="sm" onClick={handleCopyShareLink}>
                                    {copied ? (
                                        <Check className="h-4 w-4" />
                                    ) : (
                                        <Copy className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        ) : (
                            <Button 
                                onClick={handleShareConceptViaLink}
                                disabled={sharingInProgress}
                                className="w-full"
                            >
                                {sharingInProgress ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <LinkIcon className="h-4 w-4 mr-2" />
                                )}
                                Create Link
                            </Button>
                        )}
                    </div>
                    
                    <DialogFooter>
                        <Button 
                            variant="outline" 
                            onClick={() => setShowShareConceptDialog(false)}
                        >
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
} 