import PlantImage from './PlantImage'

/**
 * Поля карточки растения — как на вкладке «Добавить» в каталоге.
 */
export default function PlantEntryFormFields({
  form,
  setForm,
  categories = [],
  photoPreview,
  onPhotoSelect,
  showPersonalNotes = true,
  readOnly = false,
}) {
  function patch(fields) {
    if (readOnly) return
    setForm((prev) => ({ ...prev, ...fields }))
  }

  const fieldClass = readOnly
    ? 'w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-700'
    : 'w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm'

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Название *</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => patch({ name: e.target.value })}
          disabled={readOnly}
          className={fieldClass}
          placeholder="Например: Крыжовник с дачи"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Категория *</label>
          <select
            value={form.category_id}
            onChange={(e) => patch({ category_id: e.target.value })}
            disabled={readOnly}
            className={fieldClass}
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
            onChange={(e) => patch({ scientific_name: e.target.value })}
            disabled={readOnly}
            className={fieldClass}
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
            onChange={(e) => patch({ watering_freq_days: parseInt(e.target.value, 10) || 3 })}
            disabled={readOnly}
            className={`w-full px-3 py-2 border border-gray-200 rounded-xl text-sm${readOnly ? ' bg-gray-50 text-gray-700' : ''}`}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">До урожая (дн.)</label>
          <input
            type="number"
            min={1}
            value={form.maturation_days}
            onChange={(e) => patch({ maturation_days: parseInt(e.target.value, 10) || 60 })}
            disabled={readOnly}
            className={`w-full px-3 py-2 border border-gray-200 rounded-xl text-sm${readOnly ? ' bg-gray-50 text-gray-700' : ''}`}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">До высадки</label>
          <input
            type="number"
            min={0}
            value={form.days_to_transplant}
            onChange={(e) => patch({ days_to_transplant: parseInt(e.target.value, 10) || 0 })}
            disabled={readOnly}
            className={`w-full px-3 py-2 border border-gray-200 rounded-xl text-sm${readOnly ? ' bg-gray-50 text-gray-700' : ''}`}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Сложность</label>
          <select
            value={form.difficulty}
            onChange={(e) => patch({ difficulty: e.target.value })}
            disabled={readOnly}
            className={`w-full px-3 py-2 border border-gray-200 rounded-xl text-sm${readOnly ? ' bg-gray-50 text-gray-700' : ''}`}
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
          onChange={(e) => patch({ planting_method: e.target.value })}
          disabled={readOnly}
          className={fieldClass}
        >
          <option value="direct">Прямой посев</option>
          <option value="seedling">Рассада</option>
          <option value="perennial">Многолетник</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Фото</label>
        {onPhotoSelect && !readOnly ? (
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={onPhotoSelect}
            className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-green-50 file:text-green-700"
          />
        ) : null}
        {photoPreview && (
          <PlantImage
            src={photoPreview}
            alt={form.name || 'Фото растения'}
            className="mt-2 w-full max-w-xs h-32 object-cover rounded-lg"
            fallbackClassName="mt-2 w-full max-w-xs h-32 rounded-lg"
          />
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
        <textarea
          value={form.description}
          onChange={(e) => patch({ description: e.target.value })}
          disabled={readOnly}
          rows={2}
          className={fieldClass}
          placeholder="Кратко о растении и уходе"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Научные факты</label>
        <textarea
          value={form.scientific_facts}
          onChange={(e) => patch({ scientific_facts: e.target.value })}
          disabled={readOnly}
          rows={2}
          className={fieldClass}
          placeholder="Особенности ухода, агротехника"
        />
      </div>

      {showPersonalNotes && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Заметки для дневника</label>
          <textarea
            value={form.personal_notes}
            onChange={(e) => patch({ personal_notes: e.target.value })}
            disabled={readOnly}
            rows={2}
            className={fieldClass}
            placeholder="Сорт, откуда семена, свои наблюдения…"
          />
        </div>
      )}
    </div>
  )
}
