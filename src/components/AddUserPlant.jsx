import { useState, useEffect, useCallback } from 'react'
import { BookOpen, Send, Sprout, Clock, CheckCircle, XCircle, Plus, ChevronRight } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useReferenceStore } from '../store/referenceStore'
import { toast } from '../store/toastStore'
import { formatSupabaseError } from '../lib/formatSupabaseError'
import { uploadPlantImage } from '../services/plantImageStorage'
import PlantImage from './PlantImage'
import UserPlantDetailPanel from './UserPlantDetailPanel'
import PlantEntryFormFields from './PlantEntryFormFields'
import { plantingMethodLabel } from '../lib/plantLabels'
import {
  PLANT_FORM_DEFAULTS,
  validatePlantForm,
  saveToPersonalDiary,
  submitToCatalog,
  fetchUserPlants,
  fetchUserSubmissions,
} from '../services/userPlantService'

const USER_PLANTS_SQL = 'supabase/complete_database.sql'

const STATUS_LABELS = {
  pending: { text: 'На модерации', className: 'bg-amber-100 text-amber-800', icon: Clock },
  in_review: { text: 'В работе', className: 'bg-blue-100 text-blue-800', icon: Clock },
  approved: { text: 'Одобрено', className: 'bg-green-100 text-green-800', icon: CheckCircle },
  rejected: { text: 'Отклонено', className: 'bg-red-100 text-red-800', icon: XCircle },
}

const SUB_TABS = [
  { key: 'diary', label: 'Мой дневник', icon: BookOpen },
  { key: 'add', label: 'Добавить', icon: Plus },
  { key: 'submissions', label: 'Заявки', icon: Send },
]

