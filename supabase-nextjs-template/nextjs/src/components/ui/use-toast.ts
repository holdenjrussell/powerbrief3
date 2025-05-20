// Adapted from https://ui.shadcn.com/docs/components/toast
import { useState, useEffect, useContext, createContext } from 'react'

type ToastType = {
  title?: string
  description?: string
  variant?: 'default' | 'destructive'
}

type ToastContextType = {
  toast: (toast: ToastType) => void
  dismiss: () => void
  toasts: ToastType[]
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastType[]>([])

  const toast = (toast: ToastType) => {
    setToasts((prev) => [...prev, toast])
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t !== toast))
    }, 5000)
  }

  const dismiss = () => {
    setToasts([])
  }

  return (
    <ToastContext.Provider value={{ toast, dismiss, toasts }}>
      {children}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  
  return context
}

export function toast(props: ToastType) {
  // This is a simplified version for our example
  // In a real app, this would use a more sophisticated approach
  // Like dispatching an event that's caught by the ToastProvider
  console.log('Toast:', props)
  return { id: 1, dismiss: () => {} }
} 