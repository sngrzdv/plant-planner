import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { 
  Plus, Sprout, Calendar, Droplets, 
  Trash2, CheckCircle, Clock, Flower, Search,
  X, BookOpen
} from 'lucide-react'
import Header from '../components/Header'
import PlantImage from '../components/PlantImage'
import MobileNav from '../components/MobileNav'
import { reminderService } from '../services/reminderService'
import { notificationService } from '../services/notificationService'
import { useReferenceStore } from '../store/referenceStore'
import { toast } from '../store/toastStore'
import { confirm } from '../store/confirmStore'

export default function Pots() {
  const [categories, setCategories] = useState([])
  const [filterCategory, setFilterCategory] = useState(null)
  const [filterReadyOnly, setFilterReadyOnly] = useState(false)
  const [sortBy, setSortBy] = useState('date-desc')
  const { user } = useAuthStore()
  const [pots, setPots] = useState([])
  const [transplantedPots, setTransplantedPots] = useState([])
  const [plants, setPlants] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showTransplantModal, setShowTransplantModal] = useState(false)
  const [selectedPot, setSelectedPot] = useState(null)
  const [gardens, setGardens] = useState([])
  const [beds, setBeds] = useState([])
  const [selectedBed, setSelectedBed] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('growing')
  const [bedRows, setBedRows] = useState([])
  const [bedPlantsData, setBedPlantsData] = useState([])

  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState([])

  const [transplantStep, setTransplantStep] = useState(1)
  const [selectedTransplantCell, setSelectedTransplantCell] = useState(null)
  const [bedForTransplant, setBedForTransplant] = useState(null)

  const [newPot, setNewPot] = useState({
    plant_id: '',
    custom_name: '',
    sowing_date: new Date().toISOString().split('T')[0],
    notes: ''
  })

  const loadData = useCallback(async () => {
    setLoadError('')
    const [
      { data: potsData, error: potsError },
      { data: transplantedData, error: transplantedError },
    ] = await Promise.all([
      supabase
        .from('pots')
        .select(`*, plants:plant_id(*)`)
        .eq('user_id', user.id)
        .eq('status', 'growing')
        .order('sowing_date', { ascending: false }),
      supabase
        .from('pots')
        .select(`*, plants:plant_id(*)`)
        .eq('user_id', user.id)
        .eq('status', 'transplanted')
        .order('transplanted_date', { ascending: false }),
    ])

    const firstError = potsError || transplantedError
    if (firstError) {
      setLoadError(firstError.message)
      setPots([])
      setTransplantedPots([])
      setLoading(false)
      return
    }

    if (potsData) {
      setPots(potsData)
      potsData.forEach(pot => {
        const daysSince = Math.floor((new Date() - new Date(pot.sowing_date)) / (1000 * 60 * 60 * 24))
        const daysToTransplant = pot.plants?.days_to_transplant || 45
        const progress = Math.min(100, Math.round((daysSince / daysToTransplant) * 100))
        if (progress >= 80) {
          const key = `seedling-ready-${pot.id}`
          if (!localStorage.getItem(key)) {
            notificationService.sendSeedlingReady(pot.plants?.name || 'Растение')
            localStorage.setItem(key, '1')
          }
        }
      })
    }

    if (transplantedData) setTransplantedPots(transplantedData)
    setLoading(false)

    const [plantsData, catData] = await Promise.all([
      useReferenceStore.getState().getPlants(),
      useReferenceStore.getState().getCategories(),
    ])
    setPlants(plantsData || [])
    setCategories(catData || [])
  }, [user.id])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData()
  }, [loadData])

  async function addPot() {
    if (!newPot.plant_id) {
      toast.error('Выберите растение')
      return
    }
    try {
      const { data, error } = await supabase.from('pots').insert({
        user_id: user.id, plant_id: newPot.plant_id,
        custom_name: newPot.custom_name || null,
        sowing_date: newPot.sowing_date, notes: newPot.notes || null, status: 'growing'
      }).select(`*, plants:plant_id(*)`).single()

      if (error) throw error
      if (!data) throw new Error('Supabase не вернул созданную рассаду')

      setPots([data, ...pots])

      const { error: journalError } = await supabase.from('garden_journal').insert({
        user_id: user.id, plant_id: newPot.plant_id,
        pot_id: data.id, action: 'sowed',
        details: `Посеяно: ${data.plants?.name || 'растение'}`,
        created_at: new Date().toISOString()
      })
      if (journalError) console.warn('Не удалось записать событие в журнал:', journalError)

      if (data && data.plants) {
        await reminderService.generateForPlant(user.id, data.plants, 'sowed', data.sowing_date)
      }

      if (data.plants?.days_to_transplant && data.plants.days_to_transplant <= 5) {
        notificationService.sendSeedlingReady(data.plants.name)
      }

      setShowAddModal(false)
      setNewPot({ plant_id: '', custom_name: '', sowing_date: new Date().toISOString().split('T')[0], notes: '' })
      toast.success('Рассада добавлена')
    } catch (error) {
      toast.error(`Не удалось добавить рассаду: ${error.message}`)
    }
  }

  async function deletePot(id) {
    const ok = await confirm('Удалить этот горшок?', {
      title: 'Удалить рассаду',
      confirmLabel: 'Удалить',
      destructive: true,
    })
    if (!ok) return
    const { error } = await supabase.from('pots').delete().eq('id', id)
    if (error) {
      toast.error(`Не удалось удалить: ${error.message}`)
      return
    }
    toast.success('Рассада удалена')
    if (activeTab === 'growing') setPots(pots.filter(p => p.id !== id))
    else setTransplantedPots(transplantedPots.filter(p => p.id !== id))
  }

  async function openTransplantModal(pot) {
    setSelectedPot(pot)
    const { data: gardensData, error } = await supabase.from('layouts').select('*').eq('user_id', user.id)
    if (error) {
      toast.error(`Не удалось загрузить участки: ${error.message}`)
      return
    }
    if (gardensData) setGardens(gardensData)
    setTransplantStep(1)
    setSelectedBed(null)
    setSelectedTransplantCell(null)
    setShowTransplantModal(true)
  }

  async function loadBeds(gardenId) {
    const { data: bedsData, error } = await supabase
      .from('beds').select('*').eq('layout_id', gardenId)
      .in('type', ['rect', 'flowerbed', 'greenhouse'])
    if (error) {
      toast.error(`Не удалось загрузить грядки: ${error.message}`)
      return
    }
    if (bedsData) setBeds(bedsData)
    setTransplantStep(2)
  }

  async function selectBedForTransplant(bedId) {
    setSelectedBed(bedId)
    const { data: bedData, error: bedError } = await supabase.from('beds').select('*').eq('id', bedId).single()
    if (bedError) {
      toast.error(`Не удалось загрузить грядку: ${bedError.message}`)
      return
    }
    setBedForTransplant(bedData)

    const [{ data: rows, error: rowsError }, { data: plantsData, error: plantsError }] = await Promise.all([
      supabase.from('bed_elements').select('*').eq('bed_id', bedId).eq('type', 'row'),
      supabase.from('bed_elements').select('*, plant:plant_id(name)').eq('bed_id', bedId).eq('type', 'plant_spot'),
    ])
    if (rowsError || plantsError) {
      toast.error(`Не удалось загрузить клетки: ${(rowsError || plantsError).message}`)
      return
    }

    setBedRows(rows || [])
    setBedPlantsData(plantsData || [])
    setTransplantStep(3)
  }

  async function transplant() {
    if (!selectedTransplantCell) {
      toast.error('Выберите клетку на грядке')
      return
    }

    const CELL_SIZE = 50
    let createdPlantOnBedId = null
    let createdElementId = null

    try {
      const { data: plantOnBed, error: plantOnBedError } = await supabase.from('plants_on_beds').insert({
        bed_id: selectedBed, plant_id: selectedPot.plant_id,
        planted_date: new Date().toISOString().split('T')[0],
        source_type: 'pot', source_pot_id: selectedPot.id, stage: 'seedling'
      }).select('id').single()
      if (plantOnBedError) throw plantOnBedError
      createdPlantOnBedId = plantOnBed?.id

      const { data: bedElement, error: bedElementError } = await supabase.from('bed_elements').insert({
        bed_id: selectedBed, type: 'plant_spot',
        name: selectedPot.plants?.name || 'Растение',
        pos_x: selectedTransplantCell.x + 4, pos_y: selectedTransplantCell.y + 4,
        width: CELL_SIZE - 8, height: CELL_SIZE - 8,
        color: '#4ADE80', plant_id: selectedPot.plant_id,
        planted_year: new Date().getFullYear()
      }).select('id').single()
      if (bedElementError) throw bedElementError
      createdElementId = bedElement?.id

      const { error: potError } = await supabase.from('pots').update({
        status: 'transplanted', transplanted_to_bed_id: selectedBed,
        transplanted_date: new Date().toISOString().split('T')[0]
      }).eq('id', selectedPot.id)
      if (potError) throw potError

      const { error: journalError } = await supabase.from('garden_journal').insert({
        user_id: user.id, plant_id: selectedPot.plant_id,
        pot_id: selectedPot.id, action: 'transplanted',
        details: `Пересажено в ${bedForTransplant?.name || 'грядку'}`,
        created_at: new Date().toISOString()
      })
      if (journalError) console.warn('Не удалось записать событие пересадки в журнал:', journalError)

      if (selectedPot.plants) {
        await reminderService.generateForPlant(user.id, selectedPot.plants, 'transplanted', new Date().toISOString().split('T')[0])
      }

      toast.success('Растение пересажено на грядку')
      setShowTransplantModal(false)
      setSelectedPot(null)
      setSelectedBed(null)
      setSelectedTransplantCell(null)
      setTransplantStep(1)
      loadData()
    } catch (error) {
      if (createdElementId) await supabase.from('bed_elements').delete().eq('id', createdElementId)
      if (createdPlantOnBedId) await supabase.from('plants_on_beds').delete().eq('id', createdPlantOnBedId)
      toast.error(`Не удалось пересадить: ${error.message}`)
    }
  }

  async function loadHistory() {
    const { data } = await supabase
      .from('garden_journal')
      .select('*, plants:plant_id(name), pots:pot_id(custom_name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30)
    if (data) setHistory(data)
    setShowHistory(true)
  }

  function getDaysSince(sowingDate) {
    return Math.floor((new Date() - new Date(sowingDate)) / (1000 * 60 * 60 * 24))
  }

  function getProgress(pot) {
    const daysSince = getDaysSince(pot.sowing_date)
    const daysToTransplant = pot.plants?.days_to_transplant || 45
    return Math.min(100, Math.round((daysSince / daysToTransplant) * 100))
  }

  function getGrowthStage(progress) {
    if (progress < 20) return { label: 'Прорастание', color: 'text-amber-600', bg: 'bg-amber-100', emoji: '🌰' }
    if (progress < 50) return { label: 'Рост', color: 'text-green-600', bg: 'bg-green-100', emoji: '🌿' }
    if (progress < 80) return { label: 'Цветение', color: 'text-pink-600', bg: 'bg-pink-100', emoji: '🌸' }
    return { label: 'Готово к высадке', color: 'text-blue-600', bg: 'bg-blue-100', emoji: '🌻' }
  }

  function getProgressColor(progress) {
    if (progress < 30) return '#F59E0B'
    if (progress < 60) return '#22C55E'
    if (progress < 85) return '#EC4899'
    return '#3B82F6'
  }

  const filteredPots = pots
  .filter(pot => {
    const name = (pot.custom_name || pot.plants?.name || '').toLowerCase()
    const matchesSearch = name.includes(searchTerm.toLowerCase())
    const matchesCategory = !filterCategory || pot.plants?.category_id === filterCategory
    const matchesReady = !filterReadyOnly || getProgress(pot) >= 80
    return matchesSearch && matchesCategory && matchesReady
  })
  .sort((a, b) => {
    switch (sortBy) {
      case 'date-asc': return new Date(a.sowing_date) - new Date(b.sowing_date)
      case 'date-desc': return new Date(b.sowing_date) - new Date(a.sowing_date)
      case 'name-asc': return (a.custom_name || a.plants?.name || '').localeCompare(b.custom_name || b.plants?.name || '')
      case 'name-desc': return (b.custom_name || b.plants?.name || '').localeCompare(a.custom_name || a.plants?.name || '')
      case 'progress-desc': return getProgress(b) - getProgress(a)
      case 'progress-asc': return getProgress(a) - getProgress(b)
      default: return 0
    }
  })

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-green-50 pb-20 sm:pb-0">
      <Header />
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        {loadError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span>Не удалось загрузить рассаду: {loadError}</span>
            <button type="button" onClick={() => { setLoading(true); loadData() }} className="px-4 py-2 bg-white border border-red-200 rounded-lg hover:bg-red-50 font-medium shrink-0">
              Повторить
            </button>
          </div>
        )}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Моя рассада</h1>
            <p className="text-sm text-gray-500 mt-1">{pots.length} активно • {transplantedPots.length} пересажено</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadHistory} className="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              <BookOpen className="w-4 h-4" /> Журнал
            </button>
            <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-xl hover:bg-green-700 text-sm font-medium transition-colors">
              <Plus className="w-4 h-4" /> Посадить семечко
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => setActiveTab('growing')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${activeTab === 'growing' ? 'bg-green-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
            🌱 Рассада ({pots.length})
          </button>
          <button onClick={() => setActiveTab('transplanted')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${activeTab === 'transplanted' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
            📋 Пересажено ({transplantedPots.length})
          </button>
        </div>

        {activeTab === 'growing' && (
          <>
            {pots.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm p-3 mb-4 space-y-2 sm:space-y-0 sm:flex sm:items-center sm:gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input type="text" placeholder="Поиск..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div className="flex items-center gap-2">
                  <select value={filterCategory || ''} onChange={e => setFilterCategory(e.target.value ? parseInt(e.target.value) : null)} className="px-2.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 cursor-pointer">
                    <option value="">Все категории</option>
                    {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>)}
                  </select>
                  <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="px-2.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 cursor-pointer">
                    <option value="date-desc">Сначала новые</option>
                    <option value="date-asc">Сначала старые</option>
                    <option value="name-asc">По алфавиту А-Я</option>
                    <option value="name-desc">По алфавиту Я-А</option>
                    <option value="progress-desc">Сначала готовые</option>
                    <option value="progress-asc">Сначала растущие</option>
                  </select>
                  <div className="flex items-center gap-1.5 px-2 py-1.5">
                    <span className="text-xs text-gray-500 hidden sm:inline">Готов</span>
                    <button onClick={() => setFilterReadyOnly(!filterReadyOnly)} className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${filterReadyOnly ? 'bg-blue-600' : 'bg-gray-300'}`}>
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${filterReadyOnly ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {pots.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-amber-100 rounded-3xl flex items-center justify-center mx-auto mb-6"><Flower className="w-12 h-12 text-amber-500" /></div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Пока нет рассады</h3>
                <p className="text-gray-500 mb-6">Посадите своё первое семечко и отслеживайте рост</p>
                <button onClick={() => setShowAddModal(true)} className="bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700 font-medium">🌱 Посадить первое семечко</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {filteredPots.map(pot => {
                  const progress = getProgress(pot)
                  const stage = getGrowthStage(progress)
                  const progressColor = getProgressColor(progress)
                  const daysSince = getDaysSince(pot.sowing_date)
                  const daysLeft = (pot.plants?.days_to_transplant || 45) - daysSince
                  return (
                    <div key={pot.id} className="bg-white rounded-2xl shadow-sm p-5 hover:shadow-md transition-all group relative overflow-hidden">
                      <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: progressColor }} />
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-3">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${stage.bg}`}>
                            <PlantImage src={pot.plants?.image_url} alt={pot.plants?.name || ''} className="w-12 h-12 rounded-xl object-cover" fallbackClassName="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-800">{pot.custom_name || pot.plants?.name}</h3>
                            {pot.custom_name && <p className="text-sm text-gray-500">{pot.plants?.name}</p>}
                            <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${stage.bg} ${stage.color}`}>{stage.label}</span>
                          </div>
                        </div>
                        <button onClick={() => deletePot(pot.id)} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                      <div className="flex items-center gap-4 mb-4">
                        <div className="relative w-16 h-16 shrink-0">
                          <svg className="w-16 h-16 -rotate-90">
                            <circle cx="32" cy="32" r="28" fill="none" stroke="#f0f0f0" strokeWidth="6" />
                            <circle cx="32" cy="32" r="28" fill="none" stroke={progressColor} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 28}`} strokeDashoffset={`${2 * Math.PI * 28 * (1 - progress / 100)}`} className="transition-all duration-500" />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center"><span className="text-sm font-bold">{progress}%</span></div>
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 text-sm text-gray-600"><Calendar className="w-4 h-4 text-gray-400" /><span>Посеяно: {new Date(pot.sowing_date).toLocaleDateString('ru-RU')}</span></div>
                          <div className="flex items-center gap-2 text-sm text-gray-600"><Clock className="w-4 h-4 text-gray-400" /><span>{daysSince} дней прошло</span>{daysLeft > 0 && <span className="text-xs text-gray-400">• ещё ~{daysLeft} дн.</span>}</div>
                          <div className="flex items-center gap-2 text-sm text-gray-600"><Droplets className="w-4 h-4 text-blue-400" /><span>Полив: раз в {pot.plants?.watering_freq_days} дн.</span></div>
                        </div>
                      </div>
                      <div className="mb-4">
                        <div className="flex justify-between text-[10px] text-gray-400 mb-1"><span>🌰 Посев</span><span>🌿 Рост</span><span>🌸 Цветение</span><span>🌻 Высадка</span></div>
                        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, backgroundColor: progressColor }} /></div>
                      </div>
                      <button onClick={() => openTransplantModal(pot)} className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors ${progress >= 80 ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`} disabled={progress < 80} title={progress < 80 ? `Ещё рано. Нужно ${daysLeft} дней до высадки` : 'Можно пересаживать!'}>
                        <CheckCircle className="w-4 h-4" /><span>{progress >= 80 ? 'Готово к высадке!' : `Рано (ещё ~${daysLeft} дн.)`}</span>
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
            {filteredPots.length === 0 && pots.length > 0 && <div className="text-center py-12 text-gray-500"><p>Ничего не найдено по фильтрам</p></div>}
          </>
        )}

        {activeTab === 'transplanted' && (
          <div className="space-y-3">
            {transplantedPots.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-blue-100 rounded-3xl flex items-center justify-center mx-auto mb-6"><CheckCircle className="w-12 h-12 text-blue-500" /></div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Нет пересаженных растений</h3>
                <p className="text-gray-500">Здесь появятся растения после пересадки на грядку</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {transplantedPots.map(pot => (
                  <div key={pot.id} className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center text-2xl">
                      <PlantImage src={pot.plants?.image_url} alt={pot.plants?.name || ''} className="w-12 h-12 rounded-xl object-cover" fallbackClassName="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">{pot.custom_name || pot.plants?.name}</p>
                      {pot.custom_name && <p className="text-sm text-gray-500">{pot.plants?.name}</p>}
                      <p className="text-xs text-gray-400 mt-1">Пересажено: {pot.transplanted_date ? new Date(pot.transplanted_date).toLocaleDateString('ru-RU') : '—'}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Пересажено</span>
                      <button onClick={() => deletePot(pot.id)} className="text-gray-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
      <MobileNav />

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4"><h2 className="text-xl font-semibold">🌱 Посадить семечко</h2><button onClick={() => setShowAddModal(false)}><X className="w-5 h-5 text-gray-400" /></button></div>
            <div className="space-y-3">
              <div><label className="block text-sm font-medium mb-1">Растение *</label><select value={newPot.plant_id} onChange={e => setNewPot({...newPot, plant_id: e.target.value})} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500/20"><option value="">Выберите растение</option>{plants.map(plant => <option key={plant.id} value={plant.id}>{plant.name}</option>)}</select></div>
              <input type="text" placeholder="Название (необязательно)" value={newPot.custom_name} onChange={e => setNewPot({...newPot, custom_name: e.target.value})} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl" />
              <input type="date" value={newPot.sowing_date} onChange={e => setNewPot({...newPot, sowing_date: e.target.value})} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl" />
              <textarea placeholder="Заметки..." value={newPot.notes} onChange={e => setNewPot({...newPot, notes: e.target.value})} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl" rows={2} />
            </div>
            <div className="flex gap-3 mt-6"><button onClick={addPot} className="flex-1 bg-green-600 text-white py-2.5 rounded-xl hover:bg-green-700 font-medium">Посадить</button><button onClick={() => setShowAddModal(false)} className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl hover:bg-gray-200">Отмена</button></div>
          </div>
        </div>
      )}

      {showTransplantModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">🪴 Пересадка: {selectedPot?.custom_name || selectedPot?.plants?.name}</h2>
              <button onClick={() => { setShowTransplantModal(false); setTransplantStep(1); }}><X className="w-5 h-5 text-gray-400" /></button>
            </div>

            {transplantStep === 1 && (
              <div className="space-y-2">
                <p className="text-sm text-gray-500 mb-3">Выберите участок:</p>
                {gardens.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Нет доступных участков</p>}
                {gardens.map(g => (
                  <button key={g.id} onClick={() => loadBeds(g.id)} className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-green-50 text-left border border-gray-200 hover:border-green-300 transition-all">
                    <span className="text-2xl">🏡</span><div><span className="font-medium text-sm block">{g.name}</span>{g.location && <span className="text-xs text-gray-400">{g.location}</span>}</div>
                  </button>
                ))}
              </div>
            )}

            {transplantStep === 2 && (
              <div className="space-y-2">
                <button onClick={() => setTransplantStep(1)} className="text-sm text-gray-500 hover:text-gray-700 mb-3 flex items-center gap-1">← Назад к участкам</button>
                <p className="text-sm text-gray-500 mb-1">Выберите огород, клумбу или теплицу:</p>
                {beds.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Нет огородов или клумб на этом участке</p>}
                {beds.map(b => (
                  <button key={b.id} onClick={() => selectBedForTransplant(b.id)} className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-green-50 text-left border border-gray-200 hover:border-green-300 transition-all">
                    <span className="text-2xl">{b.type === 'rect' ? '🥬' : b.type === 'flowerbed' ? '🌸' : '🏡'}</span>
                    <div><span className="font-medium text-sm block">{b.name}</span><span className="text-xs text-gray-400">{b.type === 'rect' ? 'Огород' : b.type === 'flowerbed' ? 'Клумба' : 'Теплица'}{b.soil_type && ` • ${b.soil_type}`}</span></div>
                  </button>
                ))}
              </div>
            )}

            {transplantStep === 3 && bedForTransplant && (
              <div className="space-y-3 flex-1 overflow-y-auto">
                <button onClick={() => setTransplantStep(2)} className="text-sm text-gray-500 hover:text-gray-700 mb-2 flex items-center gap-1">
                  ← Назад к выбору грядки
                </button>
                
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-sm font-medium text-gray-700 mb-1">{bedForTransplant.name}</p>
                  <p className="text-xs text-gray-500 mb-3">
                    {bedForTransplant.soil_width || bedForTransplant.width} × {bedForTransplant.soil_height || bedForTransplant.height} см
                    {bedForTransplant.soil_type && ` • ${bedForTransplant.soil_type}`}
                  </p>
                  
                  {/* Мини-карта огорода с грядками-кубиками */}
                  <div className="bg-[#3E2723] rounded-lg p-2 flex items-center justify-center overflow-hidden border-2 border-[#5C4033]">
                    <div 
                      className="relative"
                      style={{ 
                        width: '100%',
                        maxWidth: 350,
                        aspectRatio: `${(bedForTransplant.soil_width || bedForTransplant.width)} / ${(bedForTransplant.soil_height || bedForTransplant.height)}`,
                        maxHeight: 250,
                        backgroundColor: '#3E2723',
                        borderRadius: 4
                      }}
                    >
                      {/* Сетка */}
                      <svg className="absolute inset-0 w-full h-full opacity-15">
                        <defs>
                          <pattern id="tpGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="0.3" />
                          </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#tpGrid)" />
                      </svg>

                      {/* Грядки с кубиками */}
                      {bedRows.length > 0 ? bedRows.map(row => {
                        const CELL_SIZE = 50
                        const cols = Math.max(1, Math.round((row.width - 6) / CELL_SIZE))
                        const rows = Math.max(1, Math.round((row.height - 6) / CELL_SIZE))
                        const actualCellW = (row.width - 6) / cols
                        const actualCellH = (row.height - 6) / rows
                        const scaleX = 100 / (bedForTransplant.soil_width || bedForTransplant.width)
                        const scaleY = 100 / (bedForTransplant.soil_height || bedForTransplant.height)
                        
                        return (
                          <div
                            key={row.id}
                            className="absolute rounded-sm"
                            style={{
                              left: `${row.pos_x * scaleX}%`,
                              top: `${row.pos_y * scaleY}%`,
                              width: `${row.width * scaleX}%`,
                              height: `${row.height * scaleY}%`,
                              background: 'linear-gradient(180deg, #6B4226, #5C3A1E)',
                              border: '1px solid #3E2710',
                              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)',
                              minWidth: 40,
                              minHeight: 30,
                              display: 'grid',
                              gridTemplateColumns: `repeat(${cols}, 1fr)`,
                              gridTemplateRows: `repeat(${rows}, 1fr)`
                            }}
                          >
                            {Array.from({ length: cols * rows }, (_, i) => {
                              const col = i % cols
                              const rowIndex = Math.floor(i / cols)
                              const cellX = row.pos_x + 3 + col * actualCellW
                              const cellY = row.pos_y + 3 + rowIndex * actualCellH
                              const plantHere = bedPlantsData?.find(p => 
                                Math.abs(p.pos_x - cellX) < actualCellW / 2 && Math.abs(p.pos_y - cellY) < actualCellH / 2
                              )
                              const isSelected = selectedTransplantCell?.x === cellX && selectedTransplantCell?.y === cellY
                              
                              return (
                                <div
                                  key={i}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (!plantHere) setSelectedTransplantCell({ x: cellX, y: cellY })
                                  }}
                                  className={`border border-white/10 flex items-center justify-center cursor-pointer transition-colors ${
                                    plantHere ? 'cursor-not-allowed bg-red-500/30' : 
                                    isSelected ? 'bg-green-500/50' : 'hover:bg-white/10'
                                  }`}
                                  title={plantHere ? `🌱 ${plantHere.plant?.name || 'Занято'}` : 'Свободно'}
                                >
                                  {plantHere ? (
                                    <span className="text-[10px]">🌱</span>
                                  ) : isSelected ? (
                                    <span className="text-[10px] text-green-300">✓</span>
                                  ) : (
                                    <span className="text-[8px] text-white/10">+</span>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )
                      }) : (
                        <div className="absolute inset-0 flex items-center justify-center text-white/30 text-sm">
                          <div className="text-center">
                            <span className="text-2xl block mb-1">🥬</span>
                            <p>Нет грядок</p>
                            <p className="text-xs mt-1">Создайте грядки в редакторе огорода</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-2 text-xs">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-500/30 rounded border border-red-500/40"></span> Занято</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500/50 rounded border border-green-400"></span> Выбрано</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 bg-white/5 rounded border border-white/10"></span> Свободно</span>
                  </div>
                  
                  {selectedTransplantCell && (
                    <p className="text-xs text-green-600 text-center mt-2">✅ Клетка выбрана</p>
                  )}
                </div>

                <button onClick={transplant} disabled={!selectedTransplantCell}
                  className="w-full bg-green-600 text-white py-2.5 rounded-xl hover:bg-green-700 disabled:opacity-50 font-medium transition-colors">
                  Пересадить в выбранную клетку
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setShowHistory(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 max-h-[70vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h2 className="text-xl font-semibold">📜 Журнал действий</h2><button onClick={() => setShowHistory(false)}><X className="w-5 h-5 text-gray-400" /></button></div>
            {history.length === 0 ? <p className="text-gray-400 text-center py-8">Пока нет записей</p> : (
              <div className="space-y-2">
                {history.map(entry => (
                  <div key={entry.id} className="p-3 bg-gray-50 rounded-xl text-sm">
                    <div className="flex items-center gap-2 mb-1"><span className="text-lg">{entry.action === 'transplanted' ? '🪴' : entry.action === 'sowed' ? '🌱' : '📝'}</span><span className="font-medium">{entry.plants?.name || entry.pots?.custom_name || 'Растение'}</span></div>
                    <p className="text-gray-600">{entry.details}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(entry.created_at).toLocaleString('ru-RU')}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}