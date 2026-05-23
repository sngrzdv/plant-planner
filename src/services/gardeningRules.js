/**
 * Правила и рекомендации по лунному садоводству
 * Основаны на традиционных агротехнических практиках
 */

export const GARDENING_RULES = {
  new_moon: {
    plant: [],
    avoid: ['посев', 'пересадка', 'прививка', 'обрезка', 'посадка'],
    recommend: [
      'подготовка почвы', 
      'прополка', 
      'обработка от вредителей', 
      'удаление сорняков',
      'покой растений',
      'планирование посадок'
    ],
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    borderColor: 'border-gray-300',
    score: 0.3,
    description: 'День покоя. Не рекомендуется сажать и пересаживать.'
  },
  
  waxing: {
    plant: [
      'томаты', 'огурцы', 'перцы', 'баклажаны', 
      'зелень', 'салат', 'укроп', 'петрушка',
      'цветы', 'однолетники', 'ягоды', 'клубника',
      'фруктовые деревья', 'виноград', 'кабачки',
      'тыква', 'патиссоны', 'кукуруза', 'горох',
      'фасоль', 'капуста', 'брокколи'
    ],
    avoid: ['обрезка', 'посадка корнеплодов', 'прививка', 'прищипка'],
    recommend: [
      'посев надземных культур', 
      'подкормка по листу', 
      'полив', 
      'формировка кустов',
      'пасынкование',
      'сбор зелени'
    ],
    color: 'bg-green-100 text-green-800 border-green-200',
    borderColor: 'border-green-300',
    score: 0.9,
    description: 'Отличное время для посадки надземных культур.'
  },
  
  first_quarter: {
    plant: [
      'томаты', 'огурцы', 'перцы', 'зелень',
      'цветы', 'зерновые', 'капуста'
    ],
    avoid: ['обрезка корней', 'пикировка'],
    recommend: [
      'посев быстрорастущих культур',
      'прививка',
      'заготовка черенков'
    ],
    color: 'bg-green-50 text-green-800 border-green-200',
    borderColor: 'border-green-300',
    score: 0.85,
    description: 'Хорошо для посева культур с быстрым ростом.'
  },
  
  waxing_gibbous: {
    plant: ['томаты', 'огурцы', 'перцы', 'ягоды', 'фруктовые'],
    avoid: ['обрезка', 'пересадка'],
    recommend: [
      'подкормка', 
      'полив', 
      'уход за растениями',
      'сбор урожая зелени'
    ],
    color: 'bg-green-100 text-green-800 border-green-200',
    borderColor: 'border-green-300',
    score: 0.8,
    description: 'Период активного роста. Хорош для ухода.'
  },
  
  full_moon: {
    plant: [],
    avoid: ['посев', 'пересадка', 'обрезка', 'прививка', 'пикировка'],
    recommend: [
      'сбор урожая', 
      'компостирование', 
      'рыхление почвы', 
      'прополка',
      'заготовка семян',
      'сушка трав'
    ],
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    borderColor: 'border-yellow-300',
    score: 0.5,
    description: 'Полнолуние. Лучше ничего не сажать.'
  },
  
  waning_gibbous: {
    plant: ['корнеплоды', 'луковичные', 'деревья'],
    avoid: ['посев надземных культур'],
    recommend: [
      'подготовка к посадке корнеплодов',
      'внесение удобрений'
    ],
    color: 'bg-blue-50 text-blue-800 border-blue-200',
    borderColor: 'border-blue-300',
    score: 0.7,
    description: 'Подготовка к убывающей луне.'
  },
  
  last_quarter: {
    plant: [
      'морковь', 'свёкла', 'картофель', 'лук',
      'чеснок', 'редис', 'редька', 'корнеплоды',
      'луковичные цветы', 'деревья', 'кустарники'
    ],
    avoid: ['посев надземных культур', 'формировка кроны'],
    recommend: [
      'посадка корнеплодов', 
      'обрезка деревьев', 
      'пересадка', 
      'корневая подкормка',
      'делением многолетников'
    ],
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    borderColor: 'border-blue-300',
    score: 0.75,
    description: 'Хорошо для работы с корнями и обрезки.'
  },
  
  waning: {
    plant: [
      'морковь', 'свёкла', 'картофель', 'лук', 
      'чеснок', 'корнеплоды', 'луковичные', 
      'деревья', 'кустарники', 'многолетники',
      'имбирь', 'сельдерей', 'пастернак'
    ],
    avoid: ['посев надземных культур', 'формировка кроны', 'пасынкование'],
    recommend: [
      'посадка корнеплодов', 
      'обрезка', 
      'пересадка', 
      'корневая подкормка',
      'борьба с вредителями',
      'прореживание'
    ],
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    borderColor: 'border-blue-300',
    score: 0.8,
    description: 'Лучшее время для корнеплодов и обрезки.'
  }
};

/**
 * Получить рекомендации для фазы и культуры
 */
export function getRecommendation(phaseType, crop = null) {
  const rule = GARDENING_RULES[phaseType] || GARDENING_RULES.waxing;
  
  if (!crop) {
    return { ...rule, status: 'neutral' };
  }
  
  const cropLower = crop.toLowerCase();
  let status = 'neutral';
  
  // Проверяем, благоприятна ли культура для этой фазы
  if (rule.plant.some(p => cropLower.includes(p.toLowerCase()))) {
    status = 'favorable';
  } 
  // Проверяем, не рекомендуется ли культура
  else if (rule.avoid.some(a => cropLower.includes(a.toLowerCase())) || rule.plant.length === 0) {
    status = 'unfavorable';
  }
  
  return { ...rule, status };
}

/**
 * Проверить, благоприятна ли фаза для культуры
 */
export function isFavorable(phaseType, crop) {
  const rec = getRecommendation(phaseType, crop);
  return rec.status === 'favorable';
}

/**
 * Получить список культур для фазы
 */
export function getCropsForPhase(phaseType) {
  const rule = GARDENING_RULES[phaseType];
  return rule ? rule.plant : [];
}