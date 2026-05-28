import { create } from 'zustand'
import { supabase } from '../lib/supabase'

const CACHE_TTL_MS = 5 * 60 * 1000

function isFresh(timestamp) {
  return Date.now() - timestamp < CACHE_TTL_MS
}

export const useReferenceStore = create((set, get) => ({
  plants: [],
  categories: [],
  plantsLoadedAt: 0,
  categoriesLoadedAt: 0,
  plantsRequest: null,
  categoriesRequest: null,

  getPlants: async ({ force = false } = {}) => {
    const state = get()
    if (!force && state.plants.length > 0 && isFresh(state.plantsLoadedAt)) {
      return state.plants
    }
    if (!force && state.plantsRequest) {
      return state.plantsRequest
    }

    const request = supabase
      .from('plants')
      .select('*')
      .order('name')
      .then(({ data, error }) => {
        if (error) return []
        const plants = data || []
        set({ plants, plantsLoadedAt: Date.now() })
        return plants
      })
      .finally(() => {
        set({ plantsRequest: null })
      })

    set({ plantsRequest: request })
    return request
  },

  getCategories: async ({ force = false } = {}) => {
    const state = get()
    if (!force && state.categories.length > 0 && isFresh(state.categoriesLoadedAt)) {
      return state.categories
    }
    if (!force && state.categoriesRequest) {
      return state.categoriesRequest
    }

    const request = supabase
      .from('plant_categories')
      .select('*')
      .then(({ data, error }) => {
        if (error) return []
        const categories = data || []
        set({ categories, categoriesLoadedAt: Date.now() })
        return categories
      })
      .finally(() => {
        set({ categoriesRequest: null })
      })

    set({ categoriesRequest: request })
    return request
  },

  preloadReferences: async () => {
    const { getPlants, getCategories } = get()
    await Promise.all([getPlants(), getCategories()])
  },

  invalidateReferences: () => {
    set({
      plantsLoadedAt: 0,
      categoriesLoadedAt: 0,
      plantsRequest: null,
      categoriesRequest: null,
    })
  },
}))
