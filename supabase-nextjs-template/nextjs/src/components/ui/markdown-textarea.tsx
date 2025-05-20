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

  // Update the editor content
  useEffect(() => {
    if (editorRef.current && !isEditing) {
      const html = renderHTML(value);
      editorRef.current.innerHTML = html || '<p><br></p>';
    }
  }, [value, isEditing]);

  const handleFocus = (e: React.FocusEvent<HTMLDivElement>) => {
    setIsEditing(true);
    editorRef.current!.innerHTML = value || '';
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    setIsEditing(false);
    const newValue = editorRef.current!.innerText || '';
    onChange(newValue);
    if (onBlur) onBlur(e);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
    
    // After paste, we immediately apply markdown formatting when the user stops typing
    setTimeout(() => {
      const newValue = editorRef.current!.innerText || '';
      onChange(newValue);
      setIsEditing(false);
    }, 100);
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