import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ArrowLeft, Save, Plus, Trash2, Minus, X, Search, Ruler, Grid3X3, Move, Droplets, Calendar, Sprout } from 'lucide-react'
import { Rnd } from 'react-rnd'
import Header from '../components/Header'
import { useAuthStore } from '../store/authStore'
import { reminderService } from '../services/reminderService'

const THEME = {
  soil: { base: '#a0826b', border: '#6B5443', highlight: '#8B7355' },
  bed: { 
    default: 'linear-gradient(180deg, #6B4226, #5C3A1E)',
    selected: 'linear-gradient(180deg, #7A5230, #6B4226)',
    border: '#3E2710',
    highlight: '#A8FF80'
  }
}

const SIZE_PRESETS = [
  { label: 'Маленький', desc: '3×2 м', width: 300, height: 200, icon: '🪴' },
  { label: 'Средний', desc: '5×4 м', width: 500, height: 400, icon: '🌿' },
  { label: 'Большой', desc: '7×5 м', width: 700, height: 500, icon: '🌳' },
  { label: 'Огромный', desc: '10×7 м', width: 1000, height: 700, icon: '🏡' },
]

const CELL_SIZE = 50

const Tooltip = ({ children, text, position = 'top' }) => (
  <div className="group relative inline-flex">
    {children}
    <div className={`absolute ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} left-1/2 -translate-x-1/2 px-2.5 py-1.5 bg-gray-900/95 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap pointer-events-none z-50 backdrop-blur-sm shadow-lg border border-gray-700/50`}>
      {text}
      <div className={`absolute ${position === 'top' ? 'top-full border-t-gray-900/95' : 'bottom-full border-b-gray-900/95'} left-1/2 -translate-x-1/2 border-4 border-transparent`}></div>
    </div>
  </div>
)