export default function AddUserPlant() {
  const { user } = useAuthStore()
  const [subTab, setSubTab] = useState('diary')
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState({ ...PLANT_FORM_DEFAULTS })
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [submitting, setSubmitting] = useState(null)
  const [myPlants, setMyPlants] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState('')
  const [selectedPlant, setSelectedPlant] = useState(null)

  const loadLists = useCallback(async () => {
    if (!user?.id) return
    setListError('')
    setListLoading(true)
    try {
      const [plants, subs] = await Promise.all([
        fetchUserPlants(user.id),
        fetchUserSubmissions(user.id),
      ])
      setMyPlants(plants)
      setSubmissions(subs)
    } catch (err) {
      setListError(formatSupabaseError(err, USER_PLANTS_SQL))
    } finally {
      setListLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    useReferenceStore.getState().getCategories().then(setCategories)
    loadLists()
  }, [loadLists])

  function resetForm() {
    setForm({ ...PLANT_FORM_DEFAULTS })
    setPhotoFile(null)
    setPhotoPreview(null)
  }

  function handlePhotoSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setPhotoPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  async function handleSubmit(mode) {
    const validationError = validatePlantForm(form)
    if (validationError) {
      toast.error(validationError)
      return
    }

    setSubmitting(mode)
    try {
      let imageUrl = null
      if (photoFile) {
        imageUrl = await uploadPlantImage(photoFile, { plantName: form.name })
      }

      if (mode === 'diary') {
        await saveToPersonalDiary(user.id, form, imageUrl)
        toast.success('Растение добавлено в личный дневник')
        setSubTab('diary')
      } else {
        await submitToCatalog(user.id, form, imageUrl)
        toast.success('Заявка отправлена. После проверки растение появится в каталоге.')
        setSubTab('submissions')
      }

      resetForm()
      loadLists()
    } catch (err) {
      toast.error(formatSupabaseError(err, USER_PLANTS_SQL))
    } finally {
      setSubmitting(null)
    }
  }

  function handlePlantUpdated(updated) {
    setMyPlants((list) => list.map((p) => (p.id === updated.id ? updated : p)))
    setSelectedPlant(updated)
  }

  function handlePlantDeleted(id) {
    setMyPlants((list) => list.filter((p) => p.id !== id))
    setSelectedPlant(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
        {SUB_TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setSubTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg text-sm font-medium transition-colors ${
              subTab === key
                ? 'bg-white text-green-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">{label}</span>
            {key === 'diary' && myPlants.length > 0 && (
              <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">{myPlants.length}</span>
            )}
            {key === 'submissions' && submissions.filter((s) => s.status === 'pending').length > 0 && (
              <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                {submissions.filter((s) => s.status === 'pending').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {listError && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-900">
          {listError}
        </div>
      )}

      {subTab === 'diary' && (
        <section>
          <p className="text-sm text-gray-500 mb-4">
            Ваши растения — только у вас. Откройте карточку, чтобы посмотреть, изменить или посадить на рассаду / грядку.
          </p>
          {listLoading ? (
            <div className="text-center py-12 text-gray-400 text-sm">Загрузка…</div>
          ) : myPlants.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
              <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">Дневник пока пуст</p>
              <p className="text-sm text-gray-500 mt-1 mb-4">Добавьте первое растение на вкладке «Добавить»</p>
              <button
                type="button"
                onClick={() => setSubTab('add')}
                className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-green-700"
              >
                <Plus className="w-4 h-4" /> Добавить растение
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {myPlants.map((plant) => (
                <button
                  key={plant.id}
                  type="button"
                  onClick={() => setSelectedPlant(plant)}
                  className="bg-white rounded-2xl shadow-sm overflow-hidden text-left hover:shadow-md hover:-translate-y-0.5 transition-all group"
                >
                  <div className="aspect-[4/3] relative overflow-hidden bg-green-50">
                    <PlantImage
                      src={plant.image_url}
                      alt={plant.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      fallbackClassName="w-full h-full"
                    />
                    {plant.published_at && (
                      <span className="absolute top-2 right-2 text-[10px] font-semibold bg-blue-600 text-white px-2 py-0.5 rounded-full shadow-sm">
                        Опубликовано
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-800 truncate">{plant.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {plant.category?.icon} {plant.category?.name || 'Без категории'}
                      {' · '}
                      {plantingMethodLabel(plant.planting_method)}
                    </p>
                    {plant.personal_notes && (
                      <p className="text-xs text-gray-600 mt-2 line-clamp-2">{plant.personal_notes}</p>
                    )}
                    <span className="inline-flex items-center gap-1 text-xs text-green-600 mt-3 font-medium">
                      Открыть <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {subTab === 'add' && (
        <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Новое растение</h2>
          <p className="text-sm text-gray-500 mb-5">
            Заполните карточку и сохраните в дневник или отправьте заявку в общий каталог.
          </p>

          <PlantEntryFormFields
            form={form}
            setForm={setForm}
            categories={categories}
            photoPreview={photoPreview}
            onPhotoSelect={handlePhotoSelect}
            showPersonalNotes
          />

          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <button
              type="button"
              onClick={() => handleSubmit('diary')}
              disabled={!!submitting}
              className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 rounded-xl hover:bg-emerald-700 font-medium text-sm disabled:opacity-60"
            >
              <BookOpen className="w-4 h-4" />
              {submitting === 'diary' ? 'Сохранение…' : 'В личный дневник'}
            </button>
            <button
              type="button"
              onClick={() => handleSubmit('catalog')}
              disabled={!!submitting}
              className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-xl hover:bg-green-700 font-medium text-sm disabled:opacity-60"
            >
              <Send className="w-4 h-4" />
              {submitting === 'catalog' ? 'Отправка…' : 'Заявка в каталог'}
            </button>
          </div>
        </div>
      )}

      {subTab === 'submissions' && (
        <section>
          <p className="text-sm text-gray-500 mb-4">
            Заявки на добавление в общий каталог. После одобрения администратором растение станет доступно всем.
          </p>
          {listLoading ? (
            <div className="text-center py-12 text-gray-400 text-sm">Загрузка…</div>
          ) : submissions.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-500 text-sm">
              Заявок пока нет
            </div>
          ) : (
            <div className="space-y-3">
              {submissions.map((sub) => {
                const st = STATUS_LABELS[sub.status] || STATUS_LABELS.pending
                const StIcon = st.icon
                return (
                  <div key={sub.id} className="bg-white rounded-xl p-4 flex items-start gap-4 shadow-sm">
                    <Sprout className="w-10 h-10 text-green-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800">{sub.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {sub.category?.name} · {new Date(sub.created_at).toLocaleDateString('ru-RU')}
                      </p>
                      <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full mt-2 ${st.className}`}>
                        <StIcon className="w-3 h-3" /> {st.text}
                      </span>
                      {sub.admin_comment && sub.status === 'rejected' && (
                        <p className="text-xs text-red-600 mt-2">
                          <span className="font-medium">Причина отклонения: </span>
                          {sub.admin_comment}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}

      {selectedPlant && (
        <UserPlantDetailPanel
          plant={selectedPlant}
          categories={categories}
          userId={user.id}
          onClose={() => setSelectedPlant(null)}
          onUpdated={handlePlantUpdated}
          onDeleted={handlePlantDeleted}
        />
      )}
    </div>
  )
}
