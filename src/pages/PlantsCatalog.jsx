import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { useReferenceStore } from '../store/referenceStore'
import { 
  Search, Sprout, Droplets, Calendar, X, Plus, Heart
} from 'lucide-react'
import Header from '../components/Header'
import PlantImage from '../components/PlantImage'
import AddUserPlant from '../components/AddUserPlant'
import MobileNav from '../components/MobileNav'
import { toast } from '../store/toastStore'
import { confirm } from '../store/confirmStore'
import { uploadPlantImage } from '../services/plantImageStorage'
import FavoriteButton from '../components/FavoriteButton'
import { fetchFavoritePlantIds, togglePlantFavorite } from '../services/plantFavoritesService'

const FAVORITES_SQL = 'supabase/plant_favorites_and_profile_extensions.sql'

export default function PlantsCatalog() {
  const { isAdmin, user } = useAuthStore()
  const [plants, setPlants] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [activeTab, setActiveTab] = useState('catalog')
  const [plantPhotoFile, setPlantPhotoFile] = useState(null)
  const [plantPhotoPreview, setPlantPhotoPreview] = useState(null)
  const [uploadingPlant, setUploadingPlant] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [favoriteIds, setFavoriteIds] = useState(new Set())
  const [catalogFilter, setCatalogFilter] = useState('all')
  const [favoritesError, setFavoritesError] = useState('')
  
  const [newPlant, setNewPlant] = useState({
    name: '', category_id: '', watering_freq_days: 3,
    maturation_days: 60, scientific_facts: '', description: '',
    planting_method: 'direct', days_to_transplant: 0, days_to_harvest: 60
  })
  
  const loadData = useCallback(async () => {
    setLoadError('')
    try {
      const [plantsData, categoriesData] = await Promise.all([
        useReferenceStore.getState().getPlants(),
        useReferenceStore.getState().getCategories(),
      ])

      setCategories(categoriesData || [])
      const categoryById = new Map((categoriesData || []).map((c) => [c.id, c]))
      setPlants(
        (plantsData || []).map((plant) => ({
          ...plant,
          category: categoryById.get(plant.category_id) || null,
        }))
      )
    } catch (err) {
      setLoadError(err.message || 'Не удалось загрузить каталог')
      setPlants([])
      setCategories([])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData()
  }, [loadData])

  useEffect(() => {
    if (!user?.id) {
      setFavoriteIds(new Set())
      return
    }
    fetchFavoritePlantIds(user.id)
      .then(setFavoriteIds)
      .catch((err) => {
        setFavoritesError(err.message || 'Избранное недоступно')
        setFavoriteIds(new Set())
      })
  }, [user?.id])

  async function handleFavoriteToggle(plantId) {
    if (!user?.id) {
      throw new Error('Войдите в аккаунт, чтобы добавить в избранное')
    }
    const added = await togglePlantFavorite(user.id, plantId)
    setFavoriteIds((prev) => {
      const next = new Set(prev)
      if (added) next.add(plantId)
      else next.delete(plantId)
      return next
    })
    return added
  }
  
  function handlePlantPhotoSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPlantPhotoFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setPlantPhotoPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  function resetAddPlantForm() {
    setNewPlant({
      name: '', category_id: '', watering_freq_days: 3,
      maturation_days: 60, scientific_facts: '', description: '',
      planting_method: 'direct', days_to_transplant: 0, days_to_harvest: 60
    })
    setPlantPhotoFile(null)
    setPlantPhotoPreview(null)
  }

  async function addPlant() {
    if (!newPlant.name || !newPlant.category_id) {
      toast.error('Заполните название и категорию')
      return
    }

    setUploadingPlant(true)
    try {
      let imageUrl = null
      if (plantPhotoFile) {
        imageUrl = await uploadPlantImage(plantPhotoFile, { plantName: newPlant.name })
      }

      const { data, error } = await supabase
        .from('plants')
        .insert({ ...newPlant, image_url: imageUrl })
        .select(`*, category:category_id(id, name, icon)`)
        .single()

      if (error) {
        toast.error(`Не удалось добавить растение: ${error.message}`)
        return
      }
      if (!data) return

      toast.success('Растение добавлено')
      setPlants([...plants, data])
      useReferenceStore.getState().invalidateReferences()
      setShowAddModal(false)
      resetAddPlantForm()
    } catch (err) {
      toast.error(err.message || 'Не удалось загрузить фото')
    } finally {
      setUploadingPlant(false)
    }
  }
  
  async function deletePlant(id) {
    const ok = await confirm('Удалить растение? Это действие нельзя отменить.', {
      title: 'Удалить растение',
      confirmLabel: 'Удалить',
      destructive: true,
    })
    if (!ok) return
    const { error } = await supabase.from('plants').delete().eq('id', id)
    if (error) {
      toast.error(`Не удалось удалить: ${error.message}`)
      return
    }
    setPlants(plants.filter(p => p.id !== id))
    useReferenceStore.getState().invalidateReferences()
    toast.success('Растение удалено')
  }
  
  const filteredPlants = plants.filter(plant => {
    const matchesSearch = plant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          plant.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !selectedCategory || plant.category_id === selectedCategory
    const matchesFavorites = catalogFilter !== 'favorites' || favoriteIds.has(plant.id)
    return matchesSearch && matchesCategory && matchesFavorites
  })
  
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  )
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 pb-20 sm:pb-0">
      <Header />
      
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        {favoritesError && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-900">
            Избранное: {favoritesError}. Выполните SQL: <code className="bg-amber-100 px-1 rounded">{FAVORITES_SQL}</code>
          </div>
        )}
        {loadError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span>{loadError}</span>
            <button type="button" onClick={() => { setLoading(true); loadData() }} className="px-4 py-2 bg-white border border-red-200 rounded-lg hover:bg-red-50 font-medium shrink-0">
              Повторить
            </button>
          </div>
        )}
        {/* Заголовок и вкладки */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Sprout className="w-6 h-6 text-green-600" />
              Каталог растений
            </h1>
            <p className="text-sm text-gray-500 mt-1">{plants.length} растений</p>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex bg-gray-100 rounded-xl p-1">
              <button onClick={() => setActiveTab('catalog')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'catalog' ? 'bg-white shadow text-green-700' : 'text-gray-500'
                }`}>
                📚 Каталог
              </button>
              <button onClick={() => setActiveTab('add')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'add' ? 'bg-white shadow text-green-700' : 'text-gray-500'
                }`}>
                ✏️ Своё растение
              </button>
            </div>
            {isAdmin && activeTab === 'catalog' && (
              <button onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-xl hover:bg-green-700 text-sm font-medium transition-colors">
                <Plus className="w-4 h-4" /> Добавить
              </button>
            )}
          </div>
        </div>

        {activeTab === 'catalog' ? (
          <>
            {/* Поиск и фильтры */}
            <div className="bg-white rounded-2xl shadow-sm p-3 mb-4 flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" placeholder="Поиск растений..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setCatalogFilter('all')}
                  className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                    catalogFilter === 'all' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Все
                </button>
                <button
                  type="button"
                  onClick={() => setCatalogFilter('favorites')}
                  className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors flex items-center gap-1 ${
                    catalogFilter === 'favorites' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Heart className={`w-3.5 h-3.5 ${catalogFilter === 'favorites' ? 'fill-current' : ''}`} />
                  Избранное {favoriteIds.size > 0 && `(${favoriteIds.size})`}
                </button>
              </div>
            </div>
            <div className="flex gap-1.5 flex-wrap mb-4">
                <button onClick={() => setSelectedCategory(null)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                    !selectedCategory ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                  Все
                </button>
                {categories.map(cat => (
                  <button key={cat.id} onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors flex items-center gap-1 ${
                      selectedCategory === cat.id ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>
                    <span>{cat.icon}</span>
                    <span className="hidden sm:inline">{cat.name}</span>
                  </button>
                ))}
            </div>
            
            {/* Карточки растений */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredPlants.map(plant => (
                <div key={plant.id} className="bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-all group">
                  <div className="h-44 bg-gray-100 overflow-hidden relative">
                    <PlantImage
                      src={plant.image_url}
                      alt={plant.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      fallbackClassName="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 gap-2"
                    />
                    
                    {/* Бейджи */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      {plant.planting_method === 'seedling' && (
                        <span className="text-[10px] bg-amber-100/90 text-amber-800 px-2 py-0.5 rounded-full backdrop-blur-sm">🌱 Рассада</span>
                      )}
                      {plant.planting_method === 'direct' && (
                        <span className="text-[10px] bg-green-100/90 text-green-800 px-2 py-0.5 rounded-full backdrop-blur-sm">🌍 Прямой посев</span>
                      )}
                    </div>
                    
                    {plant.difficulty && (
                      <div className="absolute top-2 right-12">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full backdrop-blur-sm ${
                          plant.difficulty === 'Легко' ? 'bg-green-100/90 text-green-800' :
                          plant.difficulty === 'Средне' ? 'bg-amber-100/90 text-amber-800' :
                          'bg-red-100/90 text-red-800'
                        }`}>
                          {plant.difficulty}
                        </span>
                      </div>
                    )}

                    <div className="absolute top-2 right-2">
                      <FavoriteButton
                        plantId={plant.id}
                        isFavorite={favoriteIds.has(plant.id)}
                        onToggle={handleFavoriteToggle}
                        size="sm"
                      />
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-800">{plant.name}</h3>
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <span>{plant.category?.icon}</span>
                          <span>{plant.category?.name}</span>
                        </p>
                      </div>
                      {isAdmin && (
                        <button onClick={() => deletePlant(plant.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    
                    <p className="text-xs text-gray-500 mb-3 line-clamp-2">
                      {plant.description || plant.scientific_facts || 'Нет описания'}
                    </p>
                    
                    <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                      <span className="flex items-center gap-1"><Droplets className="w-3.5 h-3.5 text-blue-400" /> раз в {plant.watering_freq_days} дн.</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-amber-400" /> {plant.maturation_days} дн.</span>
                    </div>
                    
                    <Link to={`/plant/${plant.id}`}
                      className="block w-full text-center py-2.5 bg-green-50 text-green-700 rounded-xl hover:bg-green-100 transition-colors text-sm font-medium">
                      Подробнее
                    </Link>
                  </div>
                </div>
              ))}
            </div>
            
            {plants.length === 0 && !loadError && (
              <div className="text-center py-16">
                <Sprout className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-700 mb-2">Каталог пуст</h3>
                <p className="text-gray-500 text-sm">Растения появятся после добавления администратором</p>
              </div>
            )}
            {plants.length > 0 && filteredPlants.length === 0 && (
              <div className="text-center py-16">
                <Sprout className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">
                  {catalogFilter === 'favorites' ? 'В избранном пока пусто' : 'По вашему запросу ничего не найдено'}
                </p>
              </div>
            )}
          </>
        ) : (
          <AddUserPlant />
        )}
      </main>
      
      <MobileNav />
      
      {/* Модалка добавления */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Новое растение</h2>
              <button onClick={() => setShowAddModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Название *</label>
                <input type="text" value={newPlant.name} onChange={e => setNewPlant({...newPlant, name: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl" placeholder="Томат" />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Категория *</label>
                  <select value={newPlant.category_id} onChange={e => setNewPlant({...newPlant, category_id: e.target.value})}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl">
                    <option value="">Выберите</option>
                    {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Способ посадки</label>
                  <select value={newPlant.planting_method} onChange={e => setNewPlant({...newPlant, planting_method: e.target.value})}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl">
                    <option value="direct">🌍 Прямой посев</option>
                    <option value="seedling">🌱 Рассада</option>
                    <option value="perennial">🌳 Многолетник</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Полив (дн.)</label>
                  <input type="number" min="1" value={newPlant.watering_freq_days}
                    onChange={e => setNewPlant({...newPlant, watering_freq_days: parseInt(e.target.value)})}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">До высадки (дн.)</label>
                  <input type="number" min="0" value={newPlant.days_to_transplant}
                    onChange={e => setNewPlant({...newPlant, days_to_transplant: parseInt(e.target.value)})}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">До урожая (дн.)</label>
                  <input type="number" min="1" value={newPlant.days_to_harvest}
                    onChange={e => setNewPlant({...newPlant, days_to_harvest: parseInt(e.target.value)})}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl" />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Фото</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handlePlantPhotoSelect}
                  className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-green-50 file:text-green-700 file:font-medium hover:file:bg-green-100"
                />
                {(plantPhotoPreview) && (
                  <PlantImage
                    src={plantPhotoPreview}
                    alt="Превью"
                    className="mt-2 w-full h-32 object-cover rounded-lg"
                    fallbackClassName="mt-2 w-full h-32 rounded-lg bg-green-50 flex items-center justify-center"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Описание</label>
                <textarea value={newPlant.description} onChange={e => setNewPlant({...newPlant, description: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl" rows="2" placeholder="Описание растения..." />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Научные факты</label>
                <textarea value={newPlant.scientific_facts} onChange={e => setNewPlant({...newPlant, scientific_facts: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl" rows="2" placeholder="Особенности ухода..." />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button onClick={addPlant} disabled={uploadingPlant} className="flex-1 bg-green-600 text-white py-2.5 rounded-xl hover:bg-green-700 font-medium disabled:opacity-60">
                {uploadingPlant ? 'Загрузка…' : 'Добавить'}
              </button>
              <button onClick={() => { setShowAddModal(false); resetAddPlantForm(); }} className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl hover:bg-gray-200">Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}