-- Migration: Fix team sync permissions for brand sharing
-- Date: 2025-01-31
-- Description: Allow any user with brand access to perform CRUD operations on team sync items

-- Fix Issues table policies
DROP POLICY IF EXISTS "Users can update their own issues" ON public.issues;
DROP POLICY IF EXISTS "Users can delete their own issues" ON public.issues;

CREATE POLICY "Users can update issues for brands they have access to" ON public.issues
FOR UPDATE USING (
  brand_id IN (
    SELECT id FROM public.brands WHERE user_id = auth.uid()
    UNION
    SELECT brand_id FROM public.brand_shares 
    WHERE shared_with_user_id = auth.uid() AND status = 'accepted'
  )
);

CREATE POLICY "Users can delete issues for brands they have access to" ON public.issues
FOR DELETE USING (
  brand_id IN (
    SELECT id FROM public.brands WHERE user_id = auth.uid()
    UNION
    SELECT brand_id FROM public.brand_shares 
    WHERE shared_with_user_id = auth.uid() AND status = 'accepted'
  )
);

-- Fix Todos table policies
DROP POLICY IF EXISTS "Users can update their own todos" ON public.todos;
DROP POLICY IF EXISTS "Users can delete their own todos" ON public.todos;

CREATE POLICY "Users can update todos for brands they have access to" ON public.todos
FOR UPDATE USING (
  brand_id IN (
    SELECT id FROM public.brands WHERE user_id = auth.uid()
    UNION
    SELECT brand_id FROM public.brand_shares 
    WHERE shared_with_user_id = auth.uid() AND status = 'accepted'
  )
);

CREATE POLICY "Users can delete todos for brands they have access to" ON public.todos
FOR DELETE USING (
  brand_id IN (
    SELECT id FROM public.brands WHERE user_id = auth.uid()
    UNION
    SELECT brand_id FROM public.brand_shares 
    WHERE shared_with_user_id = auth.uid() AND status = 'accepted'
  )
); 