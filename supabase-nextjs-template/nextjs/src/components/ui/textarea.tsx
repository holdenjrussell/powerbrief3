import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    const textareaRef = React.useRef<HTMLTextAreaElement>(null)
    const combinedRef = useCombinedRefs(ref, textareaRef)
    
    const adjustHeight = React.useCallback(() => {
      const textarea = textareaRef.current
      if (textarea) {
        // Reset height to auto to get proper scrollHeight
        textarea.style.height = 'auto'
        // Set height to scrollHeight to expand based on content
        textarea.style.height = `${textarea.scrollHeight}px`
      }
    }, [])
    
    React.useEffect(() => {
      adjustHeight()
      // Add resize event listener to handle window resize
      window.addEventListener('resize', adjustHeight)
      return () => window.removeEventListener('resize', adjustHeight)
    }, [adjustHeight])
    
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 overflow-hidden",
          className
        )}
        ref={combinedRef}
        onInput={adjustHeight}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

// Helper function to combine refs
function useCombinedRefs<T>(
  ...refs: Array<React.Ref<T> | undefined>
): React.RefCallback<T> {
  return React.useCallback((element: T) => {
    refs.forEach((ref) => {
      if (!ref) return
      
      if (typeof ref === 'function') {
        ref(element)
      } else {
        (ref as React.MutableRefObject<T>).current = element
      }
    })
  }, [refs])
}

export { Textarea }
