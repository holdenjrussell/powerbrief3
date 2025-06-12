-- Migration: Fix team sync RLS policies and restore access
-- Date: 2025-01-30
-- Description: Fix RLS policies that are blocking access to team sync data

-- First, let's check and fix RLS policies for announcements
DROP POLICY IF EXISTS "Users can view announcements for their brands" ON public.announcements;
CREATE POLICY "Users can view announcements for their brands" ON public.announcements
FOR SELECT USING (
  brand_id IN (
    SELECT id FROM public.brands WHERE user_id = auth.uid()
    UNION
    SELECT brand_id FROM public.brand_shares 
    WHERE shared_with_user_id = auth.uid() 
    AND status = 'accepted'
  )
);

DROP POLICY IF EXISTS "Users can create announcements for their brands" ON public.announcements;
CREATE POLICY "Users can create announcements for their brands" ON public.announcements
FOR INSERT WITH CHECK (
  brand_id IN (
    SELECT id FROM public.brands WHERE user_id = auth.uid()
    UNION
    SELECT brand_id FROM public.brand_shares 
    WHERE shared_with_user_id = auth.uid() 
    AND status = 'accepted'
  )
);

DROP POLICY IF EXISTS "Users can update their own announcements" ON public.announcements;
CREATE POLICY "Users can update their own announcements" ON public.announcements
FOR UPDATE USING (
  user_id = auth.uid() OR
  brand_id IN (
    SELECT id FROM public.brands WHERE user_id = auth.uid()
    UNION
    SELECT brand_id FROM public.brand_shares 
    WHERE shared_with_user_id = auth.uid() 
    AND status = 'accepted'
  )
);

DROP POLICY IF EXISTS "Users can delete their own announcements" ON public.announcements;
CREATE POLICY "Users can delete their own announcements" ON public.announcements
FOR DELETE USING (
  user_id = auth.uid() OR
  brand_id IN (
    SELECT id FROM public.brands WHERE user_id = auth.uid()
  )
);

-- Fix RLS policies for todos
DROP POLICY IF EXISTS "Users can view todos for their brands" ON public.todos;
CREATE POLICY "Users can view todos for their brands" ON public.todos
FOR SELECT USING (
  brand_id IN (
    SELECT id FROM public.brands WHERE user_id = auth.uid()
    UNION
    SELECT brand_id FROM public.brand_shares 
    WHERE shared_with_user_id = auth.uid() 
    AND status = 'accepted'
  )
);

DROP POLICY IF EXISTS "Users can create todos for their brands" ON public.todos;
CREATE POLICY "Users can create todos for their brands" ON public.todos
FOR INSERT WITH CHECK (
  brand_id IN (
    SELECT id FROM public.brands WHERE user_id = auth.uid()
    UNION
    SELECT brand_id FROM public.brand_shares 
    WHERE shared_with_user_id = auth.uid() 
    AND status = 'accepted'
  )
);

DROP POLICY IF EXISTS "Users can update todos for their brands" ON public.todos;
CREATE POLICY "Users can update todos for their brands" ON public.todos
FOR UPDATE USING (
  brand_id IN (
    SELECT id FROM public.brands WHERE user_id = auth.uid()
    UNION
    SELECT brand_id FROM public.brand_shares 
    WHERE shared_with_user_id = auth.uid() 
    AND status = 'accepted'
  )
);

DROP POLICY IF EXISTS "Users can delete todos for their brands" ON public.todos;
CREATE POLICY "Users can delete todos for their brands" ON public.todos
FOR DELETE USING (
  brand_id IN (
    SELECT id FROM public.brands WHERE user_id = auth.uid()
    UNION
    SELECT brand_id FROM public.brand_shares 
    WHERE shared_with_user_id = auth.uid() 
    AND status = 'accepted'
  )
);

-- Fix RLS policies for issues
DROP POLICY IF EXISTS "Users can view issues for their brands" ON public.issues;
CREATE POLICY "Users can view issues for their brands" ON public.issues
FOR SELECT USING (
  brand_id IN (
    SELECT id FROM public.brands WHERE user_id = auth.uid()
    UNION
    SELECT brand_id FROM public.brand_shares 
    WHERE shared_with_user_id = auth.uid() 
    AND status = 'accepted'
  )
);

DROP POLICY IF EXISTS "Users can create issues for their brands" ON public.issues;
CREATE POLICY "Users can create issues for their brands" ON public.issues
FOR INSERT WITH CHECK (
  brand_id IN (
    SELECT id FROM public.brands WHERE user_id = auth.uid()
    UNION
    SELECT brand_id FROM public.brand_shares 
    WHERE shared_with_user_id = auth.uid() 
    AND status = 'accepted'
  )
);

DROP POLICY IF EXISTS "Users can update issues for their brands" ON public.issues;
CREATE POLICY "Users can update issues for their brands" ON public.issues
FOR UPDATE USING (
  brand_id IN (
    SELECT id FROM public.brands WHERE user_id = auth.uid()
    UNION
    SELECT brand_id FROM public.brand_shares 
    WHERE shared_with_user_id = auth.uid() 
    AND status = 'accepted'
  )
);

DROP POLICY IF EXISTS "Users can delete issues for their brands" ON public.issues;
CREATE POLICY "Users can delete issues for their brands" ON public.issues
FOR DELETE USING (
  brand_id IN (
    SELECT id FROM public.brands WHERE user_id = auth.uid()
    UNION
    SELECT brand_id FROM public.brand_shares 
    WHERE shared_with_user_id = auth.uid() 
    AND status = 'accepted'
  )
);

-- Ensure RLS is enabled on all tables
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY; 