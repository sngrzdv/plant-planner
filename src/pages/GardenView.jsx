import { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ArrowLeft, Edit, Droplets, Calendar, X, MapPin, Plus, Minus, Search } from 'lucide-react'
import Header from '../components/Header'
import { useAuthStore } from '../store/authStore'
import { reminderService } from '../services/reminderService'
import { useReferenceStore } from '../store/referenceStore'

const ZONE_ICONS = {
  house: '🏠', rect: '🥬', flowerbed: '🌸', tree: '🌳', greenhouse: '🏡', bush: '🪴', path: '🪨', pond: '💧',
}
const ZONE_NAMES = {
  house: 'Дом', rect: 'Грядка', flowerbed: 'Клумба', tree: 'Дерево', greenhouse: 'Теплица', bush: 'Куст', path: 'Дорожка', pond: 'Водоём'
}

export default function GardenView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [layout, setLayout] = useState(null)
  const [zones, setZones] = useState([])
  const [selectedZone, setSelectedZone] = useState(null)
  const [plants, setPlants] = useState([])
  const [loading, setLoading] = useState(true)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: window.innerWidth / 2 - 100, y: window.innerHeight / 2 - 100 })
  const [dragging, setDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  
  const [showPlantModal, setShowPlantModal] = useState(false)
  const [allPlants, setAllPlants] = useState([])
  const [searchPlant, setSearchPlant] = useState('')
  const [planting, setPlanting] = useState(false)

  const loadData = useCallback(async () => {
    const [{ data: l }, { data: z }] = await Promise.all([
      supabase.from('layouts').select('*').eq('id', id).single(),
      supabase.from('beds').select('*, plant:plant_id(id, name)').eq('layout_id', id),
    ])

    if (l) setLayout(l)
    if (z) setZones(z)
    
    setLoading(false)
  }, [id])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData()
  }, [loadData])

  async function clickZone(zone) {
    setSelectedZone(zone)
    
    const [{ data: plantsOnBed }, { data: bedElements }] = await Promise.all([
      supabase
        .from('plants_on_beds')
        .select('*, plants:plant_id(id, name, watering_freq_days, maturation_days, image_url)')
        .eq('bed_id', zone.id),
      supabase
        .from('bed_elements')
        .select('*, plant:plant_id(id, name, watering_freq_days, maturation_days, image_url)')
        .eq('bed_id', zone.id)
        .eq('type', 'plant_spot'),
    ])

    // Объединяем оба списка
    const allZonePlants = [
      ...(plantsOnBed || []).map(p => ({
        id: p.id,
        plants: p.plants,
        source: p.source_type === 'pot' ? '🪴 Из рассады' : '🌱 Посажено',
        watering: p.plants?.watering_freq_days,
        maturation: p.plants?.maturation_days
      })),
      ...(bedElements || []).map(p => ({
        id: p.id,
        plants: p.plant,
        source: '📐 Из редактора грядки',
        watering: p.plant?.watering_freq_days,
        maturation: p.plant?.maturation_days
      }))
    ]

    setPlants(allZonePlants)
  }

  function doubleClickZone(zone) {
    if (zone.type === 'rect' || zone.type === 'flowerbed' || zone.type === 'greenhouse') {
      navigate(`/bed/${zone.id}/edit`)
    }
  }

  const startDrag = (e) => {
    if (e.target.closest('.zone-item')) return
    setDragging(true)
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y })
  }
  const onDrag = (e) => { if (!dragging) return; setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }) }
  const stopDrag = () => setDragging(false)

  const handleWheel = (e) => {
    setScale(s => Math.min(2, Math.max(0.2, s + (e.deltaY > 0 ? -0.1 : 0.1))))
  }

  async function openPlantModal() {
    const data = await useReferenceStore.getState().getPlants()
    setAllPlants(data || [])
    setSearchPlant('')
    setShowPlantModal(true)
  }

  async function plantOnZone(plantId) {
    setPlanting(true)

    try {
      const { error: bedError } = await supabase
        .from('beds')
        .update({ plant_id: plantId })
        .eq('id', selectedZone.id)
      if (bedError) throw bedError

      const { error: plantError } = await supabase.from('plants_on_beds').insert({
        bed_id: selectedZone.id,
        plant_id: plantId,
        planted_date: new Date().toISOString().split('T')[0],
        source_type: selectedZone.type === 'tree' || selectedZone.type === 'bush' ? 'seed' : 'seed',
        stage: selectedZone.type === 'tree' || selectedZone.type === 'bush' ? 'adult' : 'seedling'
      })
      if (plantError) throw plantError

      const { data: plantData } = await supabase.from('plants').select('*').eq('id', plantId).single()
      if (plantData) {
        const { user } = useAuthStore.getState()
        if (user) {
          await reminderService.generateForPlant(user.id, plantData, 'planted', new Date().toISOString().split('T')[0])
        }
      }
      setSelectedZone({ ...selectedZone, plant_id: plantId })
      clickZone(selectedZone)
      setShowPlantModal(false)
    } catch (error) {
      alert(`Не удалось посадить растение: ${error.message}`)
    } finally {
      setPlanting(false)
    }
  }

  const filteredPlants = allPlants.filter(p => 
    p.name.toLowerCase().includes(searchPlant.toLowerCase())
  )

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  )

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      <Header />
      
      {/* Верхняя панель */}
      <div className="bg-white border-b px-4 py-2 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-2">
          <Link to="/gardens" className="p-1.5 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-4 h-4" /></Link>
          <div>
            <h1 className="font-semibold text-sm">{layout?.name}</h1>
            {layout?.location && <p className="text-xs text-gray-500"><MapPin className="w-3 h-3 inline" /> {layout.location}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setScale(s => Math.max(0.2, s - 0.1))} className="p-1.5 hover:bg-gray-100 rounded-lg"><Minus className="w-3.5 h-3.5" /></button>
          <span className="text-xs w-10 text-center font-mono">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(s => Math.min(2, s + 0.1))} className="p-1.5 hover:bg-gray-100 rounded-lg"><Plus className="w-3.5 h-3.5" /></button>
          <div className="w-px h-5 bg-gray-300 mx-1" />
          <Link to={`/garden/${id}/edit`} className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors">
            <Edit className="w-3.5 h-3.5" /> Редактировать
          </Link>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Карта участка */}
        <main
          className="flex-1 overflow-hidden relative bg-gray-50"
          onMouseDown={startDrag}
          onMouseMove={onDrag}
          onMouseUp={stopDrag}
          onMouseLeave={stopDrag}
          onWheel={handleWheel}
          style={{ cursor: dragging ? 'grabbing' : 'grab' }}
        >
          <div
            className="absolute"
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
              transformOrigin: '0 0'
            }}
          >
            {/* Однородный светлый фон */}
            <div
              className="relative rounded-xl shadow-md"
              style={{ 
                width: 6000, 
                height: 4000,
                backgroundColor: '#f8faf9'
              }}
            >
              {/* Лёгкая сетка */}
              <svg className="absolute inset-0 w-full h-full opacity-30">
                <defs>
                  <pattern id="viewGrid" width="50" height="50" patternUnits="userSpaceOnUse">
                    <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#d1d5db" strokeWidth="0.3" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#viewGrid)" />
              </svg>

                {zones.map(zone => (
                  <div
                    key={zone.id}
                    onClick={() => clickZone(zone)}
                    onDoubleClick={() => doubleClickZone(zone)}
                    className="zone-item absolute border-2 flex items-center justify-center cursor-pointer hover:brightness-95 transition-all"
                    style={{
                      left: zone.pos_x, top: zone.pos_y,
                      width: zone.width, height: zone.height,
                      backgroundColor: zone.color + '50',
                      borderColor: selectedZone?.id === zone.id ? '#22C55E' : zone.color + '60',
                      borderRadius: zone.type === 'tree' || zone.type === 'bush' || zone.type === 'pond' ? '50%' : zone.type === 'flowerbed' ? '16px' : '6px',
                      borderStyle: zone.type === 'greenhouse' ? 'dashed' : zone.type === 'path' ? 'dotted' : 'solid',
                      borderWidth: selectedZone?.id === zone.id ? 3 : 2
                    }}
                    title={zone.type === 'rect' || zone.type === 'flowerbed' ? 'Двойной клик — открыть грядку' : ''}
                  >
                    <div className="text-center pointer-events-none">
                      {/* Иконка зоны или признак посаженного растения */}
                      <span className="text-xl sm:text-2xl block">
                        {zone.plant_id ? (
                          // Если посажено растение — показываем 🌳 или 🌿
                          zone.type === 'tree' ? '🌳' : zone.type === 'bush' ? '🪴' : '🌿'
                        ) : (
                          ZONE_ICONS[zone.type] || '🟫'
                        )}
                      </span>
                      
                      {/* Название зоны или название растения */}
                      <span className="text-[10px] sm:text-xs font-medium text-gray-700 bg-white/60 px-1.5 py-0.5 rounded">
                        {zone.plant?.name || zone.name}
                      </span>                     
                      {/* Бейджик "Посажено" */}
                      {zone.plant_id && (
                        <span className="text-[8px] text-white/80 bg-green-600/70 px-1 py-0.5 rounded mt-0.5 inline-block">
                          Посажено
                        </span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </main>

        {/* Боковая панель с информацией о зоне */}
        {selectedZone ? (
          <div className="w-full lg:w-80 bg-white border-l shadow-lg p-5 space-y-4 shrink-0 overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">{selectedZone.name}</h3>
              <button onClick={() => setSelectedZone(null)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="text-xl">{ZONE_ICONS[selectedZone.type]}</span>
              <span>{ZONE_NAMES[selectedZone.type]}</span>
            </div>
            
            {selectedZone.soil_type && <p className="text-sm text-gray-500">🌍 Почва: {selectedZone.soil_type}</p>}
            {selectedZone.notes && <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded-lg">{selectedZone.notes}</p>}

            {(selectedZone.type === 'rect' || selectedZone.type === 'flowerbed' || selectedZone.type === 'greenhouse') && (
              <div className="flex gap-2">
                <button onClick={() => navigate(`/bed/${selectedZone.id}/edit`)} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                  ✏️ Редактировать
                </button>
                <button onClick={openPlantModal} className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
                  🌱 Посадить
                </button>
              </div>
            )}

            {(selectedZone.type === 'tree' || selectedZone.type === 'bush') && (
              <div className="flex gap-2">
                <button onClick={openPlantModal} className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
                  🌳 Посадить растение
                </button>
              </div>
            )}

            <div className="border-t pt-3">
              <h4 className="text-sm font-medium mb-3">🌱 Растения ({plants.length})</h4>
              {plants.length === 0 ? (
                <p className="text-sm text-gray-400">Пока ничего не посажено</p>
              ) : (
                <div className="space-y-2">
                  {plants.map(p => (
                    <div key={p.id} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl">
                      {p.plants?.image_url ? (
                        <img src={p.plants.image_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                        <span className="text-2xl">🌱</span>
                      )}
                      <div>
                        <p className="font-medium text-sm">{p.plants?.name}</p>
                        <div className="flex gap-2 text-xs text-gray-500 mt-0.5">
                          <span className="flex items-center gap-0.5"><Droplets className="w-3 h-3" /> раз в {p.watering || p.plants?.watering_freq_days} дн.</span>
                          <span className="flex items-center gap-0.5"><Calendar className="w-3 h-3" /> {p.maturation || p.plants?.maturation_days} дн.</span>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5">{p.source}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="w-full lg:w-72 bg-white border-l p-5 flex items-center justify-center shrink-0">
            <p className="text-gray-400 text-sm text-center">
              Кликните на зону участка,<br/>чтобы увидеть информацию
              <br/><br/>
              <span className="text-xs">🖱️ Двойной клик по грядке —<br/>открыть редактор грядки</span>
            </p>
          </div>
        )}
      </div>

      {showPlantModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 max-h-[80vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Выберите растение</h2>
              <button onClick={() => setShowPlantModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text" placeholder="Поиск..."
                value={searchPlant} onChange={e => setSearchPlant(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
                autoFocus
              />
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {filteredPlants.map(plant => (
                <button
                  key={plant.id}
                  onClick={() => plantOnZone(plant.id)}
                  disabled={planting}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-green-50 transition-colors text-left disabled:opacity-50 border border-transparent hover:border-green-200"
                >
                  {plant.image_url ? (
                    <img src={plant.image_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                  ) : (
                    <span className="text-2xl">🌱</span>
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-sm">{plant.name}</p>
                    <p className="text-xs text-gray-500">
                      💧 раз в {plant.watering_freq_days} дн. | 📅 {plant.maturation_days} дн.
                    </p>
                  </div>
                  <Plus className="w-4 h-4 text-green-600" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}