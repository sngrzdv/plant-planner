import { create } from 'zustand'

export const useConfirmStore = create((set, get) => ({
  open: false,
  title: 'Подтверждение',
  message: '',
  confirmLabel: 'Да',
  cancelLabel: 'Отмена',
  destructive: false,
  resolve: null,

  show: ({
    message,
    title = 'Подтверждение',
    confirmLabel = 'Да',
    cancelLabel = 'Отмена',
    destructive = false,
  }) => new Promise((resolve) => {
    set({
      open: true,
      title,
      message,
      confirmLabel,
      cancelLabel,
      destructive,
      resolve,
    })
  }),

  answer: (value) => {
    const { resolve } = get()
    resolve?.(value)
    set({ open: false, resolve: null, message: '' })
  },
}))

export function confirm(message, options = {}) {
  return useConfirmStore.getState().show({ message, ...options })
}