export default function BedEditor() {
  const { id } = useParams()
  const [bed, setBed] = useState(null)
  const [beds, setBeds] = useState([])
  const [bedPlants, setBedPlants] = useState([])
  const [allPlants, setAllPlants] = useState([])
  const [loading, setLoading] = useState(true)
  const [scale, setScale] = useState(0.7)
  const [offset, setOffset] = useState({ x: 30, y: 30 })
  const [dragging, setDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [draggingBed, setDraggingBed] = useState(false)
  
  const [showPlantModal, setShowPlantModal] = useState(false)
  const [selectedCell, setSelectedCell] = useState(null)
  const [searchPlant, setSearchPlant] = useState('')
  const [selectedSubBed, setSelectedSubBed] = useState(null)
  const [dragOverCell, setDragOverCell] = useState(null)

  const [showSizeSetup, setShowSizeSetup] = useState(false)
  const [gardenWidth, setGardenWidth] = useState(500)
  const [gardenHeight, setGardenHeight] = useState(400)
  const [showTutorial, setShowTutorial] = useState(false)

  // Боковая панель информации
  const [selectedPlantInfo, setSelectedPlantInfo] = useState(null)
  const [showPlantInfo, setShowPlantInfo] = useState(false)

  async function loadData() {
    const { data: b } = await supabase.from('beds').select('*').eq('id', id).single()
    if (b) {
      setBed(b)
      if (!b.soil_width || b.soil_width < 100) {
        setShowSizeSetup(true)
        setGardenWidth(b.soil_width || 500)
        setGardenHeight(b.soil_height || 400)
      } else {
        setGardenWidth(b.soil_width)
        setGardenHeight(b.soil_height)
      }
    }

    const { data: elements } = await supabase
      .from('bed_elements')
      .select('*, plant:plant_id(id, name, image_url, watering_freq_days, maturation_days, planting_method, difficulty, scientific_facts)')
      .eq('bed_id', id)

    if (elements) {
      setBeds(elements.filter(e => e.type === 'row').map(r => ({ ...r, _x: r.pos_x, _y: r.pos_y, _w: r.width, _h: r.height })))
      setBedPlants(elements.filter(e => e.type === 'plant_spot').map(p => ({ ...p, _x: p.pos_x, _y: p.pos_y, _w: p.width, _h: p.height })))
    }

    const { data: ap } = await supabase.from('plants').select('*, category:category_id(id, name, icon)').order('name')
    if (ap) setAllPlants(ap)

    setLoading(false)
  }

  useEffect(() => {
    loadData()
    const hasSeenTutorial = localStorage.getItem('bedEditorTutorial')
    if (!hasSeenTutorial) {
      setTimeout(() => setShowTutorial(true), 1500)
    }
  }, [id])

  async function applyGardenSize(width, height) {
    await supabase.from('beds').update({ soil_width: width, soil_height: height }).eq('id', id)
    setGardenWidth(width)
    setGardenHeight(height)
    setBed({ ...bed, soil_width: width, soil_height: height })
    setShowSizeSetup(false)
  }

  function isOverlapping(bed1, bed2) {
    if (bed1.id === bed2.id) return false
    return !(bed1._x + bed1._w <= bed2._x || bed2._x + bed2._w <= bed1._x || bed1._y + bed1._h <= bed2._y || bed2._y + bed2._h <= bed1._y)
  }

  function hasOverlap(currentBedId, x, y, w, h) {
    const testBed = { id: currentBedId, _x: x, _y: y, _w: w, _h: h }
    return beds.some(b => isOverlapping(testBed, b))
  }

  async function checkCompatibility(newPlant, cellX, cellY) {
    const neighbors = bedPlants.filter(p => Math.abs(p._x - cellX) < CELL_SIZE * 2 && Math.abs(p._y - cellY) < CELL_SIZE * 2 && p.plant_id !== newPlant.id)
    if (neighbors.length === 0) return true

    for (const neighbor of neighbors) {
      const { data: companions } = await supabase.from('plant_companions').select('*').or(`plant_id.eq.${newPlant.id},companion_id.eq.${newPlant.id}`)
      if (companions && companions.length > 0) {
        const badMatch = companions.find(c => c.relationship === 'bad' && (c.plant_id === neighbor.plant_id || c.companion_id === neighbor.plant_id))
        if (badMatch) {
          alert(`⚠️ ${newPlant.name} и ${neighbor.plant?.name || 'сосед'} — плохие соседи!\n\n${badMatch.description || 'Не рекомендуется сажать рядом.'}`)
          return false
        }
      }
    }
    return true
  }

  async function addSubBed(cols = 3, rows = 2) {
    const w = cols * CELL_SIZE + 6
    const h = rows * CELL_SIZE + 6
    let x = 20, y = 20, placed = false
    for (let attempt = 0; attempt < 100; attempt++) {
      if (!hasOverlap('new', x, y, w, h)) { placed = true; break }
      x += CELL_SIZE
      if (x + w > gardenWidth - 20) { x = 20; y += CELL_SIZE }
    }
    if (!placed) { alert('🪴 Недостаточно места!'); return }

    const currentYear = new Date().getFullYear()
    const { data, error } = await supabase.from('bed_elements').insert({
      bed_id: id, type: 'row', name: 'Грядка',
      pos_x: x, pos_y: y, width: w, height: h, color: '#6B4226', planted_year: currentYear
    }).select().single()
    if (!error && data) setBeds([...beds, { ...data, _x: data.pos_x, _y: data.pos_y, _w: data.width, _h: data.height }])
  }

  async function deleteSubBed(bedId) {
    await supabase.from('bed_elements').delete().eq('id', bedId)
    setBeds(beds.filter(r => r.id !== bedId))
    setSelectedSubBed(null)
  }

  async function saveSubBed(bedId, x, y, w, h) {
    let snappedW = Math.round(w / CELL_SIZE) * CELL_SIZE + 6
    let snappedH = Math.round(h / CELL_SIZE) * CELL_SIZE + 6
    if (x < 0) x = 0
    if (y < 0) y = 0
    if (x + snappedW > gardenWidth) snappedW = gardenWidth - x
    if (y + snappedH > gardenHeight) snappedH = gardenHeight - y

    if (hasOverlap(bedId, x, y, snappedW, snappedH)) {
      const oldBed = beds.find(r => r.id === bedId)
      setBeds(beds.map(r => r.id === bedId ? { ...r, _x: oldBed._x, _y: oldBed._y } : r))
      return
    }

    const oldBed = beds.find(r => r.id === bedId)
    const dx = x - oldBed._x
    const dy = y - oldBed._y
    setBeds(beds.map(r => r.id === bedId ? { ...r, _x: x, _y: y, _w: snappedW, _h: snappedH } : r))
    
    const updatedPlants = bedPlants.map(p => {
      if (p._x >= oldBed._x && p._x <= oldBed._x + oldBed._w && p._y >= oldBed._y && p._y <= oldBed._y + oldBed._h) {
        return { ...p, _x: p._x + dx, _y: p._y + dy }
      }
      return p
    })
    setBedPlants(updatedPlants)

    await supabase.from('bed_elements').update({ pos_x: Math.round(x), pos_y: Math.round(y), width: snappedW, height: snappedH }).eq('id', bedId)
    for (const plant of updatedPlants) {
      if (plant._x !== bedPlants.find(bp => bp.id === plant.id)?._x) {
        await supabase.from('bed_elements').update({ pos_x: Math.round(plant._x), pos_y: Math.round(plant._y) }).eq('id', plant.id)
      }
    }
  }

  async function plantInCell(plant) {
    if (!selectedCell) return
    const isCompatible = await checkCompatibility(plant, selectedCell.x, selectedCell.y)
    if (!isCompatible) return

    const currentYear = new Date().getFullYear()
    const { data, error } = await supabase.from('bed_elements').insert({
      bed_id: id, type: 'plant_spot', name: plant.name,
      pos_x: selectedCell.x + 4, pos_y: selectedCell.y + 4,
      width: CELL_SIZE - 8, height: CELL_SIZE - 8,
      color: '#4ADE80', plant_id: plant.id, planted_year: currentYear
    }).select('*, plant:plant_id(id, name, image_url, watering_freq_days, maturation_days, planting_method, difficulty, scientific_facts)').single()

    if (!error && data) {
      setBedPlants([...bedPlants, { ...data, _x: data.pos_x, _y: data.pos_y, _w: data.width, _h: data.height }])
      const { user } = useAuthStore.getState()
      if (user) await reminderService.generateForPlant(user.id, plant, 'planted', new Date().toISOString().split('T')[0])
    }
    setShowPlantModal(false)
    setSelectedCell(null)
  }

  async function handleDropOnCell(e, subBedId, cellX, cellY) {
    e.preventDefault(); e.stopPropagation(); setDragOverCell(null)
    const plantId = parseInt(e.dataTransfer.getData('plantId'))
    if (!plantId) return
    const plant = allPlants.find(p => p.id === plantId)
    if (!plant) return
    if (bedPlants.find(p => Math.abs(p._x - cellX) < 20 && Math.abs(p._y - cellY) < 20)) { alert('Эта клетка уже занята!'); return }
    const isCompatible = await checkCompatibility(plant, cellX, cellY)
    if (!isCompatible) return
    setSelectedCell({ bedId: subBedId, x: cellX, y: cellY })
    await plantInCellDirect(plant, cellX, cellY)
  }

  async function plantInCellDirect(plant, cellX, cellY) {
    const currentYear = new Date().getFullYear()
    const { data, error } = await supabase.from('bed_elements').insert({
      bed_id: id, type: 'plant_spot', name: plant.name,
      pos_x: cellX + 4, pos_y: cellY + 4,
      width: CELL_SIZE - 8, height: CELL_SIZE - 8,
      color: '#4ADE80', plant_id: plant.id, planted_year: currentYear
    }).select('*, plant:plant_id(id, name, image_url, watering_freq_days, maturation_days, planting_method, difficulty, scientific_facts)').single()

    if (!error && data) {
      setBedPlants([...bedPlants, { ...data, _x: data.pos_x, _y: data.pos_y, _w: data.width, _h: data.height }])
      const { user } = useAuthStore.getState()
      if (user) await reminderService.generateForPlant(user.id, plant, 'planted', new Date().toISOString().split('T')[0])
    }
  }

  const startDrag = useCallback((e) => {
    if (e.target?.closest?.('.sub-bed, .react-draggable, button, input, [draggable]')) return
    setDragging(true); setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y })
  }, [offset])

  const onDrag = useCallback((e) => { if (!dragging) return; setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }) }, [dragging, dragStart])
  const stopDrag = useCallback(() => setDragging(false), [])

  const handleWheel = useCallback((e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      setScale(s => Math.min(2, Math.max(0.3, s + delta)))
    }
  }, [])

  function handleCellClick(bedId, cellX, cellY) {
    const existingPlant = bedPlants.find(p => Math.abs(p._x - cellX) < 20 && Math.abs(p._y - cellY) < 20)
    if (existingPlant) {
      setSelectedPlantInfo(existingPlant)
      setShowPlantInfo(true)
      return
    }
    setSelectedCell({ bedId, x: cellX, y: cellY })
    setShowPlantModal(true)
  }

  const filteredPlants = allPlants.filter(p => p.name.toLowerCase().includes(searchPlant.toLowerCase()) || p.category?.name?.toLowerCase().includes(searchPlant.toLowerCase()))

  const closeTutorial = () => { setShowTutorial(false); localStorage.setItem('bedEditorTutorial', 'true') }

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-green-50 flex items-center justify-center">
      <div className="text-center"><div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div><p className="text-gray-600 text-sm">Загружаем ваш огород...</p></div>
    </div>
  )

  if (showSizeSetup) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-green-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-8 border border-amber-100">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner"><Grid3X3 className="w-8 h-8 text-green-600" /></div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Настройка {bed?.name || 'огорода'}</h2>
            <p className="text-gray-500 mt-1">Выберите размер поля огорода</p>
            <p className="text-xs text-gray-400 mt-1">Этот размер не влияет на отображение на участке</p>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {SIZE_PRESETS.map(p => (
              <button key={p.width} onClick={() => applyGardenSize(p.width, p.height)} className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-gray-200 hover:border-green-400 hover:bg-gradient-to-br hover:from-green-50 hover:to-emerald-50/50 transition-all duration-200 group">
                <span className="text-3xl group-hover:scale-110 transition-transform">{p.icon}</span><span className="font-medium text-sm text-gray-700">{p.label}</span><span className="text-xs text-gray-400">{p.desc}</span>
              </button>
            ))}
          </div>
          <div className="border-t border-gray-100 pt-4">
            <p className="text-sm font-medium text-gray-700 mb-3">📐 Свой размер (в сантиметрах):</p>
            <div className="flex items-center gap-3">
              <div className="flex-1"><label className="text-xs text-gray-400 mb-1 block">Ширина</label><input type="number" value={gardenWidth} onChange={e => setGardenWidth(Math.max(100, parseInt(e.target.value) || 300))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400 transition-all" placeholder="Ширина" /></div>
              <span className="text-gray-300 text-lg">×</span>
              <div className="flex-1"><label className="text-xs text-gray-400 mb-1 block">Длина</label><input type="number" value={gardenHeight} onChange={e => setGardenHeight(Math.max(100, parseInt(e.target.value) || 200))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400 transition-all" placeholder="Длина" /></div>
            </div>
            <button onClick={() => applyGardenSize(gardenWidth, gardenHeight)} className="w-full mt-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 font-medium shadow-lg shadow-green-500/25 transition-all active:scale-98">✨ Создать огород</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
      {showTutorial && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={closeTutorial}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-bold text-gray-800">🌱 Добро пожаловать!</h3><button onClick={closeTutorial} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button></div>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start gap-3"><span className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">1</span><p>Выберите размер грядки на левой панели</p></div>
              <div className="flex items-start gap-3"><span className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">2</span><p>Перетащите грядку или растение из каталога</p></div>
              <div className="flex items-start gap-3"><span className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">3</span><p>Кликните на клетку чтобы посадить растение</p></div>
              <div className="flex items-start gap-3"><span className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">4</span><p>Используйте <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">Ctrl + колёсико</kbd> для масштабирования</p></div>
            </div>
            <button onClick={closeTutorial} className="w-full mt-6 py-2.5 bg-green-500 text-white rounded-xl hover:bg-green-600 font-medium transition-colors">Понятно, начинаем! 🚀</button>
          </div>
        </div>
      )}

      <header className="bg-white/90 backdrop-blur-md border-b border-gray-200 px-4 py-2.5 flex items-center justify-between shrink-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <Tooltip text="Вернуться к плану участка"><Link to={`/garden/${bed?.layout_id}`} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><ArrowLeft className="w-4 h-4 text-gray-600" /></Link></Tooltip>
          <div><h1 className="font-bold text-sm text-gray-800">{bed?.name}</h1><p className="text-xs text-gray-500">{gardenWidth}×{gardenHeight} см • {beds.length} грядок • {bedPlants.length} растений</p></div>
        </div>
        <div className="flex items-center gap-1.5">
          <Tooltip text="Настройки размера поля"><button onClick={() => setShowSizeSetup(true)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><Ruler className="w-4 h-4 text-gray-500" /></button></Tooltip>
          <div className="flex items-center bg-gray-100 rounded-xl p-0.5">
            <Tooltip text="Уменьшить"><button onClick={() => setScale(s => Math.max(0.3, s - 0.1))} className="p-1.5 hover:bg-white rounded-lg transition-colors"><Minus className="w-3.5 h-3.5 text-gray-600" /></button></Tooltip>
            <span className="text-xs w-11 text-center font-medium text-gray-700">{Math.round(scale * 100)}%</span>
            <Tooltip text="Увеличить"><button onClick={() => setScale(s => Math.min(2, s + 0.1))} className="p-1.5 hover:bg-white rounded-lg transition-colors"><Plus className="w-3.5 h-3.5 text-gray-600" /></button></Tooltip>
          </div>
          <Tooltip text="Сохранить изменения"><button onClick={() => alert('✅ Все изменения сохранены!')} className="flex items-center gap-1.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-medium hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg shadow-green-500/20 active:scale-98"><Save className="w-3.5 h-3.5" /> Сохранить</button></Tooltip>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-56 bg-white/95 backdrop-blur-sm border-r border-gray-200 flex flex-col shrink-0 z-20 shadow-sm">
          <div className="p-3 border-b border-gray-100">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Грядки</span>
            <div className="grid grid-cols-2 gap-1.5 mt-1.5">
              {[[2,2], [3,2], [3,3], [4,3]].map(([c, r]) => (
                <button key={`${c}${r}`} onClick={() => addSubBed(c, r)} className="flex flex-col items-center gap-0.5 py-2 px-1 bg-gradient-to-b from-amber-50 to-amber-100/50 text-amber-800 rounded-xl border border-amber-200 hover:from-amber-100 hover:to-amber-200/50 hover:border-amber-300 hover:shadow-md transition-all duration-200 active:scale-95">
                  <Grid3X3 className="w-3.5 h-3.5" /><span className="text-[10px] font-bold">{c}×{r}</span>
                </button>
              ))}
            </div>
            {selectedSubBed && (
              <button onClick={() => { if (confirm('Удалить эту грядку?')) deleteSubBed(selectedSubBed.id) }} className="w-full mt-2 flex items-center justify-center gap-1 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"><Trash2 className="w-3 h-3" /> Удалить грядку</button>
            )}
          </div>
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-3 border-b border-gray-100">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">🌱 Каталог</span>
              <p className="text-[10px] text-gray-400 mt-0.5">Перетащите на грядку</p>
              <div className="relative mt-2"><Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" /><input type="text" placeholder="Поиск..." value={searchPlant} onChange={e => setSearchPlant(e.target.value)} className="w-full pl-7 pr-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[11px]" /></div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredPlants.map(plant => (
                <div key={plant.id} draggable onDragStart={(e) => { e.dataTransfer.setData('plantId', plant.id.toString()); e.dataTransfer.effectAllowed = 'copy' }}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-green-50 cursor-grab active:cursor-grabbing transition-colors border border-transparent hover:border-green-200"
                  onClick={() => { if (selectedCell) plantInCell(plant) }}>
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {plant.image_url ? <img src={plant.image_url} className="w-7 h-7 rounded object-cover" /> : <span className="text-sm">{plant.category?.icon || '🌱'}</span>}
                  </div>
                  <div className="flex-1 min-w-0"><p className="text-[11px] font-medium truncate">{plant.name}</p><p className="text-[9px] text-gray-400">💧{plant.watering_freq_days}д 📅{plant.maturation_days}д</p></div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <main className="flex-1 overflow-hidden relative touch-pan-y"
          onMouseDown={startDrag} onTouchStart={(e) => startDrag(e.touches?.[0] || e)} onMouseMove={onDrag} onTouchMove={(e) => onDrag(e.touches?.[0] || e)} onMouseUp={stopDrag} onTouchEnd={stopDrag} onWheel={handleWheel}
          style={{ cursor: dragging ? 'grabbing' : 'grab' }}>
          <div style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`, transformOrigin: '0 0', transition: dragging ? 'none' : 'transform 0.1s ease-out' }}>
            <div className="relative rounded-2xl shadow-2xl overflow-hidden border-4"
              style={{
                width: gardenWidth, height: gardenHeight, backgroundColor: THEME.soil.base, border: `3px solid ${THEME.soil.border}`,
                backgroundImage: `linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px), url("data:image/svg+xml,%3Csvg width='30' height='30' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='15' cy='15' r='0.5' fill='rgba(255,255,255,0.06)'/%3E%3C/svg%3E")`,
                backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px, ${CELL_SIZE}px ${CELL_SIZE}px, 30px 30px`,
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4), inset 0 2px 4px rgba(255,255,255,0.1)'
              }}>
              <div className="absolute top-3 right-3 px-2.5 py-1.5 bg-black/40 text-white/90 text-xs rounded-lg backdrop-blur-sm border border-white/10">{gardenWidth}×{gardenHeight} см</div>
              {beds.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-white/30 pointer-events-none">
                  <div className="text-center p-6"><div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3"><Plus className="w-8 h-8 opacity-60" /></div><p className="text-sm font-medium">Добавьте первую грядку</p><p className="text-xs opacity-70 mt-1">Выберите размер слева →</p></div>
                </div>
              )}
              {beds.map(subBed => {
                const cols = Math.round((subBed._w - 6) / CELL_SIZE)
                const rows = Math.round((subBed._h - 6) / CELL_SIZE)
                const actualCellW = (subBed._w - 6) / cols
                const actualCellH = (subBed._h - 6) / rows
                return (
                  <Rnd key={subBed.id} position={{ x: subBed._x, y: subBed._y }} size={{ width: subBed._w, height: subBed._h }} bounds="parent"
                    onDragStart={() => setDraggingBed(true)} onDragStop={(_, d) => { setDraggingBed(false); saveSubBed(subBed.id, d.x, d.y, subBed._w, subBed._h) }}
                    onResizeStop={(_, __, ref, ___, pos) => saveSubBed(subBed.id, pos.x, pos.y, parseInt(ref.style.width), parseInt(ref.style.height))}
                    onClick={(e) => { e.stopPropagation(); setSelectedSubBed(subBed); }} dragGrid={[CELL_SIZE, CELL_SIZE]} resizeGrid={[CELL_SIZE, CELL_SIZE]} scale={scale}
                    className="sub-bed" style={{ cursor: draggingBed ? 'grabbing' : 'grab', zIndex: selectedSubBed?.id === subBed.id ? 20 : 10 }}>
                    <div className="w-full h-full rounded-xl overflow-hidden relative"
                      style={{
                        background: selectedSubBed?.id === subBed.id ? THEME.bed.selected : THEME.bed.default,
                        border: `2px solid ${selectedSubBed?.id === subBed.id ? THEME.bed.highlight : THEME.bed.border}`,
                        boxShadow: selectedSubBed?.id === subBed.id ? '0 0 0 3px rgba(168,255,128,0.3), 0 12px 30px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.15)' : '0 6px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.1)'
                      }}>
                      {selectedSubBed?.id === subBed.id && (
                        <button onClick={(e) => { e.stopPropagation(); if (confirm('Удалить эту грядку?')) deleteSubBed(subBed.id) }}
                          className="absolute -top-2.5 -right-2.5 w-7 h-7 bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95 z-10"><X className="w-4 h-4" /></button>
                      )}
                      <div className="grid w-full h-full" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}>
                        {Array.from({ length: cols * rows }, (_, i) => {
                          const col = i % cols; const row = Math.floor(i / cols)
                          const cellX = subBed._x + 3 + col * actualCellW; const cellY = subBed._y + 3 + row * actualCellH
                          const plantInCell = bedPlants.find(p => Math.abs(p._x - cellX) < actualCellW / 2 && Math.abs(p._y - cellY) < actualCellH / 2)
                          return (
                            <div key={i} onClick={(e) => { e.stopPropagation(); handleCellClick(subBed.id, cellX, cellY); }}
                              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setDragOverCell(`${subBed.id}-${i}`); }}
                              onDragLeave={() => setDragOverCell(null)} onDrop={(e) => handleDropOnCell(e, subBed.id, cellX, cellY)}
                              className={`border border-white/10 flex items-center justify-center cursor-pointer transition-all relative group/cell ${dragOverCell === `${subBed.id}-${i}` ? 'bg-green-500/20 border-green-400/50' : 'hover:bg-white/10'}`}
                              title={plantInCell ? `🌱 ${plantInCell.plant?.name}` : 'Кликните или перетащите растение'}>
                              {plantInCell ? (
                                <div className="relative">
                                  {plantInCell.plant?.image_url ? <img src={plantInCell.plant.image_url} className="w-8 h-8 rounded-lg object-cover border border-white/30 shadow-sm" alt="" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }} /> : null}
                                  <span className={`${plantInCell.plant?.image_url ? 'hidden' : 'flex'} items-center justify-center text-xl drop-shadow-sm`}>🌱</span>
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-gray-900/95 text-white text-[10px] rounded-lg opacity-0 group-hover/cell:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 shadow-lg border border-gray-700/50">
                                    {plantInCell.plant?.name}{plantInCell.planted_year && <span className="text-gray-400 ml-1">{plantInCell.planted_year}</span>}
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900/95"></div>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-xs text-white/15 group-hover/cell:text-white/30 transition-colors font-medium">+</span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </Rnd>
                )
              })}
            </div>
          </div>
        </main>

        {/* Боковая панель информации о растении */}
        {showPlantInfo && selectedPlantInfo && (
          <div className="w-80 bg-white border-l shadow-lg shrink-0 overflow-y-auto z-20">
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <span>🌱</span> Информация
                </h3>
                <button onClick={() => { setShowPlantInfo(false); setSelectedPlantInfo(null); }} 
                  className="p-1.5 hover:bg-gray-100 rounded-lg">
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              {/* Фото */}
              <div className="w-full h-44 rounded-2xl bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center mb-4 overflow-hidden shadow-inner">
                {selectedPlantInfo.plant?.image_url ? (
                  <img src={selectedPlantInfo.plant.image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center">
                    <span className="text-5xl block mb-2">{allPlants.find(p => p.id === selectedPlantInfo.plant_id)?.category?.icon || '🌱'}</span>
                    <span className="text-sm text-gray-400">Нет фото</span>
                  </div>
                )}
              </div>

              {/* Название */}
              <h3 className="text-xl font-bold text-gray-800 mb-1">{selectedPlantInfo.plant?.name || 'Растение'}</h3>
              <p className="text-xs text-gray-500 mb-4">
                {allPlants.find(p => p.id === selectedPlantInfo.plant_id)?.category?.name || 'Категория'}
              </p>

              {/* Характеристики */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-blue-50 rounded-xl p-3">
                  <Droplets className="w-4 h-4 text-blue-500 mb-1" />
                  <p className="text-xs text-gray-500">Полив</p>
                  <p className="font-semibold text-sm">Раз в {selectedPlantInfo.plant?.watering_freq_days || '?'} дн.</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-3">
                  <Calendar className="w-4 h-4 text-amber-500 mb-1" />
                  <p className="text-xs text-gray-500">Урожай</p>
                  <p className="font-semibold text-sm">{selectedPlantInfo.plant?.maturation_days || '?'} дн.</p>
                </div>
                <div className="bg-green-50 rounded-xl p-3">
                  <Sprout className="w-4 h-4 text-green-500 mb-1" />
                  <p className="text-xs text-gray-500">Способ</p>
                  <p className="font-semibold text-xs">
                    {selectedPlantInfo.plant?.planting_method === 'seedling' ? '🌱 Рассада' :
                    selectedPlantInfo.plant?.planting_method === 'perennial' ? '🌳 Многолетник' : '🌍 Прямой посев'}
                  </p>
                </div>
                <div className="bg-purple-50 rounded-xl p-3">
                  <span className="text-lg block mb-1">📊</span>
                  <p className="text-xs text-gray-500">Сложность</p>
                  <p className="font-semibold text-sm">{selectedPlantInfo.plant?.difficulty || '—'}</p>
                </div>
              </div>

              {/* Информация о посадке */}
              <div className="bg-gray-50 rounded-2xl p-4 mb-4 space-y-3">
                <h4 className="text-sm font-semibold text-gray-700">📋 Детали посадки</h4>
                
                {/* Дата посадки */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Дата посадки</p>
                    <p className="text-sm font-medium">
                      {selectedPlantInfo.created_at 
                        ? new Date(selectedPlantInfo.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
                        : 'Неизвестно'}
                    </p>
                  </div>
                </div>

                {/* Год */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                    <span className="text-sm font-bold text-amber-600">{selectedPlantInfo.planted_year || '?'}</span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Год посадки</p>
                    <p className="text-sm font-medium">{selectedPlantInfo.planted_year || 'Неизвестно'}</p>
                  </div>
                </div>

                {/* Источник */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <Sprout className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Тип посадки</p>
                    <p className="text-sm font-medium">
                      {selectedPlantInfo.source_type === 'pot' ? '🪴 Пересажен из рассады' : '📐 Посажен в огород'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Кнопки */}
              <div className="space-y-2">
                <Link to={`/plant/${selectedPlantInfo.plant_id}`}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
                  📖 Подробнее о растении
                </Link>
                <button onClick={() => {
                  if (confirm(`Удалить ${selectedPlantInfo.plant?.name || 'растение'}?`)) {
                    supabase.from('bed_elements').delete().eq('id', selectedPlantInfo.id).then(() => {
                      setBedPlants(bedPlants.filter(p => p.id !== selectedPlantInfo.id))
                      setShowPlantInfo(false)
                      setSelectedPlantInfo(null)
                    })
                  }
                }} className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-50 text-red-600 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors">
                  <Trash2 className="w-4 h-4" /> Удалить растение
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showPlantModal && (
        <div className="fixed inset-0 bg-gradient-to-br from-black/60 to-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => { setShowPlantModal(false); setSelectedCell(null); }}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-green-50/50 to-emerald-50/30">
              <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><span>🌱</span> Посадить растение</h2><button onClick={() => { setShowPlantModal(false); setSelectedCell(null); }} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><X className="w-5 h-5 text-gray-400" /></button></div>
              <div className="relative"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" /><input type="text" value={searchPlant} onChange={e => setSearchPlant(e.target.value)} placeholder="Поиск по названию или категории..." className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 transition-all shadow-sm" autoFocus /></div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5 bg-gray-50/30">
              {filteredPlants.length === 0 ? <div className="text-center py-10 text-gray-400"><span className="text-4xl mb-3 block">🔍</span><p className="font-medium">Ничего не найдено</p></div> : filteredPlants.map(plant => (
                <button key={plant.id} onClick={() => plantInCell(plant)} className="w-full flex items-center gap-3 p-3.5 rounded-2xl hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50/60 hover:border-green-200 border border-transparent text-left transition-all duration-200 group">
                  <div className="w-13 h-13 rounded-xl bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center overflow-hidden flex-shrink-0 border border-green-200/60 group-hover:scale-105 transition-transform shadow-sm">
                    {plant.image_url ? <img src={plant.image_url} className="w-full h-full object-cover" alt="" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }} /> : null}
                    <span className={`${plant.image_url ? 'hidden' : 'flex'} items-center justify-center text-2xl`}>{plant.category?.icon || '🌿'}</span>
                  </div>
                  <div className="flex-1 min-w-0"><p className="font-semibold text-sm text-gray-800 truncate">{plant.name}</p>
                    <div className="flex items-center gap-3 mt-1"><span className="text-xs text-gray-500 flex items-center gap-1">💧 {plant.watering_freq_days} дн.</span><span className="text-xs text-gray-500 flex items-center gap-1">📅 {plant.maturation_days} дн.</span>{plant.category?.name && <span className="text-xs text-gray-400">• {plant.category.name}</span>}</div>
                  </div>
                  <div className="w-7 h-7 rounded-full border-2 border-green-500/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all bg-green-50 group-hover:bg-green-100"><Plus className="w-4 h-4 text-green-600" /></div>
                </button>
              ))}
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50/50"><p className="text-xs text-gray-500 text-center">Нажмите на растение или перетащите его на грядку</p></div>
          </div>
        </div>
      )}
    </div>
  )
}