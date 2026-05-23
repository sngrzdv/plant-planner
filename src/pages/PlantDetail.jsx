import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ArrowLeft, Droplets, Calendar, Sprout, Shield, FlaskRound as Flask, Bug } from 'lucide-react'

export default function PlantDetail() {
  const { id } = useParams()
  const [plant, setPlant] = useState(null)
  const [varieties, setVarieties] = useState([])
  const [companions, setCompanions] = useState([])
  const [fertilizers, setFertilizers] = useState([])
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('info')
  
  useEffect(() => {
    loadPlant()
  }, [id])
  
  async function loadPlant() {
    // Растение
    const { data: plantData } = await supabase
      .from('plants')
      .select(`*, category:category_id(id, name, icon)`)
      .eq('id', id)
      .single()
    if (plantData) setPlant(plantData)
    
    // Сорта
    const { data: varietiesData } = await supabase.from('plant_varieties').select('*').eq('plant_id', id)
    if (varietiesData) setVarieties(varietiesData)
    
    // Совместимость
    const { data: companionsData } = await supabase
      .from('plant_companions')
      .select(`*, companion:companion_id(id, name, image_url)`)
      .eq('plant_id', id)
    if (companionsData) setCompanions(companionsData)
    
    // Удобрения
    const { data: fertilizersData } = await supabase.from('fertilizers').select('*').eq('plant_id', id)
    if (fertilizersData) setFertilizers(fertilizersData)
    
    // Болезни
    const { data: issuesData } = await supabase.from('plant_issues').select('*').eq('plant_id', id)
    if (issuesData) setIssues(issuesData)
    
    setLoading(false)
  }
  
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  )
  
  if (!plant) return <div className="p-8 text-center">Растение не найдено</div>
  
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link to="/catalog" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4">
            <ArrowLeft className="w-4 h-4" />
            <span>Назад к каталогу</span>
          </Link>
          
          <div className="flex items-start gap-6">
            {plant.image_url ? (
              <img src={plant.image_url} alt={plant.name} className="w-32 h-32 rounded-xl object-cover" />
            ) : (
              <div className="w-32 h-32 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl flex flex-col items-center justify-center gap-2">
                <Sprout className="w-10 h-10 text-green-400" />
                <span className="text-xs text-gray-500">Нет фото</span>
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold text-gray-800">{plant.name}</h1>
              <p className="text-gray-500 flex items-center gap-1 mt-1">
                <span>{plant.category?.icon}</span>
                <span>{plant.category?.name}</span>
              </p>
              {plant.scientific_name && (
                <p className="text-sm text-gray-400 italic mt-1">{plant.scientific_name}</p>
              )}
            </div>
          </div>
        </div>
      </header>
      
      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Базовая информация */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-4 text-center">
            <Droplets className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Полив</p>
            <p className="font-semibold">Раз в {plant.watering_freq_days} дн.</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 text-center">
            <Calendar className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Урожай</p>
            <p className="font-semibold">{plant.maturation_days} дней</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 text-center">
            <Flask className="w-8 h-8 text-purple-500 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Удобрений</p>
            <p className="font-semibold">{fertilizers.length}</p>
          </div>
        </div>
        
        {/* Вкладки */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex gap-4 border-b pb-2">
            {[
              { key: 'info', label: '📋 Общее', icon: Sprout },
              { key: 'varieties', label: '🌾 Сорта', icon: Sprout },
              { key: 'companions', label: '🤝 Совместимость', icon: Shield },
              { key: 'fertilizers', label: '🧪 Удобрения', icon: Flask },
              { key: 'issues', label: '🐛 Болезни', icon: Bug },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 font-medium transition-colors ${
                  activeTab === tab.key ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* Содержимое вкладок */}
        {activeTab === 'info' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-3">Описание</h2>
            <p className="text-gray-600 mb-4">{plant.description || 'Нет описания'}</p>
            <h2 className="text-lg font-semibold mb-3">Научные факты</h2>
            <p className="text-gray-600">{plant.scientific_facts || 'Нет данных'}</p>
          </div>
        )}
        
        {activeTab === 'varieties' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            {varieties.length === 0 ? (
              <p className="text-gray-500">Нет данных о сортах</p>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {varieties.map(v => (
                  <div key={v.id} className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-medium">{v.name}</h3>
                    <p className="text-sm text-gray-600">{v.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'companions' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            {companions.length === 0 ? (
              <p className="text-gray-500">Нет данных о совместимости</p>
            ) : (
              <div className="space-y-3">
                {companions.map(c => (
                  <div key={c.id} className={`p-4 rounded-lg flex items-center gap-3 ${
                    c.relationship === 'good' ? 'bg-green-50' : 
                    c.relationship === 'bad' ? 'bg-red-50' : 'bg-gray-50'
                  }`}>
                    <span className="text-2xl">{c.relationship === 'good' ? '✅' : c.relationship === 'bad' ? '❌' : '➖'}</span>
                    <div>
                      <p className="font-medium">{c.companion?.name}</p>
                      <p className="text-sm text-gray-600">{c.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'fertilizers' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            {fertilizers.length === 0 ? (
              <p className="text-gray-500">Нет данных об удобрениях</p>
            ) : (
              <div className="space-y-3">
                {fertilizers.map(f => (
                  <div key={f.id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm px-2 py-0.5 rounded bg-purple-100 text-purple-700">
                        {f.type === 'organic' ? 'Органика' : f.type === 'mineral' ? 'Минеральное' : 'Комплексное'}
                      </span>
                      <h3 className="font-medium">{f.name}</h3>
                    </div>
                    <p className="text-sm text-gray-600">{f.description}</p>
                    <p className="text-xs text-gray-400 mt-1">Внесение: {f.application_stage}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'issues' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            {issues.length === 0 ? (
              <p className="text-gray-500">Нет данных о болезнях</p>
            ) : (
              <div className="space-y-3">
                {issues.map(i => (
                  <div key={i.id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm px-2 py-0.5 rounded bg-red-100 text-red-700">
                        {i.type === 'disease' ? 'Болезнь' : i.type === 'pest' ? 'Вредитель' : 'Проблема'}
                      </span>
                      <h3 className="font-medium">{i.name}</h3>
                    </div>
                    <p className="text-sm text-gray-600"><strong>Симптомы:</strong> {i.symptoms}</p>
                    <p className="text-sm text-gray-600"><strong>Лечение:</strong> {i.treatment}</p>
                    <p className="text-sm text-gray-600"><strong>Профилактика:</strong> {i.prevention}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}