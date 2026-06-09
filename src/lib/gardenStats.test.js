import { describe, it, expect } from 'vitest'
import {
  assembleSeasonReport,
  buildCultureList,
  buildGardenBreakdown,
  normalizePlantSpot,
  parseYear,
} from './gardenStats.js'

const sampleSpots = [
  {
    id: '1',
    bed_id: 'b1',
    plant_id: 10,
    planted_year: 2026,
    beds: { id: 'b1', name: 'Грядка А', layout_id: 'l1', layouts: { id: 'l1', name: 'Теплица' } },
    plants: { name: 'Томат' },
  },
  {
    id: '2',
    bed_id: 'b1',
    plant_id: 10,
    planted_year: 2026,
    beds: { id: 'b1', name: 'Грядка А', layout_id: 'l1', layouts: { id: 'l1', name: 'Теплица' } },
    plants: { name: 'Томат' },
  },
  {
    id: '3',
    bed_id: 'b2',
    plant_id: 20,
    planted_year: 2024,
    beds: { id: 'b2', name: 'Грядка Б', layout_id: 'l1', layouts: { id: 'l1', name: 'Теплица' } },
    plants: { name: 'Смородина' },
  },
]

describe('gardenStats', () => {
  it('parseYear handles numbers and dates', () => {
    expect(parseYear(2025)).toBe(2025)
    expect(parseYear('2024-06-01')).toBe(2024)
  })

  it('splits new vs carried-over plantings', () => {
    const spots = sampleSpots.map(normalizePlantSpot)
    const cultures = buildCultureList(spots, 2026)
    const tomato = cultures.find((c) => c.name === 'Томат')
    expect(tomato?.newThisSeason).toBe(2)
    expect(tomato?.carriedOver).toBe(0)
    const currant = cultures.find((c) => c.name === 'Смородина')
    expect(currant?.carriedOver).toBe(1)
    expect(currant?.newThisSeason).toBe(0)
  })

  it('builds per-garden breakdown', () => {
    const spots = sampleSpots.map(normalizePlantSpot)
    const gardens = buildGardenBreakdown(spots, 2026)
    expect(gardens).toHaveLength(1)
    expect(gardens[0].spotsTotal).toBe(3)
    expect(gardens[0].newThisSeason).toBe(2)
    expect(gardens[0].carriedOver).toBe(1)
  })

  it('assembles full season report', () => {
    const report = assembleSeasonReport(
      {
        spots: sampleSpots,
        journal: [{ id: 'j1', action: 'sowed', created_at: '2026-04-01', details: 'Томат' }],
        pots: [{ id: 'p1', sowing_date: '2026-03-01', status: 'growing', plants: { name: 'Перец' } }],
        reminders: [{ id: 'r1', due_date: '2026-05-01', status: 'completed' }],
        gardensCount: 1,
        bedsCount: 2,
      },
      2026,
      'Саша',
    )
    expect(report.overview.newPlantingsThisSeason).toBe(2)
    expect(report.overview.carriedOverPlantings).toBe(1)
    expect(report.overview.journalEvents).toBe(1)
    expect(report.userName).toBe('Саша')
  })
})
