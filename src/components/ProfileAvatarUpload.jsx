import { useRef, useState } from 'react'
import { Camera, Loader2, User } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { uploadAvatar } from '../services/avatarStorage'
import { toast } from '../store/toastStore'

export default function ProfileAvatarUpload({ profile, onUpdated }) {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)

  const initial = (profile?.full_name || profile?.email || 'П')[0].toUpperCase()

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file || !profile?.id) return

    setUploading(true)
    try {
      const avatarUrl = await uploadAvatar(file, profile.id)
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', profile.id)

      if (error) throw error

      onUpdated?.({ ...profile, avatar_url: avatarUrl })
      toast.success('Фото профиля обновлено')
    } catch (err) {
      toast.error(err.message || 'Не удалось загрузить фото')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0">
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-green-100 border border-green-200/60 flex items-center justify-center">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-3xl font-bold text-green-700">{initial}</span>
          )}
          {uploading && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-green-600 animate-spin" />
            </div>
          )}
        </div>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-800">Фото профиля</p>
        <p className="text-xs text-gray-500 mt-0.5 mb-2">JPG, PNG или WebP, до 2 МБ</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleFile}
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 disabled:opacity-50"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
          {profile?.avatar_url ? 'Изменить фото' : 'Загрузить фото'}
        </button>
        {!profile?.avatar_url && (
          <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
            <User className="w-3 h-3" /> Пока отображается буква имени
          </p>
        )}
      </div>
    </div>
  )
}
