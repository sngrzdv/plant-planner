import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { toast } from './toastStore'

const CACHE_TTL_MS = 30 * 60 * 1000
const PLANT_LIST_COLUMNS = 'id, name, category_id, image_url, watering_freq_days, maturation_days, planting_method, days_to_transplant, difficulty, description, scientific_facts'

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

  getPlantsCount: async ({ force = false } = {}) => {
    const state = get()
    if (!force && state.plants.length > 0 && isFresh(state.plantsLoadedAt)) {
      return state.plants.length
    }

    const { count, error } = await supabase
      .from('plants')
      .select('id', { count: 'exact', head: true })

    if (error) {
      console.warn('Plants count fetch failed:', error.message)
      return state.plants.length || 0
    }
    return count || 0
  },

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
      .select(PLANT_LIST_COLUMNS)
      .order('name')
      .then(({ data, error }) => {
        if (error) {
          toast.error(`Не удалось загрузить каталог: ${error.message}`)
          return get().plants
        }
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
        if (error) {
          toast.error(`Не удалось загрузить категории: ${error.message}`)
          return get().categories
        }
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

  preloadReferences: () => {
    const { getPlants, getCategories } = get()
    void getPlants()
    void getCategories()
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
