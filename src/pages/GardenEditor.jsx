import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ArrowLeft, Home, Square, Flower2, TreePine, Warehouse, Trash2, Plus, Minus, Eye } from 'lucide-react'
import { Rnd } from 'react-rnd'
import Header from '../components/Header'
import { useReferenceStore } from '../store/referenceStore'

const ZONE_TYPES = [
  { type: 'house', name: 'Здание', icon: '🏠', color: '#D4A574', defaultW: 150, defaultH: 120 },
  { type: 'rect', name: 'Огород', icon: '🥬', color: '#8B5A2B', defaultW: 120, defaultH: 80 },
  { type: 'flowerbed', name: 'Клумба', icon: '🌸', color: '#E8A0BF', defaultW: 100, defaultH: 100 },
  { type: 'tree', name: 'Дерево', icon: '🌳', color: '#2D6A4F', defaultW: 60, defaultH: 60 },
  { type: 'greenhouse', name: 'Теплица', icon: '🏡', color: '#A7C7E7', defaultW: 160, defaultH: 120 },
  { type: 'bush', name: 'Куст', icon: '🪴', color: '#228B22', defaultW: 50, defaultH: 50 },
  { type: 'path', name: 'Дорожка', icon: '🪨', color: '#C4A882', defaultW: 200, defaultH: 20 },
  { type: 'pond', name: 'Водоём', icon: '💧', color: '#4A90D9', defaultW: 150, defaultH: 150 },
]

