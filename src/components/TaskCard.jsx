import { Droplets, Sprout, Scissors, CheckCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function TaskCard({ reminder, onComplete }) {
  
  // Выбираем иконку в зависимости от типа задачи
  const getIcon = () => {
    switch (reminder.type) {
      case 'watering':
        return <Droplets className="w-5 h-5 text-blue-500" />
      case 'harvest':
        return <Scissors className="w-5 h-5 text-amber-500" />
      case 'fertilizing':
        return <Sprout className="w-5 h-5 text-green-500" />
      default:
        return <Sprout className="w-5 h-5 text-green-500" />
    }
  }
  
  // Отметить задачу как выполненную
  const handleComplete = async () => {
    const { error } = await supabase
      .from('reminders')
      .update({ status: 'completed' })
      .eq('id', reminder.id)
    
    if (!error && onComplete) {
      onComplete()
    }
  }
  
  return (
    <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
      <div className="mt-0.5">
        {getIcon()}
      </div>
      
      <div className="flex-1">
        <p className="font-medium text-gray-800">{reminder.title}</p>
        {reminder.description && (
          <p className="text-sm text-gray-600 mt-0.5">{reminder.description}</p>
        )}
        {reminder.plants && (
          <p className="text-xs text-gray-500 mt-1">{reminder.plants.name}</p>
        )}
      </div>
      
      <button
        onClick={handleComplete}
        className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm hover:bg-green-200 transition-colors"
      >
        <CheckCircle className="w-4 h-4" />
        <span>Готово</span>
      </button>
    </div>
  )
}