function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function reportBaseName(report) {
  return `ogorod-statistika-${report.seasonYear}`
}

function formatDateRu(iso) {
  return new Date(iso).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function overviewRows(report) {
  const o = report.overview
  return [
    ['Показатель', 'Значение'],
    ['Сезон (год)', o.seasonYear],
    ['Участков', o.gardensCount],
    ['Грядок', o.bedsCount],
    ['Посадок на грядках (всего)', o.totalSpots],
    ['Новые посадки сезона', o.newPlantingsThisSeason],
    ['С прошлых сезонов (на грядках)', o.carriedOverPlantings],
    ['Уникальных культур', o.uniqueCultures],
    ['Рассада: посевов за сезон', o.seedlingsSowed],
    ['Рассада: пересадок за сезон', o.seedlingsTransplanted],
    ['Событий в журнале', o.journalEvents],
    ['Задач выполнено', o.tasksCompleted],
    ['Задач активных', o.tasksPending],
    ['Задач просрочено', o.tasksOverdue],
    ['Выполнение задач, %', o.completionRate],
  ]
}

function cultureRows(report) {
  return [
    ['Культура', 'Всего посадок', 'Новые в сезоне', 'С прошлых сезонов', 'Участки'],
    ...report.cultures.map((c) => [
      c.name,
      c.total,
      c.newThisSeason,
      c.carriedOver,
      c.gardens.join(', '),
    ]),
  ]
}

function gardenRows(report) {
  return [
    ['Участок', 'Грядок', 'Посадок', 'Новые', 'С прошлых сезонов', 'Топ культур'],
    ...report.gardens.map((g) => [
      g.name,
      g.bedsCount,
      g.spotsTotal,
      g.newThisSeason,
      g.carriedOver,
      g.topCultures.map((t) => `${t.name} (${t.count})`).join('; '),
    ]),
  ]
}

function journalRows(report) {
  return [
    ['Дата', 'Действие', 'Описание'],
    ...report.journalRecent.map((e) => [e.date, e.action, e.title]),
  ]
}

export function exportSeasonReportCsv(report) {
  const sections = [
    [`Отчёт: ${report.userName || 'Огород'}`, `Сезон ${report.seasonYear}`, `Сформирован: ${formatDateRu(report.generatedAt)}`],
    [],
    ...overviewRows(report),
    [],
    ['=== Культуры ==='],
    ...cultureRows(report),
    [],
    ['=== Участки ==='],
    ...gardenRows(report),
    [],
    ['=== Журнал (последние события) ==='],
    ...journalRows(report),
  ]

  const csv = sections
    .map((row) =>
      row
        .map((cell) => {
          const value = cell ?? ''
          const text = String(value)
          if (/[",;\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`
          return text
        })
        .join(';'),
    )
    .join('\n')

  const blob = new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' })
  downloadBlob(blob, `${reportBaseName(report)}.csv`)
}

export async function exportSeasonReportExcel(report) {
  const XLSX = await import('xlsx')
  const workbook = XLSX.utils.book_new()

  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ['Мой огород — сезонная статистика'],
    [`Садовод: ${report.userName || '—'}`],
    [`Сезон: ${report.seasonYear}`],
    [`Дата формирования: ${formatDateRu(report.generatedAt)}`],
    [],
    ...overviewRows(report).slice(1),
  ]), 'Сводка')

  if (report.cultures.length) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(cultureRows(report)), 'Культуры')
  }
  if (report.gardens.length) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(gardenRows(report)), 'Участки')
  }
  if (report.journalRecent.length) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(journalRows(report)), 'Журнал')
  }
  if (report.monthlyTasks.length) {
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        ['Месяц', 'Выполнено задач'],
        ...report.monthlyTasks.map((m) => [m.monthLabel, m.completed]),
      ]),
      'Задачи',
    )
  }

  XLSX.writeFile(workbook, `${reportBaseName(report)}.xlsx`)
}

