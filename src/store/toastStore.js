import { create } from 'zustand'

let toastId = 0

export const useToastStore = create((set, get) => ({
  toasts: [],

  push: ({ message, type = 'info', duration = 4000 }) => {
    const id = ++toastId
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }))
    setTimeout(() => get().dismiss(id), duration)
    return id
  },

  dismiss: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
  },
}))

export const toast = {
  info: (message) => useToastStore.getState().push({ message, type: 'info' }),
  success: (message) => useToastStore.getState().push({ message, type: 'success' }),
  error: (message) => useToastStore.getState().push({ message, type: 'error', duration: 5000 }),
}
