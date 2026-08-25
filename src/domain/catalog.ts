import type { Vehicle } from './types.js';

export const vehicles: Vehicle[] = [
  {
    id: 'xmax-24', slug: 'yamaha-xmax-300', model: 'Yamaha X-MAX 300', year: 2024,
    category: 'scooter', pricePerDayVnd: 1800000, depositUsd: 600, status: 'rented',
    nextEvent: 'Возврат сегодня · 18:00',
    description: 'Премиальный макси-скутер для города и длинных поездок.',
    tags: ['300 cc', 'ABS', 'Touring'], demoVisual: 'X-MAX 300'
  },
  {
    id: 'mt09-07', slug: 'yamaha-mt09-gen2', model: 'Yamaha MT-09 GEN2', year: 2022,
    category: 'naked', pricePerDayVnd: 3500000, depositUsd: 900, status: 'booked',
    nextEvent: 'Выдача завтра · 10:00',
    description: 'Мощный naked-bike для опытных райдеров.',
    tags: ['890 cc', 'Quickshifter', 'Sport'], demoVisual: 'MT-09 GEN2'
  },
  {
    id: 'rebel-12', slug: 'honda-rebel-300', model: 'Honda Rebel 300', year: 2023,
    category: 'cruiser', pricePerDayVnd: 1600000, depositUsd: 500, status: 'service',
    nextEvent: 'Сервис до 26 авг',
    description: 'Низкая посадка, спокойная управляемость и городской комфорт.',
    tags: ['286 cc', 'Low seat', 'Cruiser'], demoVisual: 'REBEL 300'
  },
  {
    id: 'adv-18', slug: 'honda-adv-160', model: 'Honda ADV 160', year: 2025,
    category: 'adventure', pricePerDayVnd: 1200000, depositUsd: 400, status: 'available',
    nextEvent: 'Свободен сейчас',
    description: 'Практичный городской adventure-скутер для Нячанга и окрестностей.',
    tags: ['160 cc', 'ABS', 'City'], demoVisual: 'ADV 160'
  },
  {
    id: 'pcx-31', slug: 'honda-pcx-160', model: 'Honda PCX 160', year: 2024,
    category: 'scooter', pricePerDayVnd: 900000, depositUsd: 350, status: 'available',
    nextEvent: 'Свободен сейчас',
    description: 'Комфортный скутер для ежедневных поездок по городу.',
    tags: ['160 cc', 'Smart key', 'City'], demoVisual: 'PCX 160'
  },
  {
    id: 'nmax-16', slug: 'yamaha-nmax-155', model: 'Yamaha NMAX 155', year: 2024,
    category: 'scooter', pricePerDayVnd: 850000, depositUsd: 350, status: 'available',
    nextEvent: 'Свободен сейчас',
    description: 'Универсальный городской скутер с удобной посадкой.',
    tags: ['155 cc', 'ABS', 'City'], demoVisual: 'NMAX 155'
  }
];

export const getVehicle = (id: string): Vehicle | undefined => vehicles.find(v => v.id === id);
