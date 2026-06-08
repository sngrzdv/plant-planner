import { useState, useEffect, useCallback } from 'react'
import { BookOpen, Send, Sprout, Trash2, Clock, CheckCircle, XCircle } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useReferenceStore } from '../store/referenceStore'
import { toast } from '../store/toastStore'
import { formatSupabaseError } from '../lib/formatSupabaseError'
import { confirm } from '../store/confirmStore'

const USER_PLANTS_SQL = 'supabase/user_plants_and_submissions.sql'
import { uploadPlantImage } from '../services/plantImageStorage'
import PlantImage from './PlantImage'
import {
  PLANT_FORM_DEFAULTS,
  validatePlantForm,
  saveToPersonalDiary,
  submitToCatalog,
  fetchUserPlants,
  fetchUserSubmissions,
  deleteUserPlant,
} from '../services/userPlantService'

const STATUS_LABELS = {
  pending: { text: 'На модерации', className: 'bg-amber-100 text-amber-800', icon: Clock },
  approved: { text: 'Одобрено', className: 'bg-green-100 text-green-800', icon: CheckCircle },
  rejected: { text: 'Отклонено', className: 'bg-red-100 text-red-800', icon: XCircle },
}

export default function AddUserPlant() {
  const { user } = useAuthStore()
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState({ ...PLANT_FORM_DEFAULTS })
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [submitting, setSubmitting] = useState(null)
  const [myPlants, setMyPlants] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState('')

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
      } else {
        await submitToCatalog(user.id, form, imageUrl)
        toast.success('Заявка отправлена. После проверки растение появится в каталоге.')
      }

      resetForm()
      loadLists()
    } catch (err) {
      toast.error(formatSupabaseError(err, USER_PLANTS_SQL))
    } finally {
      setSubmitting(null)
    }
  }

  async function handleDeleteUserPlant(id) {
    const ok = await confirm('Удалить это растение из дневника?', {
      title: 'Удалить из дневника',
      confirmLabel: 'Удалить',
      destructive: true,
    })
    if (!ok) return
    try {
      await deleteUserPlant(id)
      setMyPlants((list) => list.filter((p) => p.id !== id))
      toast.success('Удалено из дневника')
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-1">Добавить своё растение</h2>
        <p className="text-sm text-gray-500 mb-5">
          Нет в каталоге? Заполните карточку: сохраните только для себя или отправьте заявку в общий каталог.
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Название *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm"
              placeholder="Например: Крыжовник с дачи"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Категория *</label>
              <select
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm"
              >
                <option value="">Выберите</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Латинское название</label>
              <input
                type="text"
                value={form.scientific_name}
                onChange={(e) => setForm({ ...form, scientific_name: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm"
                placeholder="Необязательно"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Полив (дн.)</label>
              <input
                type="number"
                min={1}
                value={form.watering_freq_days}
                onChange={(e) => setForm({ ...form, watering_freq_days: parseInt(e.target.value, 10) || 3 })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">До урожая (дн.)</label>
              <input
                type="number"
                min={1}
                value={form.maturation_days}
                onChange={(e) => setForm({ ...form, maturation_days: parseInt(e.target.value, 10) || 60 })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">До высадки</label>
              <input
                type="number"
                min={0}
                value={form.days_to_transplant}
                onChange={(e) => setForm({ ...form, days_to_transplant: parseInt(e.target.value, 10) || 0 })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Сложность</label>
              <select
                value={form.difficulty}
                onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
              >
                <option value="Легко">Легко</option>
                <option value="Средне">Средне</option>
                <option value="Сложно">Сложно</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Способ посадки</label>
            <select
              value={form.planting_method}
              onChange={(e) => setForm({ ...form, planting_method: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm"
            >
              <option value="direct">🌍 Прямой посев</option>
              <option value="seedling">🌱 Рассада</option>
              <option value="perennial">🌳 Многолетник</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Фото</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handlePhotoSelect}
              className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-green-50 file:text-green-700"
            />
            {photoPreview && (
              <PlantImage
                src={photoPreview}
                alt="Превью"
                className="mt-2 w-full max-w-xs h-32 object-cover rounded-lg"
                fallbackClassName="mt-2 w-32 h-32 rounded-lg bg-green-50 flex items-center justify-center"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm"
              placeholder="Кратко о растении и уходе"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Заметки для дневника</label>
            <textarea
              value={form.personal_notes}
              onChange={(e) => setForm({ ...form, personal_notes: e.target.value })}
              rows={2}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm"
              placeholder="Сорт, откуда семена, свои наблюдения…"
            />
          </div>
        </div>

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
        <p className="text-xs text-gray-400 mt-3 text-center">
          Избранное для растений — скоро. Сейчас: дневник только у вас, каталог — после проверки админом.
        </p>
      </div>

      {listError && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-900">
          {listError}
        </div>
      )}

      {listLoading ? (
        <div className="text-center py-8 text-gray-400 text-sm">Загрузка ваших записей…</div>
      ) : (
        <>
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-600" /> Мой дневник ({myPlants.length})
            </h3>
            {myPlants.length === 0 ? (
              <p className="text-sm text-gray-500 bg-white rounded-xl p-4">Пока пусто — добавьте первое растение кнопкой выше.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {myPlants.map((plant) => (
                  <div key={plant.id} className="bg-white rounded-xl p-3 flex gap-3 shadow-sm">
                    <PlantImage
                      src={plant.image_url}
                      alt={plant.name}
                      className="w-16 h-16 rounded-lg object-cover shrink-0"
                      fallbackClassName="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 truncate">{plant.name}</p>
                      <p className="text-xs text-gray-500">
                        {plant.category?.icon} {plant.category?.name || 'Без категории'}
                      </p>
                      {plant.personal_notes && (
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">{plant.personal_notes}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteUserPlant(plant.id)}
                      className="text-gray-300 hover:text-red-500 shrink-0 self-start"
                      aria-label="Удалить"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Send className="w-4 h-4 text-green-600" /> Мои заявки в каталог ({submissions.length})
            </h3>
            {submissions.length === 0 ? (
              <p className="text-sm text-gray-500 bg-white rounded-xl p-4">Заявок пока нет.</p>
            ) : (
              <div className="space-y-2">
                {submissions.map((sub) => {
                  const st = STATUS_LABELS[sub.status] || STATUS_LABELS.pending
                  const StIcon = st.icon
                  return (
                    <div key={sub.id} className="bg-white rounded-xl p-3 flex items-center gap-3 shadow-sm">
                      <Sprout className="w-8 h-8 text-green-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800">{sub.name}</p>
                        <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full mt-1 ${st.className}`}>
                          <StIcon className="w-3 h-3" /> {st.text}
                        </span>
                        {sub.admin_comment && sub.status === 'rejected' && (
                          <p className="text-xs text-red-600 mt-1">{sub.admin_comment}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
