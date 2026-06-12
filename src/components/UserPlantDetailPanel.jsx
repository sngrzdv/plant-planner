import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BookOpen, Flower2, Sprout, Trash2, Pencil, X, Save } from 'lucide-react'
import PlantImage from './PlantImage'
import { plantingMethodLabel } from '../lib/plantLabels'
import { toast } from '../store/toastStore'
import { confirm } from '../store/confirmStore'
import { uploadPlantImage } from '../services/plantImageStorage'
import {
  validatePlantForm,
  updateUserPlant,
  deleteUserPlant,
} from '../services/userPlantService'

function plantToForm(plant) {
  return {
    name: plant.name || '',
    scientific_name: plant.scientific_name || '',
    category_id: plant.category_id ? String(plant.category_id) : '',
    description: plant.description || '',
    scientific_facts: plant.scientific_facts || '',
    personal_notes: plant.personal_notes || '',
    watering_freq_days: plant.watering_freq_days ?? 3,
    maturation_days: plant.maturation_days ?? 60,
    planting_method: plant.planting_method || 'direct',
    days_to_transplant: plant.days_to_transplant ?? 0,
    days_to_harvest: plant.days_to_harvest ?? 60,
    difficulty: plant.difficulty || 'Легко',
  }
}

export default function UserPlantDetailPanel({ plant, categories, userId, onClose, onUpdated, onDeleted }) {
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(() => plantToForm(plant))
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(plant.image_url || null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setForm(plantToForm(plant))
    setPhotoPreview(plant.image_url || null)
    setPhotoFile(null)
    setEditing(false)
  }, [plant.id])

  function handlePhotoSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setPhotoPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  async function handleSave() {
    const validationError = validatePlantForm(form)
    if (validationError) {
      toast.error(validationError)
      return
    }
    setSaving(true)
    try {
      let imageUrl = plant.image_url
      if (photoFile) {
        imageUrl = await uploadPlantImage(photoFile, { plantName: form.name })
      }
      const updated = await updateUserPlant(plant.id, userId, form, imageUrl)
      toast.success('Сохранено')
      setEditing(false)
      onUpdated?.(updated)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    const ok = await confirm('Удалить это растение из дневника?', {
      title: 'Удалить из дневника',
      confirmLabel: 'Удалить',
      destructive: true,
    })
    if (!ok) return
    try {
      await deleteUserPlant(plant.id)
      toast.success('Удалено из дневника')
      onDeleted?.(plant.id)
      onClose?.()
    } catch (err) {
      toast.error(err.message)
    }
  }

  function plantOnSeedling() {
    navigate(`/pots?action=add&userPlant=${plant.id}`)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/45 backdrop-blur-sm">
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92dvh] flex flex-col overflow-hidden">
        <div className="relative h-40 sm:h-44 bg-gradient-to-br from-emerald-100 to-green-50 shrink-0">
          <PlantImage
            src={photoPreview}
            alt={plant.name}
            className="w-full h-full object-cover"
            fallbackClassName="w-full h-full"
          />
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 p-2 bg-white/90 rounded-xl text-gray-500 hover:text-gray-800"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
          {!editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="absolute top-3 left-3 flex items-center gap-1 px-3 py-1.5 bg-white/90 rounded-xl text-sm font-medium text-gray-700"
            >
              <Pencil className="w-3.5 h-3.5" /> Изменить
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {!editing ? (
            <>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{plant.name}</h2>
                {plant.scientific_name && (
                  <p className="text-sm text-gray-500 italic mt-0.5">{plant.scientific_name}</p>
                )}
                <p className="text-xs text-green-700 mt-1">
                  {plant.category?.icon} {plant.category?.name || 'Без категории'}
                  {' · '}
                  {plantingMethodLabel(plant.planting_method)}
                  {plant.published_at && (
                    <span className="ml-1 inline-flex items-center text-[10px] font-semibold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                      Опубликовано
                    </span>
                  )}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Полив</p>
                  <p className="font-medium">раз в {plant.watering_freq_days} дн.</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">До урожая</p>
                  <p className="font-medium">{plant.maturation_days} дн.</p>
                </div>
              </div>

              {plant.description && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Описание</p>
                  <p className="text-sm text-gray-700">{plant.description}</p>
                </div>
              )}
              {plant.personal_notes && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                  <p className="text-xs font-semibold text-amber-800 mb-1 flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5" /> Заметки
                  </p>
                  <p className="text-sm text-amber-900">{plant.personal_notes}</p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button
                  type="button"
                  onClick={plantOnSeedling}
                  className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-green-700"
                >
                  <Sprout className="w-4 h-4" /> Посадить на рассаду
                </button>
                <Link
                  to="/gardens"
                  onClick={onClose}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-50 text-blue-700 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-100"
                >
                  <Flower2 className="w-4 h-4" /> На грядку →
                </Link>
              </div>
              <p className="text-xs text-gray-400 text-center">
                Для грядки откройте участок → редактор → перетащите растение из каталога (раздел «Мой дневник»).
              </p>
            </>
          ) : (
            <div className="space-y-3">
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-xl text-sm"
                placeholder="Название"
              />
              <select
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-xl text-sm"
              >
                <option value="">Категория</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
              <textarea
                value={form.personal_notes}
                onChange={(e) => setForm({ ...form, personal_notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border rounded-xl text-sm"
                placeholder="Заметки"
              />
              <input type="file" accept="image/*" onChange={handlePhotoSelect} className="text-sm w-full" />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="flex-1 py-2.5 border rounded-xl text-sm"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium disabled:opacity-50"
                >
                  <Save className="w-4 h-4" /> {saving ? '…' : 'Сохранить'}
                </button>
              </div>
            </div>
          )}
        </div>

        {!editing && (
          <div className="p-4 border-t">
            <button
              type="button"
              onClick={handleDelete}
              className="w-full flex items-center justify-center gap-2 text-red-600 py-2 text-sm hover:bg-red-50 rounded-xl"
            >
              <Trash2 className="w-4 h-4" /> Удалить из дневника
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
