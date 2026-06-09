import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { useReferenceStore } from '../store/referenceStore'
import { 
  Users, Sprout, Shield, Database, Trash2, Plus, BookOpen, 
  Search, X, Edit, ClipboardList, Check, Ban, Droplets, Calendar
} from 'lucide-react'
import Header from '../components/Header'
import MobileNav from '../components/MobileNav'
import PlantImage from '../components/PlantImage'
import { toast } from '../store/toastStore'
import { confirm } from '../store/confirmStore'
import { plantingMethodLabel } from '../lib/plantLabels'

const ADMIN_RLS_SQL = 'supabase/fix_admin_category_insert.sql'
import { uploadPlantImage, deletePlantImage } from '../services/plantImageStorage'
import { resolvePlantImageUrl } from '../lib/plantImageUrl'
import {
  approveSubmission,
  rejectSubmission,
  fetchPendingSubmissions,
} from '../services/userPlantService'

export default function AdminPanel() {
  const { profile, isAdmin } = useAuthStore()
  const [activeTab, setActiveTab] = useState('users')
  const [users, setUsers] = useState([])
  const [plants, setPlants] = useState([])
  const [categories, setCategories] = useState([])
  const [fertilizers, setFertilizers] = useState([])
  const [issues, setIssues] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [adminError, setAdminError] = useState('')
  
  // Статистика
  const [adminStats, setAdminStats] = useState({ users: 0, plants: 0, categories: 0 })
  
  // Модалки
  const [showPlantForm, setShowPlantForm] = useState(false)
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [showFertilizerForm, setShowFertilizerForm] = useState(false)
  const [showIssueForm, setShowIssueForm] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editPlantId, setEditPlantId] = useState(null)
  const [plantPhotoFile, setPlantPhotoFile] = useState(null)
  const [plantPhotoPreview, setPlantPhotoPreview] = useState(null)
  const [uploadingPlant, setUploadingPlant] = useState(false)
  
  const [newPlant, setNewPlant] = useState({
    name: '', category_id: '', watering_freq_days: 3, maturation_days: 60,
    description: '', scientific_facts: '', planting_method: 'direct',
    days_to_transplant: 0, days_to_harvest: 60, difficulty: 'Легко'
  })
  const [newCategory, setNewCategory] = useState({ name: '', icon: '' })
  const [newFertilizer, setNewFertilizer] = useState({
    plant_id: '', name: '', type: 'complex', application_stage: '', description: ''
  })
  const [newIssue, setNewIssue] = useState({
    plant_id: '', name: '', type: 'disease', symptoms: '', treatment: '', prevention: ''
  })
  
  useEffect(() => { loadAllData() }, [])

  useEffect(() => {
    const userId = profile?.id
    if (!userId) return
    useAuthStore.getState().loadProfile(userId, { force: true })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- refresh admin role once on open
  
  async function loadAllData() {
    setAdminError('')
    let submissionsData = []
    try {
      submissionsData = await fetchPendingSubmissions()
    } catch {
      submissionsData = []
    }

    const [
      { data: usersData, error: usersError }, { data: plantsData, error: plantsError }, { data: catData, error: catError },
      { data: fertData, error: fertError }, { data: issuesData, error: issuesError }
    ] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('plants').select('*, category:category_id(*)').order('name'),
      supabase.from('plant_categories').select('*'),
      supabase.from('fertilizers').select('*, plants:plant_id(name)').order('name'),
      supabase.from('plant_issues').select('*, plants:plant_id(name)').order('name'),
    ])

    const firstError = usersError || plantsError || catError || fertError || issuesError
    if (firstError) {
      setAdminError(formatSupabaseError(firstError, ADMIN_RLS_SQL))
    } else {
      setAdminError('')
    }
    
    if (usersData) setUsers(usersData)
    if (plantsData) setPlants(plantsData)
    if (catData) setCategories(catData)
    if (fertData) setFertilizers(fertData)
    if (issuesData) setIssues(issuesData)
    setSubmissions(submissionsData)
    
    setAdminStats({
      users: usersData?.length || 0,
      plants: plantsData?.length || 0,
      categories: catData?.length || 0
    })
    
    setLoading(false)
  }
  
  function resetPlantForm() {
    setNewPlant({
      name: '', category_id: '', watering_freq_days: 3, maturation_days: 60,
      description: '', scientific_facts: '', planting_method: 'direct',
      days_to_transplant: 0, days_to_harvest: 60, difficulty: 'Легко',
      sun_requirement: 'Солнце', image_url: '', sowing_depth: 1,
      plant_spacing: 30, row_spacing: 50,
    })
    setPlantPhotoFile(null)
    setPlantPhotoPreview(null)
    setEditMode(false)
    setEditPlantId(null)
  }

  function handlePlantPhotoSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPlantPhotoFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setPlantPhotoPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  async function savePlant() {
    if (!newPlant.name || !newPlant.category_id) {
      toast.error('Заполните название и категорию')
      return
    }

    setUploadingPlant(true)
    try {
      let imageUrl = newPlant.image_url || ''

      if (plantPhotoFile) {
        const previousUrl = newPlant.image_url
        imageUrl = await uploadPlantImage(plantPhotoFile, {
          plantId: editPlantId,
          plantName: newPlant.name,
        })
        if (previousUrl && previousUrl !== imageUrl) {
          await deletePlantImage(previousUrl)
        }
      }

      const payload = { ...newPlant, image_url: imageUrl || null }

      const result = editMode && editPlantId
        ? await supabase.from('plants').update(payload).eq('id', editPlantId)
        : await supabase.from('plants').insert(payload)

      if (result.error) {
        toast.error(formatSupabaseError(result.error, ADMIN_RLS_SQL))
        return
      }

      useReferenceStore.getState().invalidateReferences()
      setShowPlantForm(false)
      resetPlantForm()
      toast.success(editMode ? 'Растение обновлено' : 'Растение добавлено')
      loadAllData()
    } catch (err) {
      toast.error(err.message || 'Не удалось загрузить фото')
    } finally {
      setUploadingPlant(false)
    }
  }

  function editPlant(plant) {
    setEditMode(true)
    setEditPlantId(plant.id)
    setPlantPhotoFile(null)
    setPlantPhotoPreview(null)
    setNewPlant({
      name: plant.name,
      category_id: plant.category_id || '',
      watering_freq_days: plant.watering_freq_days || 3,
      maturation_days: plant.maturation_days || 60,
      description: plant.description || '',
      scientific_facts: plant.scientific_facts || '',
      planting_method: plant.planting_method || 'direct',
      days_to_transplant: plant.days_to_transplant || 0,
      days_to_harvest: plant.days_to_harvest || 60,
      difficulty: plant.difficulty || 'Легко',
      sun_requirement: plant.sun_requirement || 'Солнце',
      image_url: plant.image_url || '',
      sowing_depth: plant.sowing_depth ?? 1,
      plant_spacing: plant.plant_spacing ?? 30,
      row_spacing: plant.row_spacing ?? 50,
    })
    setShowPlantForm(true)
  }
  
  async function handleApproveSubmission(sub) {
    try {
      await approveSubmission(sub)
      useReferenceStore.getState().invalidateReferences()
      toast.success(`«${sub.name}» добавлено в каталог`)
      loadAllData()
    } catch (err) {
      toast.error(err.message || 'Не удалось одобрить')
    }
  }

  async function handleRejectSubmission(sub) {
    const ok = await confirm(`Отклонить заявку «${sub.name}»?`, {
      title: 'Отклонить заявку',
      confirmLabel: 'Отклонить',
      destructive: true,
    })
    if (!ok) return
    try {
      await rejectSubmission(sub.id, null)
      toast.info('Заявка отклонена')
      loadAllData()
    } catch (err) {
      toast.error(err.message || 'Не удалось отклонить')
    }
  }

  async function deletePlant(id) {
    const ok = await confirm('Удалить растение?', {
      title: 'Удалить растение',
      confirmLabel: 'Удалить',
      destructive: true,
    })
    if (!ok) return
    const { error } = await supabase.from('plants').delete().eq('id', id)
    if (error) {
      toast.error(formatSupabaseError(error, ADMIN_RLS_SQL))
      return
    }
    useReferenceStore.getState().invalidateReferences()
    toast.success('Растение удалено')
    loadAllData()
  }
  
  async function addCategory() {
    if (!newCategory.name?.trim()) {
      toast.error('Введите название категории')
      return
    }
    const { error } = await supabase.from('plant_categories').insert(newCategory)
    if (error) {
      toast.error(formatSupabaseError(error, ADMIN_RLS_SQL))
      return
    }
    useReferenceStore.getState().invalidateReferences()
    setShowCategoryForm(false)
    setNewCategory({ name: '', icon: '' })
    toast.success('Категория добавлена')
    loadAllData()
  }
  
  async function deleteCategory(id) {
    const ok = await confirm('Удалить категорию?', {
      title: 'Удалить категорию',
      confirmLabel: 'Удалить',
      destructive: true,
    })
    if (!ok) return
    const { error } = await supabase.from('plant_categories').delete().eq('id', id)
    if (error) {
      toast.error(formatSupabaseError(error, ADMIN_RLS_SQL))
      return
    }
    useReferenceStore.getState().invalidateReferences()
    toast.success('Категория удалена')
    loadAllData()
  }
  
  async function addFertilizer() {
    if (!newFertilizer.plant_id || !newFertilizer.name) {
      toast.error('Заполните поля')
      return
    }
    const { error } = await supabase.from('fertilizers').insert(newFertilizer)
    if (error) {
      toast.error(`Не удалось добавить удобрение: ${error.message}`)
      return
    }
    setShowFertilizerForm(false)
    setNewFertilizer({ plant_id: '', name: '', type: 'complex', application_stage: '', description: '' })
    loadAllData()
  }
  
  async function deleteFertilizer(id) {
    const { error } = await supabase.from('fertilizers').delete().eq('id', id)
    if (error) {
      toast.error(`Не удалось удалить удобрение: ${error.message}`)
      return
    }
    loadAllData()
  }
  
  async function addIssue() {
    if (!newIssue.plant_id || !newIssue.name) {
      toast.error('Заполните поля')
      return
    }
    const { error } = await supabase.from('plant_issues').insert(newIssue)
    if (error) {
      toast.error(`Не удалось добавить проблему растения: ${error.message}`)
      return
    }
    setShowIssueForm(false)
    setNewIssue({ plant_id: '', name: '', type: 'disease', symptoms: '', treatment: '', prevention: '' })
    loadAllData()
  }
  
  async function deleteIssue(id) {
    const { error } = await supabase.from('plant_issues').delete().eq('id', id)
    if (error) {
      toast.error(`Не удалось удалить проблему растения: ${error.message}`)
      return
    }
    loadAllData()
  }
  
  const filteredPlants = plants.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  )
  
  const tabs = [
    { key: 'users', label: 'Пользователи', icon: Users, count: adminStats.users },
    { key: 'plants', label: 'Растения', icon: Sprout, count: adminStats.plants },
    { key: 'submissions', label: 'Заявки', icon: ClipboardList, count: submissions.length },
    { key: 'categories', label: 'Категории', icon: BookOpen, count: adminStats.categories },
    { key: 'fertilizers', label: 'Удобрения', icon: Shield, count: fertilizers.length },
    { key: 'issues', label: 'Болезни', icon: Database, count: issues.length },
  ]
  
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Доступ запрещён</h2>
          <p className="text-gray-500">Только для администраторов</p>
          <Link to="/dashboard" className="mt-4 inline-block text-green-600 hover:text-green-700">← На главную</Link>
        </div>
      </div>
    )
  }
  
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  )
  
  return (
    <div className="page-shell min-h-screen bg-gradient-to-br from-gray-50 to-green-50 pb-20 sm:pb-0 overflow-x-hidden">
      <Header />
      
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Shield className="w-6 h-6 text-purple-600" /> Панель администратора
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Управление системой
              {profile?.email && (
                <span className="text-gray-400"> · {profile.email}</span>
              )}
            </p>
          </div>
          <Link to="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">← На главную</Link>
        </div>

        {adminError && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
            <p>{adminError}</p>
            <p className="text-xs mt-2 text-red-700">
              Убедитесь, что в таблице profiles у вашего пользователя <code className="bg-red-100 px-1 rounded">role_id = 2</code>.
            </p>
          </div>
        )}
        
        {/* Статистика */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-6">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`rounded-2xl p-3 sm:p-4 text-center transition-all ${
                activeTab === tab.key ? 'bg-purple-600 text-white shadow-lg' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}>
              <tab.icon className="w-5 h-5 mx-auto mb-1" />
              <p className="text-lg sm:text-2xl font-bold">{tab.count}</p>
              <p className="text-[10px] sm:text-xs opacity-75">{tab.label}</p>
            </button>
          ))}
        </div>
        
        {/* Пользователи */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 sm:p-6">
              <h2 className="text-lg font-semibold mb-4">Управление пользователями</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left bg-gray-50">
                      <th className="p-3 text-sm font-medium">Email</th>
                      <th className="p-3 text-sm font-medium">Имя</th>
                      <th className="p-3 text-sm font-medium">Роль</th>
                      <th className="p-3 text-sm font-medium">Статус</th>
                      <th className="p-3 text-sm font-medium">Дата регистрации</th>
                      <th className="p-3 text-sm font-medium">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => {
                      const isAdmin = u.role_id === 2
                      const isBlocked = u.is_blocked === true
                      const isCurrentUser = u.id === profile?.id
                      const canBlock = !isCurrentUser && !isAdmin

                      return (
                        <tr key={u.id} className={`border-b hover:bg-gray-50 ${isBlocked ? 'bg-red-50/30' : ''}`}>
                          <td className="p-3 text-sm">{u.email}</td>
                          <td className="p-3 text-sm">{u.full_name || '—'}</td>
                          <td className="p-3 text-sm">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              isAdmin ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'
                            }`}>
                              {isAdmin ? 'Админ' : 'Пользователь'}
                            </span>
                          </td>
                          <td className="p-3 text-sm">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              isBlocked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                            }`}>
                              {isBlocked ? 'Заблокирован' : 'Активен'}
                            </span>
                          </td>
                          <td className="p-3 text-xs text-gray-500">
                            {new Date(u.created_at).toLocaleDateString('ru-RU')}
                          </td>
                          <td className="p-3 text-sm">
                            {canBlock ? (
                              <button
                                onClick={async () => {
                                  const action = isBlocked ? 'разблокировать' : 'заблокировать'
                                  const ok = await confirm(
                                    `${action === 'заблокировать' ? 'Заблокировать' : 'Разблокировать'} пользователя ${u.email}?`,
                                    {
                                      title: action === 'заблокировать' ? 'Заблокировать' : 'Разблокировать',
                                      confirmLabel: 'Да',
                                      destructive: action === 'заблокировать',
                                    }
                                  )
                                  if (!ok) return
                                  const { error } = await supabase.from('profiles').update({ is_blocked: !isBlocked }).eq('id', u.id)
                                  if (error) {
                                    toast.error(formatSupabaseError(error, ADMIN_RLS_SQL))
                                    return
                                  }
                                  toast.success('Статус пользователя обновлён')
                                  loadAllData()
                                }}
                                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                                  isBlocked 
                                    ? 'bg-green-50 text-green-700 hover:bg-green-100' 
                                    : 'bg-red-50 text-red-600 hover:bg-red-100'
                                }`}
                              >
                                {isBlocked ? 'Разблокировать' : 'Заблокировать'}
                              </button>
                            ) : (
                              <span className="text-xs text-gray-400">
                                {isCurrentUser ? 'Это вы' : 'Недоступно'}
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        
        {/* Растения */}
        {activeTab === 'plants' && (
          <div className="bg-white rounded-2xl shadow-sm">
            <div className="p-4 sm:p-6 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Управление растениями ({plants.length})</h2>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" placeholder="Поиск..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                    className="pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm" />
                </div>
                <button onClick={() => { resetPlantForm(); setShowPlantForm(true); }}
                  className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-green-700">
                  <Plus className="w-4 h-4" /> Добавить
                </button>
              </div>
            </div>
            
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredPlants.map(plant => (
                <div key={plant.id} className="bg-gray-50 rounded-2xl overflow-hidden hover:shadow-md transition-all group">
                  {/* Фото */}
                  <div className="h-36 bg-gradient-to-br from-gray-200 to-gray-300 relative overflow-hidden">
                    <PlantImage
                      src={plant.image_url}
                      alt={plant.name}
                      className="w-full h-full object-cover"
                      fallbackClassName="w-full h-full"
                    />
                    {/* Бейдж */}
                    <div className="absolute top-2 left-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        plant.planting_method === 'seedling' ? 'bg-amber-100 text-amber-700' :
                        plant.planting_method === 'perennial' ? 'bg-purple-100 text-purple-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {plantingMethodLabel(plant.planting_method)}
                      </span>
                    </div>
                  </div>
                  
                  {/* Информация */}
                  <div className="p-3">
                    <h3 className="font-semibold text-sm text-gray-800 truncate">{plant.name}</h3>
                    <p className="text-xs text-gray-500">{plant.category?.name || 'Без категории'}</p>
                    
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Droplets className="w-3 h-3" /> {plant.watering_freq_days} дн.</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {plant.maturation_days} дн.</span>
                    </div>
                    
                    {/* Кнопки */}
                    <div className="flex gap-1.5 mt-3">
                      <button onClick={() => editPlant(plant)}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors">
                        <Edit className="w-3.5 h-3.5" /> Изменить
                      </button>
                      <button onClick={() => deletePlant(plant.id)}
                        className="flex items-center justify-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {filteredPlants.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <Sprout className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Ничего не найдено</p>
              </div>
            )}
          </div>
        )}
        
        {/* Заявки в каталог */}
        {activeTab === 'submissions' && (
          <div className="bg-white rounded-2xl shadow-sm">
            <div className="p-4 sm:p-6 border-b">
              <h2 className="text-lg font-semibold">Заявки пользователей ({submissions.length})</h2>
              <p className="text-sm text-gray-500 mt-1">Одобрите — растение попадёт в общий каталог</p>
            </div>
            <div className="p-4 space-y-3">
              {submissions.length === 0 ? (
                <p className="text-center text-gray-400 py-8">Нет заявок на модерации</p>
              ) : submissions.map((sub) => (
                <div key={sub.id} className="border border-gray-100 rounded-xl p-4 flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-800">{sub.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {sub.category?.name} · полив {sub.watering_freq_days} дн. · урожай {sub.maturation_days} дн.
                    </p>
                    {sub.description && <p className="text-sm text-gray-600 mt-2 line-clamp-2">{sub.description}</p>}
                    {sub.scientific_facts && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{sub.scientific_facts}</p>}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleApproveSubmission(sub)}
                      className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                    >
                      <Check className="w-4 h-4" /> Одобрить
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRejectSubmission(sub)}
                      className="flex items-center gap-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100"
                    >
                      <Ban className="w-4 h-4" /> Отклонить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Категории */}
        {activeTab === 'categories' && (
          <div className="bg-white rounded-2xl shadow-sm">
            <div className="p-4 sm:p-6 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">Категории ({categories.length})</h2>
              <button onClick={() => setShowCategoryForm(true)}
                className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-green-700">
                <Plus className="w-4 h-4" /> Добавить
              </button>
            </div>
            <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {categories.map(cat => (
                <div key={cat.id} className="p-4 bg-gray-50 rounded-xl flex items-center justify-between hover:bg-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{cat.icon}</span>
                    <span className="text-sm font-medium">{cat.name}</span>
                  </div>
                  <button onClick={() => deleteCategory(cat.id)} className="text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Удобрения */}
        {activeTab === 'fertilizers' && (
          <div className="bg-white rounded-2xl shadow-sm">
            <div className="p-4 sm:p-6 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">Удобрения ({fertilizers.length})</h2>
              <button onClick={() => setShowFertilizerForm(true)}
                className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-green-700">
                <Plus className="w-4 h-4" /> Добавить
              </button>
            </div>
            <div className="p-4 space-y-2">
              {fertilizers.length === 0 ? <p className="text-gray-400 text-sm text-center py-4">Нет данных</p> : (
                fertilizers.map(f => (
                  <div key={f.id} className="p-3 bg-gray-50 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        f.type === 'organic' ? 'bg-green-100 text-green-700' : f.type === 'mineral' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                      }`}>{f.type === 'organic' ? 'Органика' : f.type === 'mineral' ? 'Минеральное' : 'Комплексное'}</span>
                      <div>
                        <p className="font-medium text-sm">{f.name}</p>
                        <p className="text-xs text-gray-500">Для: {f.plants?.name || '—'} • {f.application_stage}</p>
                      </div>
                    </div>
                    <button onClick={() => deleteFertilizer(f.id)} className="text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
        
        {/* Болезни */}
        {activeTab === 'issues' && (
          <div className="bg-white rounded-2xl shadow-sm">
            <div className="p-4 sm:p-6 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">Болезни и вредители ({issues.length})</h2>
              <button onClick={() => setShowIssueForm(true)}
                className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-green-700">
                <Plus className="w-4 h-4" /> Добавить
              </button>
            </div>
            <div className="p-4 space-y-2">
              {issues.length === 0 ? <p className="text-gray-400 text-sm text-center py-4">Нет данных</p> : (
                issues.map(i => (
                  <div key={i.id} className="p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          i.type === 'disease' ? 'bg-red-100 text-red-700' : i.type === 'pest' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'
                        }`}>{i.type === 'disease' ? 'Болезнь' : i.type === 'pest' ? 'Вредитель' : 'Проблема'}</span>
                        <span className="font-medium text-sm">{i.name}</span>
                      </div>
                      <button onClick={() => deleteIssue(i.id)} className="text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    <p className="text-xs text-gray-500">Для: {i.plants?.name || '—'}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2 text-xs">
                      <div className="bg-white p-2 rounded"><strong>Симптомы:</strong> {i.symptoms}</div>
                      <div className="bg-white p-2 rounded"><strong>Лечение:</strong> {i.treatment}</div>
                      <div className="bg-white p-2 rounded"><strong>Профилактика:</strong> {i.prevention}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>
      
      <MobileNav />
      
      {/* Модалка: Растение */}
      {showPlantForm && (
        <Modal title={editMode ? 'Редактировать растение' : 'Добавить растение'} onClose={() => setShowPlantForm(false)}>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto">
            {/* Название */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Название *</label>
              <input type="text" value={newPlant.name} onChange={e => setNewPlant({...newPlant, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" placeholder="Название растения" />
            </div>

            {/* Категория + Способ посадки */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Категория *</label>
                <select value={newPlant.category_id} onChange={e => setNewPlant({...newPlant, category_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm">
                  <option value="">Выберите</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Способ посадки</label>
                <select value={newPlant.planting_method} onChange={e => setNewPlant({...newPlant, planting_method: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm">
                  <option value="direct">Прямой посев</option>
                  <option value="seedling">Рассада</option>
                  <option value="perennial">Многолетник</option>
                </select>
              </div>
            </div>

            {/* Сложность + Освещение */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Сложность</label>
                <select value={newPlant.difficulty} onChange={e => setNewPlant({...newPlant, difficulty: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm">
                  <option value="Легко">Легко</option>
                  <option value="Средне">Средне</option>
                  <option value="Сложно">Сложно</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Освещение</label>
                <select value={newPlant.sun_requirement} onChange={e => setNewPlant({...newPlant, sun_requirement: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm">
                  <option value="Солнце">Солнце</option>
                  <option value="Солнце/Полутень">Солнце/Полутень</option>
                  <option value="Полутень">Полутень</option>
                </select>
              </div>
            </div>

            {/* Полив + До высадки + До урожая */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Полив (дн.)</label>
                <input type="number" value={newPlant.watering_freq_days} onChange={e => setNewPlant({...newPlant, watering_freq_days: parseInt(e.target.value) || 3})}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">До высадки (дн.)</label>
                <input type="number" value={newPlant.days_to_transplant || 0} onChange={e => setNewPlant({...newPlant, days_to_transplant: parseInt(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">До урожая (дн.)</label>
                <input type="number" value={newPlant.days_to_harvest || 60} onChange={e => setNewPlant({...newPlant, days_to_harvest: parseInt(e.target.value) || 60})}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
              </div>
            </div>

            {/* Расстояние посадки */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Глубина (см)</label>
                <input type="number" step="0.1" value={newPlant.sowing_depth || 1} onChange={e => setNewPlant({...newPlant, sowing_depth: parseFloat(e.target.value) || 1})}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Между раст. (см)</label>
                <input type="number" value={newPlant.plant_spacing || 30} onChange={e => setNewPlant({...newPlant, plant_spacing: parseInt(e.target.value) || 30})}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Между ряд. (см)</label>
                <input type="number" value={newPlant.row_spacing || 50} onChange={e => setNewPlant({...newPlant, row_spacing: parseInt(e.target.value) || 50})}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
              </div>
            </div>

            {/* Фото */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Фото растения</label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handlePlantPhotoSelect}
                className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-green-50 file:text-green-700 file:font-medium hover:file:bg-green-100"
              />
              <p className="text-xs text-gray-500 mt-1">JPEG, PNG, WebP или GIF, до 5 МБ. Сохраняется в Supabase Storage.</p>
              {(plantPhotoPreview || newPlant.image_url) && (
                <div className="mt-3 flex items-start gap-3">
                  <PlantImage
                    src={plantPhotoPreview || newPlant.image_url}
                    alt="Превью"
                    className="w-24 h-24 rounded-lg object-cover border border-gray-200"
                    fallbackClassName="w-24 h-24 rounded-lg"
                  />
                  {newPlant.image_url && !plantPhotoFile && (
                    <p className="text-xs text-gray-500 pt-1 break-all">{resolvePlantImageUrl(newPlant.image_url)}</p>
                  )}
                </div>
              )}
            </div>

            {/* Описание */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Описание</label>
              <textarea value={newPlant.description || ''} onChange={e => setNewPlant({...newPlant, description: e.target.value})}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" rows="2" placeholder="Краткое описание растения" />
            </div>

            {/* Научные факты */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Научные факты</label>
              <textarea value={newPlant.scientific_facts || ''} onChange={e => setNewPlant({...newPlant, scientific_facts: e.target.value})}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" rows="2" placeholder="Особенности ухода, агротехника" />
            </div>

            {/* Кнопка */}
            <button onClick={savePlant} disabled={uploadingPlant}
              className="w-full bg-green-600 text-white py-2.5 rounded-xl hover:bg-green-700 font-medium transition-colors disabled:opacity-60">
              {uploadingPlant ? 'Загрузка…' : editMode ? 'Сохранить изменения' : 'Добавить растение'}
            </button>
          </div>
        </Modal>
      )}
      
      {/* Модалка: Категория */}
      {showCategoryForm && (
        <Modal title="Добавить категорию" onClose={() => setShowCategoryForm(false)}>
          <input type="text" placeholder="Название *" value={newCategory.name} onChange={e => setNewCategory({...newCategory, name: e.target.value})} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl mb-3" />
          <input type="text" placeholder="Иконка (эмодзи)" value={newCategory.icon} onChange={e => setNewCategory({...newCategory, icon: e.target.value})} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl mb-4" />
          <button onClick={addCategory} className="w-full bg-green-600 text-white py-2.5 rounded-xl hover:bg-green-700 font-medium">Добавить</button>
        </Modal>
      )}
      
      {/* Модалка: Удобрение */}
      {showFertilizerForm && (
        <Modal title="Добавить удобрение" onClose={() => setShowFertilizerForm(false)}>
          <div className="space-y-3">
            <select value={newFertilizer.plant_id} onChange={e => setNewFertilizer({...newFertilizer, plant_id: e.target.value})} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl">
              <option value="">Выберите растение *</option>
              {plants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input type="text" placeholder="Название удобрения *" value={newFertilizer.name} onChange={e => setNewFertilizer({...newFertilizer, name: e.target.value})} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl" />
            <select value={newFertilizer.type} onChange={e => setNewFertilizer({...newFertilizer, type: e.target.value})} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl">
              <option value="organic">Органическое</option>
              <option value="mineral">Минеральное</option>
              <option value="complex">Комплексное</option>
            </select>
            <input type="text" placeholder="Когда вносить" value={newFertilizer.application_stage} onChange={e => setNewFertilizer({...newFertilizer, application_stage: e.target.value})} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl" />
            <textarea placeholder="Описание" value={newFertilizer.description} onChange={e => setNewFertilizer({...newFertilizer, description: e.target.value})} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl" rows="2" />
            <button onClick={addFertilizer} className="w-full bg-green-600 text-white py-2.5 rounded-xl hover:bg-green-700 font-medium">Добавить</button>
          </div>
        </Modal>
      )}
      
      {/* Модалка: Болезнь */}
      {showIssueForm && (
        <Modal title="Добавить болезнь/вредителя" onClose={() => setShowIssueForm(false)}>
          <div className="space-y-3">
            <select value={newIssue.plant_id} onChange={e => setNewIssue({...newIssue, plant_id: e.target.value})} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl">
              <option value="">Выберите растение *</option>
              {plants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input type="text" placeholder="Название *" value={newIssue.name} onChange={e => setNewIssue({...newIssue, name: e.target.value})} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl" />
            <select value={newIssue.type} onChange={e => setNewIssue({...newIssue, type: e.target.value})} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl">
              <option value="disease">Болезнь</option>
              <option value="pest">Вредитель</option>
              <option value="physiological">Проблема</option>
            </select>
            <textarea placeholder="Симптомы" value={newIssue.symptoms} onChange={e => setNewIssue({...newIssue, symptoms: e.target.value})} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl" rows="2" />
            <textarea placeholder="Лечение" value={newIssue.treatment} onChange={e => setNewIssue({...newIssue, treatment: e.target.value})} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl" rows="2" />
            <textarea placeholder="Профилактика" value={newIssue.prevention} onChange={e => setNewIssue({...newIssue, prevention: e.target.value})} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl" rows="2" />
            <button onClick={addIssue} className="w-full bg-green-600 text-white py-2.5 rounded-xl hover:bg-green-700 font-medium">Добавить</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 max-h-[85vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        {children}
      </div>
    </div>
  )
}