function buildWordHtml(report) {
  const o = report.overview
  const cultureTable = report.cultures
    .map(
      (c) =>
        `<tr><td>${c.name}</td><td>${c.total}</td><td>${c.newThisSeason}</td><td>${c.carriedOver}</td><td>${c.gardens.join(', ')}</td></tr>`,
    )
    .join('')

  const gardenTable = report.gardens
    .map(
      (g) =>
        `<tr><td>${g.name}</td><td>${g.bedsCount}</td><td>${g.spotsTotal}</td><td>${g.newThisSeason}</td><td>${g.carriedOver}</td></tr>`,
    )
    .join('')

  const journalList = report.journalRecent
    .map((e) => `<li><strong>${e.date}</strong> — ${e.action}: ${e.title}</li>`)
    .join('')

  const comparison = report.yearComparison
    ? `<p>Сравнение с ${report.yearComparison.previousYear}: новых посадок ${report.yearComparison.delta.newPlantings >= 0 ? '+' : ''}${report.yearComparison.delta.newPlantings}, событий в журнале ${report.yearComparison.delta.journalEvents >= 0 ? '+' : ''}${report.yearComparison.delta.journalEvents}.</p>`
    : ''

  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<title>Статистика огорода ${report.seasonYear}</title>
<style>
  body { font-family: Calibri, Arial, sans-serif; color: #1f2937; margin: 24px; }
  h1 { color: #166534; font-size: 22pt; }
  h2 { color: #15803d; font-size: 14pt; margin-top: 24px; }
  table { border-collapse: collapse; width: 100%; margin-top: 8px; }
  th, td { border: 1px solid #d1d5db; padding: 6px 8px; text-align: left; font-size: 11pt; }
  th { background: #ecfdf5; }
  .meta { color: #6b7280; font-size: 10pt; }
  ul { padding-left: 20px; }
</style>
</head>
<body>
  <h1>Сезонная статистика огорода</h1>
  <p class="meta">Садовод: ${report.userName || '—'} · Сезон ${report.seasonYear} · ${formatDateRu(report.generatedAt)}</p>
  ${comparison}

  <h2>Сводка сезона</h2>
  <table>
    <tr><th>Показатель</th><th>Значение</th></tr>
    <tr><td>Участков</td><td>${o.gardensCount}</td></tr>
    <tr><td>Грядок</td><td>${o.bedsCount}</td></tr>
    <tr><td>Посадок на грядках</td><td>${o.totalSpots}</td></tr>
    <tr><td>Новые посадки ${report.seasonYear}</td><td>${o.newPlantingsThisSeason}</td></tr>
    <tr><td>С прошлых сезонов</td><td>${o.carriedOverPlantings}</td></tr>
    <tr><td>Культур</td><td>${o.uniqueCultures}</td></tr>
    <tr><td>Рассада (посев / пересадка)</td><td>${o.seedlingsSowed} / ${o.seedlingsTransplanted}</td></tr>
    <tr><td>Задачи выполнено</td><td>${o.tasksCompleted} (${o.completionRate}%)</td></tr>
  </table>

  <h2>Культуры</h2>
  <table>
    <tr><th>Культура</th><th>Всего</th><th>Новые</th><th>С прошлых лет</th><th>Участки</th></tr>
    ${cultureTable || '<tr><td colspan="5">Нет данных</td></tr>'}
  </table>

  <h2>Участки</h2>
  <table>
    <tr><th>Участок</th><th>Грядок</th><th>Посадок</th><th>Новые</th><th>С прошлых лет</th></tr>
    ${gardenTable || '<tr><td colspan="5">Нет данных</td></tr>'}
  </table>

  <h2>Журнал сезона</h2>
  <ul>${journalList || '<li>Нет событий</li>'}</ul>

  <p class="meta">Мой огород — отчёт сформирован автоматически по посадкам на грядках, журналу и задачам.</p>
</body>
</html>`
}

export function exportSeasonReportWord(report) {
  const html = buildWordHtml(report)
  const blob = new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' })
  downloadBlob(blob, `${reportBaseName(report)}.doc`)
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Отдельная вёрстка без Tailwind — html2canvas не поддерживает oklch/lab из CSS v4. */
function buildPngSnapshotElement(report) {
  const o = report.overview
  const cultureRows = report.cultures
    .slice(0, 10)
    .map(
      (c) =>
        `<tr>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${escapeHtml(c.name)}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center;">${c.total}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center;">${c.newThisSeason}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center;">${c.carriedOver}</td>
        </tr>`,
    )
    .join('')

  const gardenRows = report.gardens
    .slice(0, 8)
    .map(
      (g) =>
        `<tr>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${escapeHtml(g.name)}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center;">${g.bedsCount}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center;">${g.spotsTotal}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center;">${g.newThisSeason}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center;">${g.carriedOver}</td>
        </tr>`,
    )
    .join('')

  const journalItems = report.journalRecent
    .slice(0, 8)
    .map(
      (e) =>
        `<li style="margin:0 0 6px;color:#374151;font-size:13px;">
          <span style="color:#6b7280;">${escapeHtml(e.date)}</span> — ${escapeHtml(e.action)}: ${escapeHtml(e.title)}
        </li>`,
    )
    .join('')

  const wrapper = document.createElement('div')
  wrapper.style.cssText = [
    'position:fixed',
    'left:-10000px',
    'top:0',
    'width:880px',
    'padding:28px',
    'background:#f9fafb',
    'font-family:Segoe UI, Arial, sans-serif',
    'color:#1f2937',
    'box-sizing:border-box',
  ].join(';')

  wrapper.innerHTML = `
    <div style="background:#ffffff;border:1px solid #d1fae5;border-radius:16px;padding:24px;margin-bottom:16px;">
      <h1 style="margin:0 0 6px;font-size:24px;color:#166534;">Сезонная статистика огорода</h1>
      <p style="margin:0;font-size:13px;color:#6b7280;">
        ${escapeHtml(report.userName || 'Садовод')} · Сезон ${o.seasonYear} · ${escapeHtml(formatDateRu(report.generatedAt))}
      </p>
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px;">
      ${statCard('Новые посадки', o.newPlantingsThisSeason, '#166534', '#ecfdf5')}
      ${statCard('С прошлых сезонов', o.carriedOverPlantings, '#047857', '#d1fae5')}
      ${statCard('Культур', o.uniqueCultures, '#3f6212', '#ecfccb')}
      ${statCard('Рассада', o.seedlingsSowed, '#b45309', '#fef3c7')}
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px;">
      ${statCard('Участков', o.gardensCount, '#1d4ed8', '#dbeafe')}
      ${statCard('Грядок', o.bedsCount, '#0369a1', '#e0f2fe')}
      ${statCard('Журнал', o.journalEvents, '#4338ca', '#e0e7ff')}
      ${statCard('Задач выполнено', o.tasksCompleted, '#7e22ce', '#f3e8ff')}
    </div>
    <div style="background:#ffffff;border-radius:16px;padding:20px;margin-bottom:16px;border:1px solid #e5e7eb;">
      <h2 style="margin:0 0 12px;font-size:16px;color:#15803d;">Культуры сезона</h2>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="padding:8px;text-align:left;">Культура</th>
            <th style="padding:8px;">Всего</th>
            <th style="padding:8px;">Новые</th>
            <th style="padding:8px;">С прошлых лет</th>
          </tr>
        </thead>
        <tbody>${cultureRows || '<tr><td colspan="4" style="padding:12px;color:#9ca3af;">Нет посадок</td></tr>'}</tbody>
      </table>
    </div>
    <div style="background:#ffffff;border-radius:16px;padding:20px;margin-bottom:16px;border:1px solid #e5e7eb;">
      <h2 style="margin:0 0 12px;font-size:16px;color:#1d4ed8;">Участки</h2>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="padding:8px;text-align:left;">Участок</th>
            <th style="padding:8px;">Грядок</th>
            <th style="padding:8px;">Посадок</th>
            <th style="padding:8px;">Новые</th>
            <th style="padding:8px;">С прошлых</th>
          </tr>
        </thead>
        <tbody>${gardenRows || '<tr><td colspan="5" style="padding:12px;color:#9ca3af;">Нет участков</td></tr>'}</tbody>
      </table>
    </div>
    <div style="background:#ffffff;border-radius:16px;padding:20px;border:1px solid #e5e7eb;">
      <h2 style="margin:0 0 12px;font-size:16px;color:#4338ca;">Журнал сезона</h2>
      <ul style="margin:0;padding-left:18px;">${journalItems || '<li style="color:#9ca3af;">Нет событий</li>'}</ul>
      <p style="margin:16px 0 0;font-size:11px;color:#9ca3af;">Мой огород — отчёт по посадкам, журналу и задачам</p>
    </div>
  `

  return wrapper
}

function statCard(label, value, color, bg) {
  return `
    <div style="background:${bg};border-radius:12px;padding:14px;">
      <div style="font-size:26px;font-weight:700;color:${color};line-height:1.1;">${value}</div>
      <div style="font-size:12px;color:#4b5563;margin-top:4px;">${escapeHtml(label)}</div>
    </div>
  `
}

async function canvasToPngBlob(canvas) {
  const blob = await new Promise((resolve) => {
    canvas.toBlob((result) => resolve(result), 'image/png', 1)
  })
  if (blob) return blob

  const dataUrl = canvas.toDataURL('image/png')
  const response = await fetch(dataUrl)
  return response.blob()
}

export async function exportSeasonReportPng(_element, report) {
  if (!report) throw new Error('Нет данных для экспорта')

  const snapshot = buildPngSnapshotElement(report)
  document.body.appendChild(snapshot)

  try {
    const html2canvas = (await import('html2canvas')).default
    const canvas = await html2canvas(snapshot, {
      backgroundColor: '#f9fafb',
      scale: 2,
      logging: false,
      useCORS: true,
      width: snapshot.scrollWidth,
      height: snapshot.scrollHeight,
      windowWidth: snapshot.scrollWidth,
      windowHeight: snapshot.scrollHeight,
    })

    const blob = await canvasToPngBlob(canvas)
    downloadBlob(blob, `${reportBaseName(report)}.png`)
  } finally {
    document.body.removeChild(snapshot)
  }
}

export async function exportSeasonReport(report, format, { captureElement } = {}) {
  switch (format) {
    case 'csv':
      exportSeasonReportCsv(report)
      break
    case 'excel':
      await exportSeasonReportExcel(report)
      break
    case 'word':
      exportSeasonReportWord(report)
      break
    case 'png':
      await exportSeasonReportPng(captureElement, report)
      break
    default:
      throw new Error(`Неизвестный формат: ${format}`)
  }
}
