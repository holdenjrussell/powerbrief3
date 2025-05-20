"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useGlobal } from '@/lib/context/GlobalContext';
import { useRouter } from 'next/navigation';
import { getBriefBatchById, getBrandById, getBriefConcepts, createBriefConcept, updateBriefConcept, deleteBriefConcept, deleteBriefBatch, uploadMedia, shareBriefBatch, shareBriefConcept } from '@/lib/services/powerbriefService';
import { Loader2, ArrowLeft, Trash2, Plus, FileUp, Sparkles, MoveDown, MoveUp, X, Bug, Copy, Check, Pencil, Share2, LinkIcon, Mail } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
export default function ConceptBriefingPage({ params }) {
    const { user } = useGlobal();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [brand, setBrand] = useState(null);
    const [batch, setBatch] = useState(null);
    const [concepts, setConcepts] = useState([]);
    const [error, setError] = useState(null);
    const [showDeleteBatchDialog, setShowDeleteBatchDialog] = useState(false);
    const [deletingBatch, setDeletingBatch] = useState(false);
    const [activeConceptId, setActiveConceptId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [savingConceptId, setSavingConceptId] = useState(null);
    const [generatingAI, setGeneratingAI] = useState(false);
    const [generatingConceptId, setGeneratingConceptId] = useState(null);
    const fileInputRef = useRef(null);
    const multipleFileInputRef = useRef(null);
    const saveTimeoutRef = useRef(null);
    const [localPrompts, setLocalPrompts] = useState({});
    const [localCaptionHooks, setLocalCaptionHooks] = useState({});
    const [localCtaScript, setLocalCtaScript] = useState({});
    const [localCtaTextOverlay, setLocalCtaTextOverlay] = useState({});
    const [localScenes, setLocalScenes] = useState({});
    const [localVideoInstructions, setLocalVideoInstructions] = useState({});
    const [localDesignerInstructions, setLocalDesignerInstructions] = useState({});
    const [showPromptDebugDialog, setShowPromptDebugDialog] = useState(false);
    const [debugPrompt, setDebugPrompt] = useState('');
    const [copied, setCopied] = useState(false);
    const [startingConceptNumber, setStartingConceptNumber] = useState(1);
    const [showBatchSettingsDialog, setShowBatchSettingsDialog] = useState(false);
    const [localClickupLinks, setLocalClickupLinks] = useState({});
    const [editingClickupLink, setEditingClickupLink] = useState(null);
    const [localStrategists, setLocalStrategists] = useState({});
    const [localVideoEditors, setLocalVideoEditors] = useState({});
    // Sharing related state
    const [showShareBatchDialog, setShowShareBatchDialog] = useState(false);
    const [showShareConceptDialog, setShowShareConceptDialog] = useState(false);
    const [sharingConceptId, setSharingConceptId] = useState(null);
    const [shareLink, setShareLink] = useState('');
    const [shareEmail, setShareEmail] = useState('');
    const [shareIsEditable, setShareIsEditable] = useState(false);
    const [sharingInProgress, setSharingInProgress] = useState(false);
    const [shareSuccess, setShareSuccess] = useState(false);
    // Extract params using React.use()
    const unwrappedParams = React.use(params);
    const { brandId, batchId } = unwrappedParams;
    // Fetch data
    useEffect(() => {
        const fetchData = async () => {
            if (!(user === null || user === void 0 ? void 0 : user.id) || !brandId || !batchId)
                return;
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
                if (conceptsData.length > 0 && !activeConceptId) {
                    setActiveConceptId(conceptsData[0].id);
                }
                setError(null);
            }
            catch (err) {
                console.error('Error fetching data:', err);
                setError('Failed to load data. Please try again.');
            }
            finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user === null || user === void 0 ? void 0 : user.id, brandId, batchId, router, activeConceptId]);
    // Delete batch
    const handleDeleteBatch = async () => {
        if (!batch)
            return;
        try {
            setDeletingBatch(true);
            await deleteBriefBatch(batch.id);
            router.push(`/app/powerbrief/${brandId}`);
        }
        catch (err) {
            console.error('Error deleting batch:', err);
            setError('Failed to delete batch. Please try again.');
            setDeletingBatch(false);
            setShowDeleteBatchDialog(false);
        }
    };
    // Update concept title with new numbering
    const updateConceptNumbering = (startNumber) => {
        if (!concepts.length)
            return;
        const updatedConcepts = [...concepts].map((concept, index) => {
            return Object.assign(Object.assign({}, concept), { concept_title: `Concept ${startNumber + index}` });
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
        if (!(user === null || user === void 0 ? void 0 : user.id) || !batch || !brand)
            return;
        try {
            setSaving(true);
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
                cta_script: null,
                cta_text_overlay: null,
                videoInstructions: brand.default_video_instructions || '',
                designerInstructions: brand.default_designer_instructions || ''
            });
            setConcepts(prev => [...prev, newConcept]);
            // Initialize local state for the new concept
            setLocalVideoInstructions(prev => (Object.assign(Object.assign({}, prev), { [newConcept.id]: newConcept.videoInstructions || '' })));
            setLocalDesignerInstructions(prev => (Object.assign(Object.assign({}, prev), { [newConcept.id]: newConcept.designerInstructions || '' })));
            // Only set the new concept as active if there's no active concept already
            if (!activeConceptId) {
                setActiveConceptId(newConcept.id);
            }
        }
        catch (err) {
            console.error('Failed to create concept:', err);
            setError('Failed to create concept. Please try again.');
        }
        finally {
            setSaving(false);
        }
    };
    // Delete concept
    const handleDeleteConcept = async (conceptId) => {
        try {
            setSavingConceptId(conceptId);
            await deleteBriefConcept(conceptId);
            setConcepts(prev => prev.filter(c => c.id !== conceptId));
            if (activeConceptId === conceptId) {
                const remaining = concepts.filter(c => c.id !== conceptId);
                setActiveConceptId(remaining.length > 0 ? remaining[0].id : null);
            }
        }
        catch (err) {
            console.error('Failed to delete concept:', err);
            setError('Failed to delete concept. Please try again.');
        }
        finally {
            setSavingConceptId(null);
        }
    };
    // Update concept
    const handleUpdateConcept = async (concept) => {
        try {
            setSavingConceptId(concept.id);
            const updatedConcept = await updateBriefConcept(concept);
            setConcepts(prev => prev.map(c => c.id === updatedConcept.id ? updatedConcept : c));
        }
        catch (err) {
            console.error('Failed to update concept:', err);
            setError('Failed to update concept. Please try again.');
        }
        finally {
            setSavingConceptId(null);
        }
    };
    // Upload media for a concept
    const handleUploadMedia = async (file, conceptId) => {
        if (!(user === null || user === void 0 ? void 0 : user.id))
            return;
        try {
            setSavingConceptId(conceptId);
            const mediaUrl = await uploadMedia(file, user.id);
            const concept = concepts.find(c => c.id === conceptId);
            if (concept) {
                const updatedConcept = await updateBriefConcept(Object.assign(Object.assign({}, concept), { id: conceptId, media_url: mediaUrl, media_type: file.type.startsWith('video/') ? 'video' : 'image' }));
                setConcepts(prev => prev.map(c => c.id === updatedConcept.id ? updatedConcept : c));
            }
        }
        catch (err) {
            console.error('Failed to upload media:', err);
            setError('Failed to upload media. Please try again.');
        }
        finally {
            setSavingConceptId(null);
        }
    };
    // Bulk upload media (EZ UPLOAD)
    const handleBulkUploadMedia = async (files) => {
        if (!(user === null || user === void 0 ? void 0 : user.id) || !batch)
            return;
        try {
            setGeneratingAI(true);
            setError(null);
            const fileCount = files.length;
            console.log(`EZ UPLOAD: Starting to process ${fileCount} files`);
            // Convert FileList to array to ensure we can iterate properly
            const filesArray = Array.from(files);
            console.log(`EZ UPLOAD: Converted FileList to array with ${filesArray.length} items`);
            // Keep track of all successfully created concepts
            const newConcepts = [];
            // Process each file one by one
            for (let i = 0; i < filesArray.length; i++) {
                const file = filesArray[i];
                console.log(`EZ UPLOAD: Processing file ${i + 1}/${filesArray.length}: "${file.name}" (${file.type})`);
                try {
                    // Step 1: Upload the media file
                    console.log(`EZ UPLOAD: Uploading file ${i + 1} to storage...`);
                    const mediaUrl = await uploadMedia(file, user.id);
                    console.log(`EZ UPLOAD: File ${i + 1} uploaded successfully: ${mediaUrl}`);
                    // Step 2: Create a new concept with the media URL
                    console.log(`EZ UPLOAD: Creating new concept for file ${i + 1}...`);
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
                        cta_script: null,
                        cta_text_overlay: null,
                        videoInstructions: (brand === null || brand === void 0 ? void 0 : brand.default_video_instructions) || '',
                        designerInstructions: (brand === null || brand === void 0 ? void 0 : brand.default_designer_instructions) || ''
                    });
                    console.log(`EZ UPLOAD: Created new concept for file ${i + 1} with ID: ${newConcept.id}`);
                    // Step 3: Add the new concept to our tracking array
                    newConcepts.push(newConcept);
                    console.log(`EZ UPLOAD: Added concept to newConcepts array (now contains ${newConcepts.length} concepts)`);
                    // Force a small delay to ensure processing completes
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                catch (fileErr) {
                    console.error(`EZ UPLOAD: Error processing file ${i + 1}/${filesArray.length}:`, fileErr);
                    setError(prev => {
                        const newError = `Failed to process file ${i + 1} (${file.name}): ${fileErr instanceof Error ? fileErr.message : 'Unknown error'}`;
                        return prev ? `${prev}\n${newError}` : newError;
                    });
                }
                // Force a small delay between files
                console.log(`EZ UPLOAD: Completed processing file ${i + 1}/${filesArray.length}, waiting before next file...`);
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
            }
            else if (newConcepts.length < filesArray.length) {
                console.warn(`EZ UPLOAD: Partial success - uploaded ${newConcepts.length}/${filesArray.length} files`);
                setError(`Uploaded ${newConcepts.length}/${filesArray.length} files. Some files could not be uploaded.`);
            }
            else {
                console.log(`EZ UPLOAD: Success - processed all ${filesArray.length} files`);
            }
        }
        catch (err) {
            console.error('EZ UPLOAD: Fatal error in bulk upload:', err);
            setError(`Failed to upload media: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
        finally {
            setGeneratingAI(false);
            console.log(`EZ UPLOAD: Process completed.`);
        }
    };
    // Generate AI brief for a concept
    const handleGenerateAI = async (conceptId) => {
        if (!brand || !(user === null || user === void 0 ? void 0 : user.id))
            return;
        const concept = concepts.find(c => c.id === conceptId);
        if (!concept)
            return;
        try {
            setGeneratingConceptId(conceptId);
            const request = {
                brandContext: {
                    brand_info_data: brand.brand_info_data,
                    target_audience_data: brand.target_audience_data,
                    competition_data: brand.competition_data
                },
                conceptSpecificPrompt: concept.ai_custom_prompt || '',
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
                    'body_content_structured_scenes',
                    'cta_script',
                    'cta_text_overlay'
                ]
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
                const errorMessage = (errorData === null || errorData === void 0 ? void 0 : errorData.error) || `Failed to generate AI brief (HTTP ${response.status})`;
                throw new Error(errorMessage);
            }
            const aiResponse = await response.json();
            // Update concept with AI response
            const updatedConcept = await updateBriefConcept(Object.assign(Object.assign({}, concept), { id: conceptId, caption_hook_options: aiResponse.caption_hook_options || concept.caption_hook_options, body_content_structured: aiResponse.body_content_structured_scenes || concept.body_content_structured, cta_script: aiResponse.cta_script || concept.cta_script, cta_text_overlay: aiResponse.cta_text_overlay || concept.cta_text_overlay }));
            setConcepts(prev => prev.map(c => c.id === updatedConcept.id ? updatedConcept : c));
        }
        catch (err) {
            console.error('Failed to generate AI brief:', err);
            setError(`AI brief generation failed: ${err.message || 'Unknown error'}`);
        }
        finally {
            setGeneratingConceptId(null);
        }
    };
    // Generate AI briefs for all concepts
    const handleGenerateAllAI = async () => {
        if (!brand || !(user === null || user === void 0 ? void 0 : user.id) || concepts.length === 0)
            return;
        try {
            setGeneratingAI(true);
            setError(null);
            let successCount = 0;
            let failCount = 0;
            for (const concept of concepts) {
                try {
                    console.log(`Generating AI brief for concept: ${concept.id} (${concept.concept_title})`);
                    setGeneratingConceptId(concept.id);
                    const request = {
                        brandContext: {
                            brand_info_data: brand.brand_info_data,
                            target_audience_data: brand.target_audience_data,
                            competition_data: brand.competition_data
                        },
                        conceptSpecificPrompt: concept.ai_custom_prompt || '',
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
                            'body_content_structured_scenes',
                            'cta_script',
                            'cta_text_overlay'
                        ]
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
                        const errorMessage = (errorData === null || errorData === void 0 ? void 0 : errorData.error) || `Failed to generate AI brief (HTTP ${response.status})`;
                        throw new Error(errorMessage);
                    }
                    const aiResponse = await response.json();
                    // Update concept with AI response
                    const updatedConcept = await updateBriefConcept(Object.assign(Object.assign({}, concept), { id: concept.id, caption_hook_options: aiResponse.caption_hook_options || concept.caption_hook_options, body_content_structured: aiResponse.body_content_structured_scenes || concept.body_content_structured, cta_script: aiResponse.cta_script || concept.cta_script, cta_text_overlay: aiResponse.cta_text_overlay || concept.cta_text_overlay }));
                    setConcepts(prev => prev.map(c => c.id === updatedConcept.id ? updatedConcept : c));
                    successCount++;
                    console.log(`Successfully generated AI brief for concept: ${concept.id} (${successCount}/${concepts.length})`);
                    // Add a small delay between requests to prevent rate limiting
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
                catch (conceptErr) {
                    console.error(`Failed to generate AI brief for concept ${concept.id}:`, conceptErr);
                    failCount++;
                }
            }
            // Set final status message
            setGeneratingConceptId(null);
            if (failCount > 0) {
                if (successCount > 0) {
                    setError(`Generated AI briefs for ${successCount}/${concepts.length} concepts. ${failCount} failed.`);
                }
                else {
                    setError('Failed to generate any AI briefs. Please try again.');
                }
            }
            else {
                // No error if all succeeded
                console.log(`Successfully generated AI briefs for all ${concepts.length} concepts.`);
            }
        }
        catch (err) {
            console.error('Failed to generate AI briefs for all concepts:', err);
            setError(`AI briefs generation failed: ${err.message || 'Unknown error'}`);
        }
        finally {
            setGeneratingAI(false);
            setGeneratingConceptId(null);
        }
    };
    // Add scene to concept
    const handleAddScene = (conceptId) => {
        const concept = concepts.find(c => c.id === conceptId);
        if (!concept)
            return;
        const newScene = {
            scene_title: `Scene ${concept.body_content_structured.length + 1}`,
            script: '',
            visuals: ''
        };
        const updatedConcept = Object.assign(Object.assign({}, concept), { body_content_structured: [...concept.body_content_structured, newScene] });
        handleUpdateConcept(updatedConcept);
    };
    // Remove scene from concept
    const handleRemoveScene = (conceptId, sceneIndex) => {
        const concept = concepts.find(c => c.id === conceptId);
        if (!concept)
            return;
        const updatedConcept = Object.assign(Object.assign({}, concept), { body_content_structured: concept.body_content_structured.filter((_, i) => i !== sceneIndex) });
        handleUpdateConcept(updatedConcept);
    };
    // Update scene in concept
    const handleUpdateScene = (conceptId, sceneIndex, updatedScene) => {
        const concept = concepts.find(c => c.id === conceptId);
        if (!concept)
            return;
        const updatedScenes = [...concept.body_content_structured];
        updatedScenes[sceneIndex] = updatedScene;
        const updatedConcept = Object.assign(Object.assign({}, concept), { body_content_structured: updatedScenes });
        handleUpdateConcept(updatedConcept);
    };
    // Move scene up in concept
    const handleMoveSceneUp = (conceptId, sceneIndex) => {
        if (sceneIndex === 0)
            return;
        const concept = concepts.find(c => c.id === conceptId);
        if (!concept)
            return;
        const updatedScenes = [...concept.body_content_structured];
        const temp = updatedScenes[sceneIndex - 1];
        updatedScenes[sceneIndex - 1] = updatedScenes[sceneIndex];
        updatedScenes[sceneIndex] = temp;
        const updatedConcept = Object.assign(Object.assign({}, concept), { body_content_structured: updatedScenes });
        handleUpdateConcept(updatedConcept);
    };
    // Move scene down in concept
    const handleMoveSceneDown = (conceptId, sceneIndex) => {
        const concept = concepts.find(c => c.id === conceptId);
        if (!concept || sceneIndex >= concept.body_content_structured.length - 1)
            return;
        const updatedScenes = [...concept.body_content_structured];
        const temp = updatedScenes[sceneIndex + 1];
        updatedScenes[sceneIndex + 1] = updatedScenes[sceneIndex];
        updatedScenes[sceneIndex] = temp;
        const updatedConcept = Object.assign(Object.assign({}, concept), { body_content_structured: updatedScenes });
        handleUpdateConcept(updatedConcept);
    };
    // Update concept with debounce
    const debouncedUpdateConcept = (concept) => {
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
    const debouncedUpdateScene = (conceptId, sceneIndex, updatedScene) => {
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
        const promptMap = {};
        const captionHooksMap = {};
        const ctaScriptMap = {};
        const ctaTextOverlayMap = {};
        const scenesMap = {};
        const clickupLinksMap = {};
        const strategistsMap = {};
        const videoEditorsMap = {};
        const videoInstructionsMap = {};
        const designerInstructionsMap = {};
        concepts.forEach(concept => {
            promptMap[concept.id] = concept.ai_custom_prompt || '';
            captionHooksMap[concept.id] = concept.caption_hook_options || '';
            ctaScriptMap[concept.id] = concept.cta_script || '';
            ctaTextOverlayMap[concept.id] = concept.cta_text_overlay || '';
            scenesMap[concept.id] = [...(concept.body_content_structured || [])];
            clickupLinksMap[concept.id] = concept.clickup_id || '';
            strategistsMap[concept.id] = concept.strategist || '';
            videoEditorsMap[concept.id] = concept.video_editor || '';
            videoInstructionsMap[concept.id] = concept.videoInstructions || '';
            designerInstructionsMap[concept.id] = concept.designerInstructions || '';
        });
        setLocalPrompts(promptMap);
        setLocalCaptionHooks(captionHooksMap);
        setLocalCtaScript(ctaScriptMap);
        setLocalCtaTextOverlay(ctaTextOverlayMap);
        setLocalScenes(scenesMap);
        setLocalClickupLinks(clickupLinksMap);
        setLocalStrategists(strategistsMap);
        setLocalVideoEditors(videoEditorsMap);
        setLocalVideoInstructions(videoInstructionsMap);
        setLocalDesignerInstructions(designerInstructionsMap);
    }, [concepts]);
    // Debug prompt for a concept
    const handleDebugPrompt = async (conceptId) => {
        var _a, _b;
        if (!brand || !(user === null || user === void 0 ? void 0 : user.id))
            return;
        const concept = concepts.find(c => c.id === conceptId);
        if (!concept)
            return;
        // Use the local state value for the custom prompt
        const customPrompt = localPrompts[conceptId] || concept.ai_custom_prompt || '';
        // Construct the request object that would be sent to the API
        const request = {
            brandContext: {
                brand_info_data: brand.brand_info_data,
                target_audience_data: brand.target_audience_data,
                competition_data: brand.competition_data
            },
            conceptSpecificPrompt: customPrompt, // Use the local value
            conceptCurrentData: {
                caption_hook_options: localCaptionHooks[conceptId] || concept.caption_hook_options || '',
                body_content_structured: localScenes[conceptId] || concept.body_content_structured || [],
                cta_script: localCtaScript[conceptId] || concept.cta_script || '',
                cta_text_overlay: localCtaTextOverlay[conceptId] || concept.cta_text_overlay || ''
            },
            media: {
                url: concept.media_url || '',
                type: concept.media_type || ''
            },
            desiredOutputFields: [
                'caption_hook_options',
                'body_content_structured_scenes',
                'cta_script',
                'cta_text_overlay'
            ]
        };
        // Simulate the prompt construction similar to what happens in the API route
        const brandContextStr = JSON.stringify(request.brandContext, null, 2);
        const currentDataStr = request.conceptCurrentData ? JSON.stringify(request.conceptCurrentData, null, 2) : 'No current data provided';
        const fieldsStr = request.desiredOutputFields.join(', ');
        // Get media information - update to show that binary data is now sent
        const hasMedia = request.media && request.media.url;
        const mediaInfo = hasMedia ?
            `MEDIA INFORMATION:
Type: ${((_a = request.media) === null || _a === void 0 ? void 0 : _a.type) || 'unknown'}
URL: ${(_b = request.media) === null || _b === void 0 ? void 0 : _b.url}

NOTE: In the actual API request, the media file is downloaded and sent as binary data directly to Gemini, 
allowing it to properly analyze images and videos. This is just a text representation for debugging purposes.` :
            'No media provided for this concept.';
        // Enhance custom prompt importance
        let enhancedCustomPrompt = request.conceptSpecificPrompt || "";
        if (enhancedCustomPrompt) {
            // Make custom prompt stand out more by formatting it
            enhancedCustomPrompt = `IMPORTANT INSTRUCTION: ${enhancedCustomPrompt.toUpperCase()}`;
        }
        // Define the system instruction and user prompt - same as in the API
        const systemPrompt = `You are an expert advertising strategist and copywriter specializing in direct response marketing. 
Given the brand context (positioning, target audience, competitors), concept prompt, and media (if provided), generate ad creative components that specifically relate to the media content.

IMPORTANT: Your response MUST be valid JSON and nothing else. Format:
{
  "caption_hook_options": "A string with multiple options for caption hooks (with emojis)",
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
        const userPrompt = `${enhancedCustomPrompt ? `${enhancedCustomPrompt}\n\n` : ''}
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
        if (!batch)
            return;
        try {
            setSharingInProgress(true);
            setShareSuccess(false);
            const shareSettings = {
                is_editable: shareIsEditable,
                expires_at: null // No expiration
            };
            const shareResult = await shareBriefBatch(batch.id, 'link', shareSettings);
            setShareLink(shareResult.share_url);
            setShareSuccess(true);
        }
        catch (err) {
            console.error('Failed to share batch:', err);
            setError('Failed to create share link. Please try again.');
        }
        finally {
            setSharingInProgress(false);
        }
    };
    // Share batch via email
    const handleShareBatchViaEmail = async () => {
        if (!batch || !shareEmail)
            return;
        try {
            setSharingInProgress(true);
            setShareSuccess(false);
            const shareSettings = {
                is_editable: shareIsEditable,
                expires_at: null, // No expiration
                email: shareEmail
            };
            await shareBriefBatch(batch.id, 'email', shareSettings);
            setShareSuccess(true);
            setShareEmail('');
        }
        catch (err) {
            console.error('Failed to share batch via email:', err);
            setError('Failed to share via email. Please try again.');
        }
        finally {
            setSharingInProgress(false);
        }
    };
    // Share concept via link
    const handleShareConceptViaLink = async () => {
        if (!sharingConceptId)
            return;
        try {
            setSharingInProgress(true);
            setShareSuccess(false);
            const shareSettings = {
                is_editable: false, // Concepts are always view-only when shared individually
                expires_at: null // No expiration
            };
            const shareResult = await shareBriefConcept(sharingConceptId, 'link', shareSettings);
            setShareLink(shareResult.share_url);
            setShareSuccess(true);
        }
        catch (err) {
            console.error('Failed to share concept:', err);
            setError('Failed to create share link. Please try again.');
        }
        finally {
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
    if (loading) {
        return (<div className="flex justify-center items-center min-h-[200px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary-600"/>
            </div>);
    }
    if (!brand || !batch) {
        return (<div className="p-6">
                <Alert>
                    <AlertDescription>Batch not found.</AlertDescription>
                </Alert>
                <Link href={`/app/powerbrief/${brandId}`}>
                    <Button className="mt-4">
                        <ArrowLeft className="h-4 w-4 mr-2"/>
                        Back to Brand
                    </Button>
                </Link>
            </div>);
    }
    return (<div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
                    <Link href={`/app/powerbrief/${brandId}`}>
                        <Button variant="outline">
                            <ArrowLeft className="h-4 w-4 mr-2"/>
                            Back to Brand
                        </Button>
                    </Link>
                    <h1 className="text-2xl font-bold">{batch.name}</h1>
                </div>
                <div className="flex space-x-2">
                    <Button variant="outline" onClick={() => setShowBatchSettingsDialog(true)}>
                        Batch Settings
                    </Button>
                    <Button variant="outline" onClick={() => setShowShareBatchDialog(true)}>
                        <Share2 className="h-4 w-4 mr-2"/>
                        Share Batch
                    </Button>
                    <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setShowDeleteBatchDialog(true)}>
                        <Trash2 className="h-4 w-4 mr-2"/>
                        Delete Batch
                    </Button>
                    <Button className="bg-red-600 text-white hover:bg-red-700" onClick={handleGenerateAllAI} disabled={generatingAI || concepts.length === 0}>
                        {generatingAI ? (<>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin"/>
                                Generating...
                            </>) : (<>
                                <Sparkles className="h-4 w-4 mr-2"/>
                                EZ - BRIEF - ALL
                            </>)}
                    </Button>
                    <Button className="bg-green-600 text-white hover:bg-green-700" onClick={() => {
            console.log("EZ UPLOAD: Button clicked, opening file selector");
            if (multipleFileInputRef.current) {
                multipleFileInputRef.current.click();
            }
            else {
                console.error("EZ UPLOAD: File input reference is null");
                setError("Cannot open file selector. Please try again.");
            }
        }} disabled={generatingAI}>
                        {generatingAI ? (<>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin"/>
                                Uploading...
                            </>) : (<>
                                <FileUp className="h-4 w-4 mr-2"/>
                                EZ UPLOAD
                            </>)}
                    </Button>
                </div>
            </div>
            
            {error && (<Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>)}
            
            <div className="flex flex-col space-y-4">
                {/* Concept Cards with scroll indicators */}
                <div className="relative">
                    <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-12 h-full bg-gradient-to-r from-background to-transparent z-10 pointer-events-none"></div>
                    
                    <div className="flex overflow-x-auto pb-4 space-x-6 hide-scrollbar" style={{ scrollbarWidth: 'none', minHeight: "750px" }}>
                        {concepts.map((concept) => (<Card key={concept.id} className="min-w-[350px] max-w-[350px] flex-shrink-0">
                                <CardHeader className="relative">
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="text-base">
                                            {concept.concept_title}
                                        </CardTitle>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={(e) => {
                e.stopPropagation();
                handleDeleteConcept(concept.id);
            }} disabled={savingConceptId === concept.id}>
                                            {savingConceptId === concept.id ? (<Loader2 className="h-4 w-4 animate-spin"/>) : (<X className="h-4 w-4"/>)}
                                        </Button>
                                    </div>
                                    
                                    {/* ClickUp ID Field */}
                                    <div className="mt-2">
                                        <label className="block text-xs font-medium mb-1">ClickUp ID:</label>
                                        <Input value={localClickupLinks[concept.id] || ''} onChange={(e) => {
                setLocalClickupLinks(prev => (Object.assign(Object.assign({}, prev), { [concept.id]: e.target.value })));
                const updatedConcept = Object.assign(Object.assign({}, concept), { clickup_id: e.target.value });
                debouncedUpdateConcept(updatedConcept);
            }} onBlur={() => {
                if (saveTimeoutRef.current) {
                    clearTimeout(saveTimeoutRef.current);
                    saveTimeoutRef.current = null;
                }
                const updatedConcept = Object.assign(Object.assign({}, concept), { clickup_id: localClickupLinks[concept.id] || '' });
                handleUpdateConcept(updatedConcept);
            }} placeholder="Enter ClickUp ID" className="text-sm"/>
                                    </div>
                                    
                                    {/* ClickUp Link Field */}
                                    <div className="mt-2">
                                        <label className="block text-xs font-medium mb-1">ClickUp Link:</label>
                                        <div className="flex">
                                            {editingClickupLink === concept.id ? (<div className="flex w-full">
                                                    <Input value={concept.clickup_link || ''} onChange={(e) => {
                    const updatedConcept = Object.assign(Object.assign({}, concept), { clickup_link: e.target.value });
                    debouncedUpdateConcept(updatedConcept);
                }} onBlur={() => {
                    setEditingClickupLink(null);
                    if (saveTimeoutRef.current) {
                        clearTimeout(saveTimeoutRef.current);
                        saveTimeoutRef.current = null;
                    }
                    handleUpdateConcept(concept);
                }} placeholder="Paste ClickUp URL" className="text-sm" autoFocus/>
                                                    <Button size="sm" variant="ghost" onClick={() => setEditingClickupLink(null)} className="ml-1">
                                                        <Check className="h-4 w-4"/>
                                                    </Button>
                                                </div>) : (<div className="flex w-full items-center">
                                                    {concept.clickup_link ? (<a href={concept.clickup_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm truncate flex-1">
                                                            {concept.clickup_link}
                                                        </a>) : (<span className="text-gray-500 text-sm italic flex-1">No link added</span>)}
                                                    <Button size="sm" variant="ghost" onClick={() => setEditingClickupLink(concept.id)}>
                                                        <Pencil className="h-3 w-3"/>
                                                    </Button>
                                                </div>)}
                                        </div>
                                    </div>
                                    
                                    {/* Status Dropdown */}
                                    <div className="mt-2">
                                        <label className="block text-xs font-medium mb-1" id={`status-label-${concept.id}`}>Status:</label>
                                        <select value={concept.status || ''} onChange={(e) => {
                const updatedConcept = Object.assign(Object.assign({}, concept), { status: e.target.value });
                handleUpdateConcept(updatedConcept);
            }} className="w-full p-2 text-sm border rounded" aria-labelledby={`status-label-${concept.id}`}>
                                            <option value="">Select Status</option>
                                            <option value="BRIEFING IN PROGRESS">BRIEFING IN PROGRESS</option>
                                            <option value="BRIEF REVIEW">BRIEF REVIEW</option>
                                            <option value="READY FOR DESIGNER">READY FOR DESIGNER</option>
                                            <option value="READY FOR EDITOR">READY FOR EDITOR</option>
                                        </select>
                                    </div>
                                    
                                    {/* Strategist Field */}
                                    <div className="mt-2">
                                        <label className="block text-xs font-medium mb-1">Strategist:</label>
                                        <Input value={localStrategists[concept.id] || ''} onChange={(e) => {
                // Only update local state during typing
                setLocalStrategists(prev => (Object.assign(Object.assign({}, prev), { [concept.id]: e.target.value })));
            }} onBlur={() => {
                // Save to database only when field loses focus
                const updatedConcept = Object.assign(Object.assign({}, concept), { strategist: localStrategists[concept.id] || '' });
                handleUpdateConcept(updatedConcept);
            }} placeholder="Enter strategist name" className="text-sm"/>
                                    </div>
                                    
                                    {/* Video Editor/Designer Field */}
                                    <div className="mt-2">
                                        <label className="block text-xs font-medium mb-1">Video Editor/Designer:</label>
                                        <Input value={localVideoEditors[concept.id] || ''} onChange={(e) => {
                // Only update local state during typing
                setLocalVideoEditors(prev => (Object.assign(Object.assign({}, prev), { [concept.id]: e.target.value })));
            }} onBlur={() => {
                // Save to database only when field loses focus
                const updatedConcept = Object.assign(Object.assign({}, concept), { video_editor: localVideoEditors[concept.id] || '' });
                handleUpdateConcept(updatedConcept);
            }} placeholder="Enter editor/designer name" className="text-sm"/>
                                    </div>
                                    
                                    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
                                        {concept.status && (<div className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                                                Status: {concept.status}
                                            </div>)}
                                        {concept.strategist && (<div className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                                                Strategist: {concept.strategist}
                                            </div>)}
                                        {concept.video_editor && (<div className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded">
                                                Editor: {concept.video_editor}
                                            </div>)}
                                    </div>
                                    
                                    {/* Share button for individual concept */}
                                    <div className="flex justify-end mt-2">
                                        <Button variant="outline" size="sm" onClick={() => {
                setSharingConceptId(concept.id);
                setShowShareConceptDialog(true);
            }}>
                                            <Share2 className="h-3 w-3 mr-1"/>
                                            Share
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Media Preview */}
                                    <div className="h-[150px] bg-gray-100 rounded flex items-center justify-center cursor-pointer" onClick={(e) => {
                e.stopPropagation();
                if (fileInputRef.current) {
                    fileInputRef.current.setAttribute('data-concept-id', concept.id);
                    fileInputRef.current.click();
                }
            }}>
                                        {concept.media_url ? (concept.media_type === 'video' ? (<video src={concept.media_url} controls className="h-full w-full object-contain"/>) : (<img src={concept.media_url} alt="Concept media" className="h-full w-full object-contain"/>)) : (<p className="text-gray-500">Upload video/image</p>)}
                                    </div>
                                    
                                    {/* AI Prompt */}
                                    <div>
                                        <Textarea placeholder="Custom prompt here..." value={localPrompts[concept.id] || ''} onChange={(e) => {
                // Update local state immediately for responsive typing
                setLocalPrompts(prev => (Object.assign(Object.assign({}, prev), { [concept.id]: e.target.value })));
                // Debounce the actual save operation
                const updatedConcept = Object.assign(Object.assign({}, concept), { ai_custom_prompt: e.target.value });
                debouncedUpdateConcept(updatedConcept);
            }} onBlur={() => {
                // Save immediately on blur (when user tabs out or clicks elsewhere)
                if (saveTimeoutRef.current) {
                    clearTimeout(saveTimeoutRef.current);
                    saveTimeoutRef.current = null;
                }
                const updatedConcept = Object.assign(Object.assign({}, concept), { ai_custom_prompt: localPrompts[concept.id] || '' });
                handleUpdateConcept(updatedConcept);
            }} rows={3} className="text-sm"/>
                                    </div>
                                    
                                    {/* AI Button */}
                                    {concept.media_url && (<Button size="sm" className="ml-2 bg-primary-600 text-white hover:bg-primary-700 flex items-center" disabled={generatingConceptId === concept.id} onClick={() => handleGenerateAI(concept.id)}>
                                            {generatingConceptId === concept.id ? (<>
                                                    <Loader2 className="h-4 w-4 mr-2 animate-spin"/>
                                                    Generating...
                                                </>) : (<>
                                                    <Sparkles className="h-4 w-4 mr-2"/>
                                                    Generate AI
                                                </>)}
                                        </Button>)}
                                    
                                    {/* Debug Prompt Button */}
                                    <Button size="sm" className="ml-2 bg-gray-500 text-white hover:bg-gray-600 flex items-center" onClick={() => handleDebugPrompt(concept.id)}>
                                        <Bug className="h-4 w-4 mr-2"/>
                                        Debug Prompt
                                    </Button>
                                    
                                    {/* Caption Hooks */}
                                    <div>
                                        <h3 className="font-medium text-sm mb-1">Caption Hook options (with emojis)</h3>
                                        <Textarea value={localCaptionHooks[concept.id] || ''} onChange={(e) => {
                // Update local state immediately for responsive typing
                setLocalCaptionHooks(prev => (Object.assign(Object.assign({}, prev), { [concept.id]: e.target.value })));
                // Debounce the actual save operation
                const updatedConcept = Object.assign(Object.assign({}, concept), { caption_hook_options: e.target.value });
                debouncedUpdateConcept(updatedConcept);
            }} onBlur={() => {
                // Save immediately on blur
                if (saveTimeoutRef.current) {
                    clearTimeout(saveTimeoutRef.current);
                    saveTimeoutRef.current = null;
                }
                const updatedConcept = Object.assign(Object.assign({}, concept), { caption_hook_options: localCaptionHooks[concept.id] || '' });
                handleUpdateConcept(updatedConcept);
            }} placeholder="Enter caption hook options with emojis" rows={3} className="text-sm"/>
                                    </div>
                                    
                                    {/* Body Content */}
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <h3 className="font-medium text-sm">Body (Script & Visual Recommendations)</h3>
                                            <Button variant="outline" size="sm" onClick={(e) => {
                e.stopPropagation();
                handleAddScene(concept.id);
            }}>
                                                <Plus className="h-3 w-3 mr-1"/>
                                                Add Scene
                                            </Button>
                                        </div>
                                        
                                        {concept.body_content_structured.length === 0 ? (<div className="p-4 bg-gray-50 rounded text-sm text-gray-500 text-center">
                                                No scenes yet. Add a scene or use AI to generate content.
                                            </div>) : (<div className="space-y-4">
                                                {(localScenes[concept.id] || []).map((scene, index) => (<div key={index} className="p-4 border rounded space-y-2">
                                                        <div className="flex justify-between items-center">
                                                            <Input value={scene.scene_title} onChange={(e) => {
                        const updatedScenes = [...(localScenes[concept.id] || [])];
                        updatedScenes[index] = Object.assign(Object.assign({}, scene), { scene_title: e.target.value });
                        // Update local state
                        setLocalScenes(prev => (Object.assign(Object.assign({}, prev), { [concept.id]: updatedScenes })));
                        // Debounce save
                        debouncedUpdateScene(concept.id, index, updatedScenes[index]);
                    }} onBlur={() => {
                        if (saveTimeoutRef.current) {
                            clearTimeout(saveTimeoutRef.current);
                            saveTimeoutRef.current = null;
                        }
                        handleUpdateScene(concept.id, index, (localScenes[concept.id] || [])[index]);
                    }} placeholder="Scene Title (optional)" className="text-sm font-medium"/>
                                                            <div className="flex space-x-1">
                                                                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={index === 0} onClick={(e) => {
                        e.stopPropagation();
                        handleMoveSceneUp(concept.id, index);
                    }}>
                                                                    <MoveUp className="h-4 w-4"/>
                                                                </Button>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={index === concept.body_content_structured.length - 1} onClick={(e) => {
                        e.stopPropagation();
                        handleMoveSceneDown(concept.id, index);
                    }}>
                                                                    <MoveDown className="h-4 w-4"/>
                                                                </Button>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveScene(concept.id, index);
                    }}>
                                                                    <X className="h-4 w-4"/>
                                                                </Button>
                                                            </div>
                                                        </div>
                                                        
                                                        <div>
                                                            <label className="block text-xs font-medium mb-1">Script:</label>
                                                            <Textarea value={scene.script} onChange={(e) => {
                        const updatedScenes = [...(localScenes[concept.id] || [])];
                        updatedScenes[index] = Object.assign(Object.assign({}, scene), { script: e.target.value });
                        // Update local state
                        setLocalScenes(prev => (Object.assign(Object.assign({}, prev), { [concept.id]: updatedScenes })));
                        // Debounce save
                        debouncedUpdateScene(concept.id, index, updatedScenes[index]);
                    }} onBlur={() => {
                        if (saveTimeoutRef.current) {
                            clearTimeout(saveTimeoutRef.current);
                            saveTimeoutRef.current = null;
                        }
                        handleUpdateScene(concept.id, index, (localScenes[concept.id] || [])[index]);
                    }} placeholder="Enter script content" rows={3} className="text-sm"/>
                                                        </div>
                                                        
                                                        <div>
                                                            <label className="block text-xs font-medium mb-1">Visuals:</label>
                                                            <Textarea value={scene.visuals} onChange={(e) => {
                        const updatedScenes = [...(localScenes[concept.id] || [])];
                        updatedScenes[index] = Object.assign(Object.assign({}, scene), { visuals: e.target.value });
                        // Update local state
                        setLocalScenes(prev => (Object.assign(Object.assign({}, prev), { [concept.id]: updatedScenes })));
                        // Debounce save
                        debouncedUpdateScene(concept.id, index, updatedScenes[index]);
                    }} onBlur={() => {
                        if (saveTimeoutRef.current) {
                            clearTimeout(saveTimeoutRef.current);
                            saveTimeoutRef.current = null;
                        }
                        handleUpdateScene(concept.id, index, (localScenes[concept.id] || [])[index]);
                    }} placeholder="Describe visuals for this scene" rows={3} className="text-sm"/>
                                                        </div>
                                                    </div>))}
                                            </div>)}
                                    </div>
                                    
                                    {/* CTA Section */}
                                    <div className="space-y-2">
                                        <h3 className="font-medium text-sm">CTA (Call to Action)</h3>
                                        
                                        <div>
                                            <label className="block text-xs font-medium mb-1">Script:</label>
                                            <Textarea value={localCtaScript[concept.id] || ''} onChange={(e) => {
                // Update local state immediately for responsive typing
                setLocalCtaScript(prev => (Object.assign(Object.assign({}, prev), { [concept.id]: e.target.value })));
                // Debounce the actual save operation
                const updatedConcept = Object.assign(Object.assign({}, concept), { cta_script: e.target.value });
                debouncedUpdateConcept(updatedConcept);
            }} onBlur={() => {
                // Save immediately on blur
                if (saveTimeoutRef.current) {
                    clearTimeout(saveTimeoutRef.current);
                    saveTimeoutRef.current = null;
                }
                const updatedConcept = Object.assign(Object.assign({}, concept), { cta_script: localCtaScript[concept.id] || '' });
                handleUpdateConcept(updatedConcept);
            }} placeholder="Enter CTA script" rows={2} className="text-sm"/>
                                        </div>
                                        
                                        <div>
                                            <label className="block text-xs font-medium mb-1">Text overlay:</label>
                                            <Input value={localCtaTextOverlay[concept.id] || ''} onChange={(e) => {
                // Update local state immediately for responsive typing
                setLocalCtaTextOverlay(prev => (Object.assign(Object.assign({}, prev), { [concept.id]: e.target.value })));
                // Debounce the actual save operation
                const updatedConcept = Object.assign(Object.assign({}, concept), { cta_text_overlay: e.target.value });
                debouncedUpdateConcept(updatedConcept);
            }} onBlur={() => {
                // Save immediately on blur
                if (saveTimeoutRef.current) {
                    clearTimeout(saveTimeoutRef.current);
                    saveTimeoutRef.current = null;
                }
                const updatedConcept = Object.assign(Object.assign({}, concept), { cta_text_overlay: localCtaTextOverlay[concept.id] || '' });
                handleUpdateConcept(updatedConcept);
            }} placeholder="Enter text overlay" className="text-sm"/>
                                        </div>
                                    </div>
                                    
                                    {/* Creative Instructions Section */}
                                    <div className="space-y-2 mt-4 pt-4 border-t border-gray-100">
                                        <h3 className="font-medium text-sm">Creative Instructions</h3>
                                        
                                        <div>
                                            <label className="block text-xs font-medium mb-1">Video Editor Instructions:</label>
                                            <Textarea value={localVideoInstructions[concept.id] || ''} onChange={(e) => {
                // Update local state immediately for responsive typing
                setLocalVideoInstructions(prev => (Object.assign(Object.assign({}, prev), { [concept.id]: e.target.value })));
                // Debounce the actual save operation
                const updatedConcept = Object.assign(Object.assign({}, concept), { videoInstructions: e.target.value });
                debouncedUpdateConcept(updatedConcept);
            }} onBlur={() => {
                // Save immediately on blur
                if (saveTimeoutRef.current) {
                    clearTimeout(saveTimeoutRef.current);
                    saveTimeoutRef.current = null;
                }
                const updatedConcept = Object.assign(Object.assign({}, concept), { videoInstructions: localVideoInstructions[concept.id] || '' });
                handleUpdateConcept(updatedConcept);
            }} placeholder="Instructions for video editors... e.g.&#10;- Use AI voiceover from ElevenLabs&#10;- Add B-roll footage&#10;- Logo at 10-15% opacity&#10;- Add captions&#10;- Add light background music" rows={4} className="text-sm"/>
                                        </div>
                                        
                                        <div>
                                            <label className="block text-xs font-medium mb-1">Designer Instructions (for Images):</label>
                                            <Textarea value={localDesignerInstructions[concept.id] || ''} onChange={(e) => {
                // Update local state immediately for responsive typing
                setLocalDesignerInstructions(prev => (Object.assign(Object.assign({}, prev), { [concept.id]: e.target.value })));
                // Debounce the actual save operation
                const updatedConcept = Object.assign(Object.assign({}, concept), { designerInstructions: e.target.value });
                debouncedUpdateConcept(updatedConcept);
            }} onBlur={() => {
                // Save immediately on blur
                if (saveTimeoutRef.current) {
                    clearTimeout(saveTimeoutRef.current);
                    saveTimeoutRef.current = null;
                }
                const updatedConcept = Object.assign(Object.assign({}, concept), { designerInstructions: localDesignerInstructions[concept.id] || '' });
                handleUpdateConcept(updatedConcept);
            }} placeholder="Instructions for designers creating image assets..." rows={4} className="text-sm"/>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>))}
                        
                        {/* Add Concept Card */}
                        <div className="min-w-[350px] max-w-[350px] flex-shrink-0 border-2 border-dashed rounded-lg h-[600px] flex items-center justify-center cursor-pointer hover:bg-gray-50" onClick={handleCreateConcept}>
                            <div className="text-center">
                                <Plus className="h-8 w-8 mx-auto text-gray-400 mb-2"/>
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
                        <Button variant="outline" onClick={() => setShowDeleteBatchDialog(false)} disabled={deletingBatch}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteBatch} disabled={deletingBatch}>
                            {deletingBatch ? (<>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin"/>
                                    Deleting...
                                </>) : (<>
                                    <Trash2 className="h-4 w-4 mr-2"/>
                                    Delete Batch
                                </>)}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            {/* Hidden File Input for Single Upload */}
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" aria-label="Upload media file" title="Upload media file" onChange={(e) => {
            var _a;
            if ((_a = e.target.files) === null || _a === void 0 ? void 0 : _a[0]) {
                // Get the concept ID from the data attribute set when clicking upload
                const conceptId = e.target.getAttribute('data-concept-id');
                if (conceptId) {
                    handleUploadMedia(e.target.files[0], conceptId);
                    e.target.value = ''; // Reset input
                }
                else if (activeConceptId) {
                    handleUploadMedia(e.target.files[0], activeConceptId);
                    e.target.value = ''; // Reset input
                }
            }
        }}/>
            
            {/* Hidden File Input for Bulk Upload */}
            <input type="file" ref={multipleFileInputRef} className="hidden" accept="image/*,video/*" multiple={true} aria-label="Bulk upload media files" title="Bulk upload media files" onChange={(e) => {
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
                    console.log(`EZ UPLOAD: Selected file ${i + 1}: ${file.name} (${file.type}, ${Math.round(file.size / 1024)}KB)`);
                }
                // Start the bulk upload process
                console.log("EZ UPLOAD: Starting bulk upload process...");
                handleBulkUploadMedia(e.target.files);
                // Reset the file input to allow reselection of the same files
                e.target.value = '';
                console.log("EZ UPLOAD: File input has been reset");
            }
            catch (err) {
                console.error("EZ UPLOAD: Error in file input handler:", err);
                setError(`File selection error: ${err instanceof Error ? err.message : 'Unknown error'}`);
                // Make sure to reset the file input even if an error occurs
                if (e.target) {
                    e.target.value = '';
                }
            }
        }}/>
            
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
                        <Button variant="outline" size="sm" className="absolute top-2 right-2 bg-gray-800 hover:bg-gray-700" onClick={handleCopyPrompt}>
                            {copied ? (<span className="text-green-400 flex items-center">
                                    <Check className="h-3 w-3 mr-1"/>
                                    Copied!
                                </span>) : (<span className="text-gray-300 flex items-center">
                                    <Copy className="h-3 w-3 mr-1"/>
                                    Copy
                                </span>)}
                        </Button>
                    </div>
                    
                    <DialogFooter className="mt-4">
                        <Button variant="outline" onClick={() => setShowPromptDebugDialog(false)}>
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
                                <Input type="number" min="1" value={startingConceptNumber} onChange={(e) => setStartingConceptNumber(parseInt(e.target.value) || 1)}/>
                                <Button onClick={() => updateConceptNumbering(startingConceptNumber)}>
                                    Apply
                                </Button>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">This will renumber all concepts in the batch, starting from this number</p>
                        </div>
                    </div>
                    
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowBatchSettingsDialog(false)}>
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
                            <input type="checkbox" id="shareEditable" checked={shareIsEditable} onChange={(e) => setShareIsEditable(e.target.checked)} className="h-4 w-4 rounded border-gray-300"/>
                            <label htmlFor="shareEditable" className="text-sm font-medium text-gray-700">
                                Allow editing
                            </label>
                        </div>
                        
                        <div className="space-y-2">
                            <h3 className="text-sm font-medium">Share via Link</h3>
                            {shareSuccess && shareLink ? (<div className="flex items-center space-x-2">
                                    <Input value={shareLink} readOnly className="flex-1"/>
                                    <Button size="sm" onClick={handleCopyShareLink}>
                                        {copied ? (<Check className="h-4 w-4"/>) : (<Copy className="h-4 w-4"/>)}
                                    </Button>
                                </div>) : (<Button onClick={handleShareBatchViaLink} disabled={sharingInProgress} className="w-full">
                                    {sharingInProgress ? (<Loader2 className="h-4 w-4 mr-2 animate-spin"/>) : (<LinkIcon className="h-4 w-4 mr-2"/>)}
                                    Create Link
                                </Button>)}
                        </div>
                        
                        <div className="space-y-2 pt-2 border-t">
                            <h3 className="text-sm font-medium">Invite via Email</h3>
                            <div className="flex space-x-2">
                                <Input type="email" placeholder="Email address" value={shareEmail} onChange={(e) => setShareEmail(e.target.value)} className="flex-1"/>
                                <Button onClick={handleShareBatchViaEmail} disabled={sharingInProgress || !shareEmail}>
                                    {sharingInProgress ? (<Loader2 className="h-4 w-4 mr-2 animate-spin"/>) : (<Mail className="h-4 w-4 mr-2"/>)}
                                    Invite
                                </Button>
                            </div>
                            {shareSuccess && !shareLink && (<p className="text-sm text-green-600">Invitation sent!</p>)}
                        </div>
                    </div>
                    
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowShareBatchDialog(false)}>
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
                        
                        {shareSuccess && shareLink ? (<div className="flex items-center space-x-2">
                                <Input value={shareLink} readOnly className="flex-1"/>
                                <Button size="sm" onClick={handleCopyShareLink}>
                                    {copied ? (<Check className="h-4 w-4"/>) : (<Copy className="h-4 w-4"/>)}
                                </Button>
                            </div>) : (<Button onClick={handleShareConceptViaLink} disabled={sharingInProgress} className="w-full">
                                {sharingInProgress ? (<Loader2 className="h-4 w-4 mr-2 animate-spin"/>) : (<LinkIcon className="h-4 w-4 mr-2"/>)}
                                Create Link
                            </Button>)}
                    </div>
                    
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowShareConceptDialog(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>);
}
