import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { trefleApi } from '../services/trefleApi'
import { Search, Download, Check, Loader, ExternalLink, Image } from 'lucide-react'

export default function PlantImporter({ onImport }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(null)
  const [imported, setImported] = useState([])
  const [error, setError] = useState('')
  
  async function handleSearch() {
    if (!searchQuery.trim()) return
    
    setLoading(true)
    setError('')
    
    const { data } = await trefleApi.searchPlants(searchQuery)
    
    if (data.length === 0) {
      setError('Ничего не найдено. Попробуйте другой запрос.')
    }
    
    setSearchResults(data)
    setLoading(false)
  }
  
  async function importPlant(plant) {
    setImporting(plant.name)
    
    const { data: existing } = await supabase
      .from('plants')
      .select('id')
      .or(`name.ilike.${plant.name},scientific_name.ilike.${plant.scientific_name}`)
      .limit(1)
    
    if (existing?.length) {
      alert(`Растение "${plant.name}" уже есть в базе!`)
      setImported([...imported, plant.name])
      setImporting(null)
      return
    }
    
    const { data, error } = await supabase
      .from('plants')
      .insert({
        name: plant.name,
        scientific_name: plant.scientific_name,
        category_id: plant.category_id,
        description: plant.description,
        scientific_facts: plant.scientific_facts,
        watering_freq_days: plant.watering_freq_days,
        maturation_days: plant.maturation_days,
        image_url: plant.image_url
      })
      .select()
      .single()
    
    if (error) {
      alert('Ошибка импорта: ' + error.message)
    } else {
      setImported([...imported, plant.name])
      if (onImport) onImport(data)
    }
    
    setImporting(null)
  }
  
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <ExternalLink className="w-5 h-5 text-green-600" />
        Импорт из Trefle
      </h3>
      
      <p className="text-sm text-gray-500 mb-4">
        Поиск в крупнейшей базе растений с фото и описаниями
      </p>
      
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Например: tomato, rose, basilicum..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? <Loader className="w-4 h-4 animate-spin" /> : 'Найти'}
        </button>
      </div>
      
      {error && (
        <div className="p-3 bg-amber-50 text-amber-700 rounded-lg mb-4 text-sm">{error}</div>
      )}
      
      {searchResults.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto">
          {searchResults.map((plant, i) => (
            <div key={i} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
              {plant.image_url && (
                <img 
                  src={plant.image_url} 
                  alt={plant.name}
                  className="w-16 h-16 rounded-lg object-cover"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{plant.name}</p>
                <p className="text-xs text-gray-500 truncate">{plant.scientific_name}</p>
                
                {imported.includes(plant.name) ? (
                  <Check className="w-5 h-5 text-green-600 mt-1" />
                ) : (
                  <button
                    onClick={() => importPlant(plant)}
                    disabled={importing === plant.name}
                    className="text-xs text-green-600 hover:text-green-700 mt-1"
                  >
                    {importing === plant.name ? 'Импорт...' : 'Импортировать'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      <p className="text-xs text-gray-400 mt-4">Данные предоставлены Trefle.io</p>
    </div>
  )
}