import React, { useState, useEffect, useRef } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { cn } from '@/lib/utils';

interface MarkdownTextareaProps {
  className?: string;
  value: string;
  onChange: (value: string) => void;
  onFocus?: (e: React.FocusEvent<HTMLDivElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLDivElement>) => void;
  placeholder?: string;
  disabled?: boolean;
}

const MarkdownTextarea = React.forwardRef<
  HTMLDivElement,
  MarkdownTextareaProps
>(({ className, value, onChange, onFocus, onBlur, placeholder, disabled, ...props }, forwardedRef) => {
  const [isEditing, setIsEditing] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const lastValueRef = useRef<string>('');
  
  const combinedRef = (node: HTMLDivElement) => {
    editorRef.current = node;
    if (typeof forwardedRef === 'function') {
      forwardedRef(node);
    } else if (forwardedRef) {
      forwardedRef.current = node;
    }
  };

  // Convert markdown to HTML
  const renderHTML = (markdown: string) => {
    if (!markdown) return '';
    const html = marked.parse(markdown, { breaks: true }) as string;
    return DOMPurify.sanitize(html);
  };

  // Update the editor content only when not editing and value actually changed
  useEffect(() => {
    if (editorRef.current && !isEditing && value !== lastValueRef.current) {
      const html = renderHTML(value);
      editorRef.current.innerHTML = html || '<p><br></p>';
      lastValueRef.current = value;
    }
  }, [value, isEditing]);

  const handleFocus = (e: React.FocusEvent<HTMLDivElement>) => {
    setIsEditing(true);
    // Only set innerHTML to value if it's different from current content
    if (editorRef.current && editorRef.current.innerText !== value) {
      editorRef.current.innerHTML = value || '';
    }
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    setIsEditing(false);
    const newValue = editorRef.current!.innerText || '';
    lastValueRef.current = newValue;
    onChange(newValue);
    if (onBlur) onBlur(e);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    
    // Save cursor position before paste
    const selection = window.getSelection();
    const range = selection?.getRangeAt(0);
    
    // Use execCommand for better cursor handling
    document.execCommand('insertText', false, text);
    
    // Don't automatically exit editing mode on paste - let user continue typing
    const newValue = editorRef.current!.innerText || '';
    onChange(newValue);
  };

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const newValue = editorRef.current!.innerText || '';
    onChange(newValue);
  };

  return (
    <div 
      ref={combinedRef}
      className={cn(
        "min-h-[100px] h-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background overflow-auto",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "prose prose-sm max-w-none relative",
        isEditing ? "whitespace-pre-wrap" : "",
        disabled ? "opacity-50 pointer-events-none" : "",
        !value && !isEditing ? "empty-content" : "",
        className
      )}
      contentEditable={!disabled}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onPaste={handlePaste}
      onInput={handleInput}
      suppressContentEditableWarning={true}
      data-placeholder={placeholder}
      {...props}
    />
  );
});

MarkdownTextarea.displayName = 'MarkdownTextarea';

export default MarkdownTextarea; 