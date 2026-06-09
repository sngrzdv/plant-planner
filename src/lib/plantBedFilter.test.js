import { describe, it, expect } from 'vitest'
import {
  isFruitPlant,
  isPlantAllowedForBedType,
  filterPlantsForBedType,
} from './plantBedFilter'

const flower = { name: 'Роза', category: { name: 'Цветы' }, planting_method: 'direct' }
const tomato = { name: 'Томат', category: { name: 'Овощи' }, planting_method: 'seedling' }
const lettuce = { name: 'Салат', category: { name: 'Зелень' }, planting_method: 'direct' }
const strawberry = { name: 'Клубника', category: { name: 'Ягоды' }, planting_method: 'perennial' }
const apple = { name: 'Яблоня', category: { name: 'Плодовые' }, planting_method: 'perennial' }
const perennialFlower = { name: 'Пион', category: { name: 'Цветы' }, planting_method: 'perennial' }
const herb = { name: 'Базилик', category: { name: 'Травы' }, planting_method: 'direct' }

describe('plantBedFilter', () => {
  it('detects fruit plants', () => {
    expect(isFruitPlant(apple)).toBe(true)
    expect(isFruitPlant(strawberry)).toBe(false)
    expect(isFruitPlant(tomato)).toBe(false)
    expect(isFruitPlant(perennialFlower)).toBe(false)
  })

  it('allows flowers and fruit on flowerbed', () => {
    expect(isPlantAllowedForBedType(flower, 'flowerbed')).toBe(true)
    expect(isPlantAllowedForBedType(apple, 'flowerbed')).toBe(true)
    expect(isPlantAllowedForBedType(tomato, 'flowerbed')).toBe(false)
  })

  it('allows vegetables, greens and berries on garden rect', () => {
    expect(isPlantAllowedForBedType(tomato, 'rect')).toBe(true)
    expect(isPlantAllowedForBedType(lettuce, 'rect')).toBe(true)
    expect(isPlantAllowedForBedType(strawberry, 'rect')).toBe(true)
    expect(isPlantAllowedForBedType(flower, 'rect')).toBe(false)
    expect(isPlantAllowedForBedType(apple, 'rect')).toBe(false)
  })

  it('allows everything except fruit in greenhouse', () => {
    expect(isPlantAllowedForBedType(tomato, 'greenhouse')).toBe(true)
    expect(isPlantAllowedForBedType(herb, 'greenhouse')).toBe(true)
    expect(isPlantAllowedForBedType(flower, 'greenhouse')).toBe(true)
    expect(isPlantAllowedForBedType(apple, 'greenhouse')).toBe(false)
  })

  it('allows only fruit on tree', () => {
    expect(isPlantAllowedForBedType(apple, 'tree')).toBe(true)
    expect(isPlantAllowedForBedType(tomato, 'tree')).toBe(false)
    expect(isPlantAllowedForBedType(flower, 'tree')).toBe(false)
  })

  it('filters plant lists by bed type', () => {
    const all = [flower, tomato, apple, herb]
    const flowerbed = filterPlantsForBedType(all, 'flowerbed')
    expect(flowerbed.map((p) => p.name)).toEqual(['Роза', 'Яблоня'])
  })
})