export default function GardenEditor() {
  const { id } = useParams()
  const [layout, setLayout] = useState(null)
  const [zones, setZones] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedZone, setSelectedZone] = useState(null)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: window.innerWidth / 2 - 100, y: window.innerHeight / 2 - 100 })
  const [dragging, setDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [editingName, setEditingName] = useState(false)
  const [zoneName, setZoneName] = useState('')
  const [showPlantModal, setShowPlantModal] = useState(false)
  const [allPlants, setAllPlants] = useState([])

  const loadData = useCallback(async () => {
    const [{ data: layoutData }, { data: bedsData }] = await Promise.all([
      supabase.from('layouts').select('*').eq('id', id).single(),
      supabase.from('beds').select('*').eq('layout_id', id),
    ])

    if (layoutData) setLayout(layoutData)
    if (bedsData) {
      setZones(bedsData.map(b => ({
        ...b,
        _x: b.pos_x || 400,
        _y: b.pos_y || 300,
        _w: b.width || 100,
        _h: b.height || 80
      })))
    }
    setLoading(false)
  }, [id])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData()
  }, [loadData])

  async function addZone(type) {
    const preset = ZONE_TYPES.find(z => z.type === type)
    const centerX = (-offset.x + window.innerWidth / 2) / scale
    const centerY = (-offset.y + window.innerHeight / 2) / scale

    const { data, error } = await supabase.from('beds').insert({
      layout_id: id,
      type: type,
      name: preset.name,
      pos_x: Math.round(centerX),
      pos_y: Math.round(centerY),
      width: preset.defaultW,
      height: preset.defaultH,
      color: preset.color
    }).select().single()

    if (error) {
      alert(`Не удалось добавить зону: ${error.message}`)
      return
    }
    if (data) setZones([...zones, { ...data, _x: data.pos_x, _y: data.pos_y, _w: data.width, _h: data.height }])
  }

  async function saveZone(zoneId, x, y, w, h) {
    const previousZones = zones
    setZones(zones.map(z => z.id === zoneId ? { ...z, _x: x, _y: y, _w: w, _h: h } : z))
    const { error } = await supabase.from('beds').update({
      pos_x: Math.round(x), pos_y: Math.round(y),
      width: Math.round(w), height: Math.round(h)
    }).eq('id', zoneId)
    if (error) {
      setZones(previousZones)
      alert(`Не удалось сохранить зону: ${error.message}`)
    }
  }

  async function openPlantModal() {
    const data = await useReferenceStore.getState().getPlants()
    setAllPlants(data || [])
    setShowPlantModal(true)
  }

  async function saveZoneName(zoneId, newName) {
    if (!newName.trim()) return

    setZones(zones.map(z => z.id === zoneId ? { ...z, name: newName } : z))
    setSelectedZone(prev => prev ? { ...prev, name: newName } : null)
    const { error } = await supabase.from('beds').update({ name: newName }).eq('id', zoneId)
    if (error) {
      alert(`Не удалось сохранить название: ${error.message}`)
      loadData()
      return
    }
    setEditingName(false)
    setZoneName('')
  }

  async function rotateZone(zoneId) {
    const zone = zones.find(z => z.id === zoneId)
    if (!zone) return
    const newW = zone._h
    const newH = zone._w
    setZones(zones.map(z => z.id === zoneId ? { ...z, _w: newW, _h: newH } : z))
    const { error } = await supabase.from('beds').update({ width: Math.round(newW), height: Math.round(newH) }).eq('id', zoneId)
    if (error) {
      alert(`Не удалось повернуть зону: ${error.message}`)
      loadData()
    }
  }

  async function deleteZone(zoneId) {
    const { error } = await supabase.from('beds').delete().eq('id', zoneId)
    if (error) {
      alert(`Не удалось удалить зону: ${error.message}`)
      return
    }
    setZones(zones.filter(z => z.id !== zoneId))
    setSelectedZone(null)
    setEditingName(false)
  }

  const startDrag = useCallback((e) => {
    if (e.target.closest('.zone-item, button, input')) return
    setDragging(true)
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y })
    setSelectedZone(null)
    setEditingName(false)
  }, [offset])

  const onDrag = useCallback((e) => {
    if (!dragging) return
    setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })
  }, [dragging, dragStart])

  const stopDrag = useCallback(() => setDragging(false), [])

  const handleWheel = useCallback((e) => {
    const delta = e.deltaY > 0 ? -0.05 : 0.05
    setScale(s => Math.min(2, Math.max(0.2, s + delta)))
  }, [])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  )

  return (
    <div className="h-screen flex flex-col bg-gray-200 select-none overflow-hidden">
      <Header />
      
      {/* Верхняя панель */}
      <header className="bg-white/90 backdrop-blur-sm border-b border-gray-200 px-3 py-2 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-2">
          <Link to="/gardens" className="p-1.5 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="font-semibold text-sm">{layout?.name}</h1>
            <p className="text-xs text-gray-500">{zones.length} зон</p>
          </div>
          <Link to={`/garden/${id}`} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500" title="Просмотр">
            <Eye className="w-4 h-4" />
          </Link>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setScale(s => Math.max(0.2, s - 0.1))} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs w-10 text-center font-mono">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(s => Math.min(2, s + 0.1))} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <Plus className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs text-gray-400 ml-2 hidden sm:block">
            🖱️ Зажмите и тяните — двигать холст | Колёсико — зум
          </span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Левая панель с инструментами */}
        <aside className="w-56 bg-white/95 backdrop-blur-sm border-r border-gray-200 flex flex-col shrink-0 z-20 overflow-y-auto shadow-sm">
          {/* Заголовок */}
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">🏗️ Инструменты</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Добавьте зоны на участок</p>
          </div>

          {/* Список типов зон */}
          <div className="p-3 flex flex-col gap-1">
            {ZONE_TYPES.map(zt => (
              <button
                key={zt.type}
                onClick={() => addZone(zt.type)}
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200 text-left w-full"
                title={`Добавить: ${zt.name}`}
              >
                <span className="text-xl w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                  {zt.icon}
                </span>
                <span className="text-sm font-medium text-gray-700">{zt.name}</span>
              </button>
            ))}
          </div>

          {/* Разделитель */}
          <div className="border-t border-gray-100 mx-3 my-2" />

          {/* Панель свойств выделенной зоны */}
          {selectedZone && (selectedZone.type === 'tree' || selectedZone.type === 'bush') && (
            <button onClick={openPlantModal} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 text-green-700 text-xs hover:bg-green-100">
              🌳 Выбрать растение
            </button>
          )}
          {selectedZone ? (
            <div className="p-4 space-y-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Свойства зоны
              </h3>

              {/* Название */}
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Название</label>
                {editingName ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={zoneName}
                      onChange={e => setZoneName(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
                      autoFocus
                      placeholder="Введите название"
                      onKeyDown={e => {
                        if (e.key === 'Enter') saveZoneName(selectedZone.id, zoneName)
                        if (e.key === 'Escape') { setEditingName(false); setZoneName(''); }
                      }}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveZoneName(selectedZone.id, zoneName)}
                        className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
                      >
                        ✓ Сохранить
                      </button>
                      <button
                        onClick={() => { setEditingName(false); setZoneName(''); }}
                        className="px-4 py-2 bg-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-300 transition-colors"
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setZoneName(selectedZone.name || ''); setEditingName(true); }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 bg-gray-50 rounded-lg hover:bg-gray-100 text-sm text-gray-700 transition-colors"
                  >
                    <span>✏️</span>
                    <span className="truncate">{selectedZone.name || 'Без названия'}</span>
                  </button>
                )}
              </div>

              {/* Тип зоны */}
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Тип зоны</label>
                <div className="flex items-center gap-3 text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2.5">
                  <span className="text-xl">
                    {ZONE_TYPES.find(z => z.type === selectedZone.type)?.icon || '🟫'}
                  </span>
                  <span className="font-medium">
                    {ZONE_TYPES.find(z => z.type === selectedZone.type)?.name || selectedZone.type}
                  </span>
                </div>
              </div>

              {/* Размер зоны */}
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Размер (пиксели)</label>
                <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2.5">
                  <span>{Math.round(selectedZone._w)} × {Math.round(selectedZone._h)}</span>
                </div>
              </div>

              {/* Кнопки действий */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={() => rotateZone(selectedZone.id)}
                  className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100 transition-colors"
                >
                  🔄 Повернуть на 90°
                </button>

                <button
                  onClick={() => {
                    if (confirm(`Удалить зону «${selectedZone.name || 'Без названия'}»?`)) {
                      deleteZone(selectedZone.id)
                    }
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> Удалить зону
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4">
              <div className="text-center py-6 text-gray-400">
                <span className="text-3xl block mb-2">👆</span>
                <p className="text-sm">Выберите зону на холсте</p>
                <p className="text-xs mt-1">чтобы изменить её свойства</p>
              </div>
            </div>
          )}

          {/* Подсказки внизу */}
          <div className="mt-auto p-4 border-t border-gray-100">
            <div className="text-xs text-gray-400 space-y-1.5">
              <p className="flex items-center gap-2"><span>🖱️</span> Зажмите — двигать холст</p>
              <p className="flex items-center gap-2"><span>🔄</span> Колёсико — зум</p>
              <p className="flex items-center gap-2"><span>📏</span> Тяните за уголки — размер</p>
              {selectedZone && <p className="flex items-center gap-2"><span>⌨️</span> Enter — сохранить имя</p>}
            </div>
          </div>
        </aside>

        {/* Бесконечный холст */}
        <main
          className="flex-1 overflow-hidden relative"
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
            {/* Сетка */}
            <svg className="absolute" style={{ width: 20000, height: 20000, left: -10000, top: -10000 }}>
              <defs>
                <pattern id="grid-small" width="50" height="50" patternUnits="userSpaceOnUse">
                  <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e5e7eb" strokeWidth="0.3" />
                </pattern>
                <pattern id="grid-large" width="250" height="250" patternUnits="userSpaceOnUse">
                  <rect width="250" height="250" fill="url(#grid-small)" />
                  <path d="M 250 0 L 0 0 0 250" fill="none" stroke="#d1d5db" strokeWidth="0.8" />
                </pattern>
              </defs>
              <rect width="20000" height="20000" fill="url(#grid-large)" opacity={scale < 0.5 ? 0.3 : 0.6} />
            </svg>

            {/* Зоны */}
            {zones.map(zone => {
              const isCircle = zone.type === 'tree' || zone.type === 'bush' || zone.type === 'pond'
              const isPath = zone.type === 'path'
              
              return (
                <Rnd
                  key={zone.id}
                  position={{ x: zone._x, y: zone._y }}
                  size={{ width: zone._w, height: zone._h }}
                  onDragStop={(_, d) => saveZone(zone.id, d.x, d.y, zone._w, zone._h)}
                  onResizeStop={(_, __, ref, ___, pos) => saveZone(zone.id, pos.x, pos.y, parseInt(ref.style.width), parseInt(ref.style.height))}
                  onClick={(e) => { e.stopPropagation(); setSelectedZone(zone); }}
                  dragGrid={[10, 10]}
                  resizeGrid={[10, 10]}
                  enableResizing={zone.type !== 'tree' && zone.type !== 'bush'}
                  scale={scale}
                  className="zone-item"
                >
                  <div
                    className="w-full h-full border-2 flex items-center justify-center cursor-move shadow-sm hover:shadow-md transition-shadow"
                    style={{
                      backgroundColor: zone.color + (isPath ? '30' : '50'),
                      borderColor: selectedZone?.id === zone.id ? '#22C55E' : zone.color + '70',
                      borderRadius: isCircle ? '50%' : zone.type === 'flowerbed' ? '16px' : '6px',
                      borderStyle: zone.type === 'greenhouse' ? 'dashed' : isPath ? 'dotted' : 'solid',
                      borderWidth: isPath ? 1 : 2
                    }}
                  >
                    <div className="text-center pointer-events-none">
                      <span className="text-2xl block">
                        {ZONE_TYPES.find(z => z.type === zone.type)?.icon || '🟫'}
                      </span>
                      <span className="text-[10px] font-medium text-gray-700 bg-white/60 px-1.5 py-0.5 rounded">
                        {zone.name}
                      </span>
                    </div>
                  </div>
                </Rnd>
              )
            })}
          </div>
        </main>
      </div>
      {showPlantModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowPlantModal(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 max-h-[70vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Выберите растение</h2>
            {allPlants.filter(p => p.planting_method === 'perennial').map(plant => (
              <button key={plant.id} onClick={async () => {
                const { error } = await supabase.from('beds').update({ plant_id: plant.id }).eq('id', selectedZone.id)
                if (error) {
                  alert(`Не удалось выбрать растение: ${error.message}`)
                  return
                }
                setZones(zones.map(z => z.id === selectedZone.id ? { ...z, plant_id: plant.id } : z))
                setSelectedZone({ ...selectedZone, plant_id: plant.id })
                setShowPlantModal(false)
              }} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-green-50 text-left">
                {plant.image_url ? <img src={plant.image_url} className="w-10 h-10 rounded-lg object-cover" /> : <span className="text-2xl">🌱</span>}
                <span className="font-medium text-sm">{plant.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}