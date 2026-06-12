import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { Plus, Trash2, Eye, Edit, Home, MapPin, Image, X } from 'lucide-react'
import Header from '../components/Header'
import MobileNav from '../components/MobileNav'
import { toast } from '../store/toastStore'
import { confirm } from '../store/confirmStore'
import { uploadImage } from '../services/imageStorage'
import PlantImage from '../components/PlantImage'

export default function MyGardens() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [gardens, setGardens] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingGarden, setEditingGarden] = useState(null)
  const [newGarden, setNewGarden] = useState({ name: '', location: '' })
  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [loadError, setLoadError] = useState('')

  const loadGardens = useCallback(async () => {
    setLoadError('')
    const { data, error } = await supabase
      .from('layouts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (error) {
      setLoadError(error.message)
      setGardens([])
    } else if (data) {
      setGardens(data)
    }
    setLoading(false)
  }, [user.id])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadGardens()
  }, [loadGardens])

  useEffect(() => {
    if (searchParams.get('action') !== 'create') return
    setShowModal(true)
    const next = new URLSearchParams(searchParams)
    next.delete('action')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  function handlePhotoSelect(e) {
    const file = e.target.files[0]
    if (!file) return
    
    setPhoto(file)
    const reader = new FileReader()
    reader.onload = (e) => setPhotoPreview(e.target.result)
    reader.readAsDataURL(file)
  }

  async function uploadPhoto(file) {
    if (!file) return null
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const fileName = `${user.id}-${Date.now()}.${fileExt}`
    return uploadImage(file, 'garden-photos', { path: fileName, upsert: false })
  }

  function openEditGarden(garden) {
    setEditingGarden(garden)
    setNewGarden({ name: garden.name || '', location: garden.location || '' })
    setPhoto(null)
    setPhotoPreview(garden.image_url || null)
  }

  function closeGardenModal() {
    setShowModal(false)
    setEditingGarden(null)
    setNewGarden({ name: '', location: '' })
    setPhoto(null)
    setPhotoPreview(null)
  }

  async function saveGarden() {
    if (!newGarden.name.trim()) {
      toast.error('Введите название')
      return
    }

    setUploading(true)
    try {
      let imageUrl = editingGarden?.image_url || null
      if (photo) {
        try {
          imageUrl = await uploadPhoto(photo)
        } catch (uploadErr) {
          const ok = await confirm(
            'Не удалось загрузить фото. Сохранить без нового фото?',
            { title: 'Фото не загрузилось', confirmLabel: 'Сохранить' }
          )
          if (!ok) return
        }
      }

      if (editingGarden) {
        const { data, error } = await supabase
          .from('layouts')
          .update({
            name: newGarden.name.trim(),
            location: newGarden.location?.trim() || null,
            image_url: imageUrl,
          })
          .eq('id', editingGarden.id)
          .select()
          .single()

        if (error) throw error
        setGardens(gardens.map((g) => (g.id === editingGarden.id ? data : g)))
        toast.success('Участок обновлён')
        closeGardenModal()
      } else {
        await createGardenWithData(imageUrl)
      }
    } catch (error) {
      toast.error(`Ошибка: ${error.message}`)
    } finally {
      setUploading(false)
    }
  }

  async function createGardenWithData(imageUrl) {
    const { data, error } = await supabase
      .from('layouts')
      .insert({
        user_id: user.id,
        name: newGarden.name.trim(),
        location: newGarden.location?.trim() || null,
        image_url: imageUrl,
        width: 3000,
        height: 2000,
      })
      .select()
      .single()

    if (error) throw error
    if (!data) throw new Error('Supabase не вернул созданный участок')

    setGardens([data, ...gardens])
    closeGardenModal()
    navigate(`/garden/${data.id}/edit`)
  }

  async function deleteGarden(id) {
    const ok = await confirm('Удалить участок, все зоны и растения на нём?', {
      title: 'Удалить участок',
      confirmLabel: 'Удалить',
      destructive: true,
    })
    if (!ok) return
    const { error } = await supabase.from('layouts').delete().eq('id', id)
    if (error) {
      toast.error(`Не удалось удалить: ${error.message}`)
      return
    }
    setGardens(gardens.filter(g => g.id !== id))
    toast.success('Участок удалён')
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  )

  return (
    <div className="page-shell min-h-screen bg-gradient-to-br from-gray-50 to-green-50 pb-20 sm:pb-0 overflow-x-hidden">
      <Header />
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        {loadError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span>Не удалось загрузить участки: {loadError}</span>
            <button type="button" onClick={() => { setLoading(true); loadGardens() }} className="px-4 py-2 bg-white border border-red-200 rounded-lg hover:bg-red-50 font-medium shrink-0">
              Повторить
            </button>
          </div>
        )}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Мои участки</h1>
            <p className="text-sm text-gray-500 mt-1">{gardens.length} участков</p>
          </div>
          <button 
            onClick={() => setShowModal(true)} 
            className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2.5 rounded-xl hover:from-green-700 hover:to-emerald-700 text-sm font-medium transition-all shadow-md shadow-green-500/20"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:block">Добавить участок</span>
          </button>
        </div>

        {!loadError && gardens.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
              <Home className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">У вас пока нет участков</h3>
            <p className="text-gray-500 mb-6">Создайте свой первый участок, чтобы начать планировать</p>
            <button 
              onClick={() => setShowModal(true)} 
              className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-2.5 rounded-xl hover:from-green-700 hover:to-emerald-700 font-medium shadow-md shadow-green-500/20"
            >
              Добавить участок
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {gardens.map(garden => (
              <div 
                key={garden.id} 
                className="bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group"
              >
                {/* Фото участка */}
                <div className="aspect-[4/3] relative overflow-hidden">
                  <PlantImage
                    src={garden.image_url}
                    alt={garden.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    fallbackClassName="w-full h-full"
                  />
                  
                  {/* Адрес */}
                  {garden.location && (
                    <div className="absolute top-3 left-3 flex items-center gap-1 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-medium text-gray-700 shadow-sm">
                      <MapPin className="w-3 h-3 text-green-600" />
                      {garden.location}
                    </div>
                  )}
                  
                  {/* Затемнение при наведении */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                </div>
                
                {/* Информация */}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-800 mb-3 truncate">{garden.name}</h3>
                  
                  <div className="flex gap-2">
                    <Link 
                      to={`/garden/${garden.id}`} 
                      className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-3 py-2.5 rounded-xl hover:from-green-700 hover:to-emerald-700 text-sm font-medium transition-all shadow-sm hover:shadow-md"
                    >
                      <Eye className="w-4 h-4" /> Открыть
                    </Link>
                    <button
                      type="button"
                      onClick={() => openEditGarden(garden)}
                      className="flex items-center justify-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-2.5 rounded-xl hover:bg-blue-100 text-sm font-medium transition-all"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => deleteGarden(garden.id)} 
                      className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <MobileNav />

      {/* Модалка создания */}
      {(showModal || editingGarden) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">{editingGarden ? 'Редактировать участок' : 'Новый участок'}</h2>
              <button type="button" onClick={closeGardenModal}>
                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Название */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Название *</label>
                <input 
                  type="text" 
                  placeholder="Например: Дача у реки" 
                  value={newGarden.name} 
                  onChange={e => setNewGarden({...newGarden, name: e.target.value})} 
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-400 transition-all" 
                  autoFocus 
                />
              </div>
              
              {/* Адрес */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Адрес или описание</label>
                <input 
                  type="text" 
                  placeholder="Например: Московская область, 20 км от МКАД" 
                  value={newGarden.location} 
                  onChange={e => setNewGarden({...newGarden, location: e.target.value})} 
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-400 transition-all" 
                />
              </div>
              
              {/* Загрузка фото */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Фото участка</label>
                
                {photoPreview ? (
                  <div className="relative rounded-xl overflow-hidden mb-2">
                    <img src={photoPreview} alt="Предпросмотр" className="w-full h-40 object-cover" />
                    <button 
                      onClick={() => { setPhoto(null); setPhotoPreview(null); }}
                      className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-green-400 hover:bg-green-50 transition-all">
                    <div className="flex flex-col items-center gap-1">
                      <Image className="w-8 h-8 text-gray-400" />
                      <span className="text-sm text-gray-500">Нажмите, чтобы выбрать фото</span>
                      <span className="text-xs text-gray-400">JPG, PNG до 5 МБ</span>
                    </div>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handlePhotoSelect} 
                      className="hidden" 
                    />
                  </label>
                )}
              </div>
              
              <p className="text-xs text-gray-400">Размер участка можно настроить позже в редакторе</p>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={saveGarden}
                disabled={uploading}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-2.5 rounded-xl hover:from-green-700 hover:to-emerald-700 font-medium transition-all disabled:opacity-50 shadow-md shadow-green-500/20"
              >
                {uploading ? 'Сохранение…' : editingGarden ? 'Сохранить' : 'Создать и перейти к редактированию'}
              </button>
              <button
                type="button"
                onClick={closeGardenModal}
                className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl hover:bg-gray-200 font-medium transition-all"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}