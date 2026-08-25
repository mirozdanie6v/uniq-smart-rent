import type { LocalizedText, Vehicle } from './types.js';

const txt = (ru: string, en: string, vi: string, ko: string): LocalizedText => ({ ru, en, vi, ko });
const official = 'https://uniqmoto.com';
const commonIncluded = [
  txt('Полностью обслуженная техника', 'Fully serviced vehicle', 'Xe được bảo dưỡng đầy đủ', '정비 완료 차량'),
  txt('2 шлема', '2 helmets', '2 mũ bảo hiểm', '헬멧 2개'),
  txt('Полный бак топлива', 'Full fuel tank', 'Bình xăng đầy', '연료 가득'),
  txt('Замок с сигнализацией', 'Alarm lock', 'Khóa báo động', '알람 잠금장치'),
  txt('Инструктаж по использованию', 'Usage briefing', 'Hướng dẫn sử dụng', '이용 안내'),
  txt('Бесплатная доставка в отель', 'Free hotel delivery', 'Giao miễn phí đến khách sạn', '호텔 무료 배송')
];

export const vehicles: Vehicle[] = [
  {
    id: 'mt09-sp-2023', slug: 'yamaha-mt-09-sp-2023', brand: 'Yamaha', model: 'MT-09 SP', year: 2023,
    category: 'naked', engineLabel: '900 cc', weightKg: 190, cruiseSpeed: '120–140 km/h', fuelUse: '~4.9 l/100 km', capacity: '2 people / up to 180 kg',
    pricing: { dailyVnd: 4000000, weeklyVnd: 15000000, monthlyVnd: 32000000, depositUsd: 2000 }, availability: 'manager_confirmation',
    descriptions: txt(
      'Премиальная версия Hyper Naked с регулируемой подвеской SP и тормозами Brembo. Для опытных райдеров.',
      'Premium Hyper Naked with adjustable SP suspension and Brembo braking hardware, intended for experienced riders.',
      'Bản Hyper Naked cao cấp với hệ thống treo SP điều chỉnh và phanh Brembo, phù hợp với người lái có kinh nghiệm.',
      '조절식 SP 서스펜션과 Brembo 브레이크를 갖춘 프리미엄 Hyper Naked 모델로 숙련된 라이더에게 적합합니다.'
    ), included: commonIncluded,
    requirements: [txt('Фото паспорта', 'Passport photo', 'Ảnh hộ chiếu', '여권 사진'), txt('Депозит $2,000 в USD, EUR, crypto или VND', '$2,000 deposit in USD, EUR, crypto or VND', 'Đặt cọc $2,000 bằng USD, EUR, crypto hoặc VND', 'USD, EUR, 암호화폐 또는 VND로 $2,000 보증금')],
    tags: ['900 cc', 'SP suspension', 'Brembo'],
    photos: [1,2,3,4].map(n => ({ src: `https://ahodwykbyoytwtpfoxgi.supabase.co/storage/v1/object/public/public-assets/vehicles/75172/${n}.jpg`, alt: txt(`Yamaha MT-09 SP — фото ${n}`, `Yamaha MT-09 SP — photo ${n}`, `Yamaha MT-09 SP — ảnh ${n}`, `Yamaha MT-09 SP — 사진 ${n}`), sourceUrl: `${official}/en/rentals/motorcycles/yamaha-mt-09-sp-2023` })),
    sourceUrl: `${official}/en/rentals/motorcycles/yamaha-mt-09-sp-2023`, verifiedAt: '2026-08-25'
  },
  {
    id: 'xmax-2024', slug: 'yamaha-x-max-2024-76826', brand: 'Yamaha', model: 'X-Max 300', year: 2024,
    category: 'scooter', engineLabel: '292 cc', weightKg: 179, cruiseSpeed: '125–130 km/h', fuelUse: '~3.4 l/100 km', capacity: '2 people / 180 kg',
    pricing: { dailyVnd: 1800000, weeklyVnd: 8000000, monthlyVnd: 17000000, depositUsd: 600 }, availability: 'manager_confirmation',
    descriptions: txt('Премиальный макси-скутер с просторным сиденьем и большим багажным отсеком.', 'Premium maxi-scooter with a spacious seat, generous under-seat storage and a smooth ride.', 'Maxi-scooter cao cấp với yên rộng, khoang chứa đồ lớn và vận hành êm ái.', '넓은 시트와 수납공간, 부드러운 주행감을 갖춘 프리미엄 맥시 스쿠터입니다.'),
    included: commonIncluded, requirements: [txt('Фото паспорта', 'Passport photo', 'Ảnh hộ chiếu', '여권 사진'), txt('Депозит $600 в USD, EUR, crypto или VND', '$600 deposit in USD, EUR, crypto or VND', 'Đặt cọc $600 bằng USD, EUR, crypto hoặc VND', 'USD, EUR, 암호화폐 또는 VND로 $600 보증금')],
    tags: ['292 cc', 'Maxi scooter', 'Touring'], photos: [{ src: `${official}/assets/vehicles/client-fleet/yamaha-x-max-2024-76826.webp`, alt: txt('Yamaha X-Max 300', 'Yamaha X-Max 300', 'Yamaha X-Max 300', 'Yamaha X-Max 300'), sourceUrl: `${official}/en/rentals/motorcycles/yamaha-x-max-2024-76826` }],
    sourceUrl: `${official}/en/rentals/motorcycles/yamaha-x-max-2024-76826`, verifiedAt: '2026-08-25'
  },
  {
    id: 'r7-2023', slug: 'yamaha-r7-2023', brand: 'Yamaha', model: 'YZF-R7', year: 2023,
    category: 'sport', engineLabel: '689 cc', weightKg: 188, cruiseSpeed: '120–140 km/h', fuelUse: '~4.5 l/100 km', capacity: '2 people / 180 kg',
    pricing: { dailyVnd: 3500000, weeklyVnd: 16000000, monthlyVnd: 32000000, depositUsd: 1500 }, availability: 'manager_confirmation',
    descriptions: txt('Спортбайк с точной управляемостью, сильными тормозами и спортивной посадкой.', 'Sportbike with sharp handling, strong brakes and an aggressive riding position.', 'Sportbike với khả năng điều khiển sắc bén, phanh mạnh và tư thế lái thể thao.', '정교한 핸들링과 강력한 브레이크, 공격적인 포지션을 갖춘 스포츠바이크입니다.'),
    included: commonIncluded, requirements: [txt('Фото паспорта', 'Passport photo', 'Ảnh hộ chiếu', '여권 사진'), txt('Депозит $1,500 в USD, EUR, crypto или VND', '$1,500 deposit in USD, EUR, crypto or VND', 'Đặt cọc $1,500 bằng USD, EUR, crypto hoặc VND', 'USD, EUR, 암호화폐 또는 VND로 $1,500 보증금')],
    tags: ['689 cc', 'Sportbike', 'Highway'], photos: [{ src: `${official}/assets/vehicles/client-fleet/yamaha-r7-2023.webp`, alt: txt('Yamaha YZF-R7', 'Yamaha YZF-R7', 'Yamaha YZF-R7', 'Yamaha YZF-R7'), sourceUrl: `${official}/en/rentals/motorcycles/yamaha-r7-2023` }],
    sourceUrl: `${official}/en/rentals/motorcycles/yamaha-r7-2023`, verifiedAt: '2026-08-25'
  },
  {
    id: 'rebel-300-2023', slug: 'honda-rebel-300-2023', brand: 'Honda', model: 'Rebel 300', year: 2023,
    category: 'cruiser', engineLabel: '286 cc', weightKg: 165, cruiseSpeed: '90–100 km/h', fuelUse: '~3.3 l/100 km', capacity: '2 people / 180 kg',
    pricing: { dailyVnd: 1600000, weeklyVnd: 7000000, monthlyVnd: 17500000, depositUsd: 600 }, availability: 'manager_confirmation',
    descriptions: txt('Классический круизер с низкой посадкой и спокойной управляемостью.', 'Classic cruiser with a low seat height, relaxed riding position and steady handling.', 'Cruiser cổ điển với yên thấp, tư thế lái thư giãn và điều khiển ổn định.', '낮은 시트와 편안한 자세, 안정적인 핸들링을 갖춘 클래식 크루저입니다.'),
    included: commonIncluded, requirements: [txt('Фото паспорта', 'Passport photo', 'Ảnh hộ chiếu', '여권 사진'), txt('Депозит $600 в USD, EUR, crypto или VND', '$600 deposit in USD, EUR, crypto or VND', 'Đặt cọc $600 bằng USD, EUR, crypto hoặc VND', 'USD, EUR, 암호화폐 또는 VND로 $600 보증금')],
    tags: ['286 cc', 'Low seat', 'Cruiser'], photos: [{ src: `${official}/assets/vehicles/client-fleet/honda-rebel-300-2023.webp`, alt: txt('Honda Rebel 300', 'Honda Rebel 300', 'Honda Rebel 300', 'Honda Rebel 300'), sourceUrl: `${official}/en/rentals/motorcycles/honda-rebel-300-2023` }],
    sourceUrl: `${official}/en/rentals/motorcycles/honda-rebel-300-2023`, verifiedAt: '2026-08-25'
  },
  {
    id: 'espero-50-2024', slug: 'detech-espero-50cc-2024', brand: 'Detech', model: 'Espero 50cc', year: 2024,
    category: 'scooter', engineLabel: '49 cc', weightKg: 95, cruiseSpeed: '45–55 km/h', fuelUse: '~1.9 l/100 km', capacity: '2 people / 150 kg',
    pricing: { dailyVnd: 450000, weeklyVnd: 2500000, monthlyVnd: 4000000, depositUsd: 200 }, availability: 'manager_confirmation',
    descriptions: txt('Лёгкий городской скутер с автоматической трансмиссией, компактный и экономичный.', 'Lightweight city scooter with automatic transmission, compact and fuel-efficient.', 'Scooter đô thị nhẹ với hộp số tự động, nhỏ gọn và tiết kiệm nhiên liệu.', '자동 변속기를 갖춘 가볍고 경제적인 도심형 스쿠터입니다.'),
    included: commonIncluded, requirements: [txt('Фото паспорта', 'Passport photo', 'Ảnh hộ chiếu', '여권 사진'), txt('Депозит $200 в USD, EUR, crypto или VND', '$200 deposit in USD, EUR, crypto or VND', 'Đặt cọc $200 bằng USD, EUR, crypto hoặc VND', 'USD, EUR, 암호화폐 또는 VND로 $200 보증금')],
    tags: ['49 cc', 'Automatic', 'City'], photos: [{ src: `${official}/assets/vehicles/client-fleet/detech-espero-50cc-2024.webp`, alt: txt('Detech Espero 50cc', 'Detech Espero 50cc', 'Detech Espero 50cc', 'Detech Espero 50cc'), sourceUrl: `${official}/en/rentals/motorcycles/detech-espero-50cc-2024` }],
    sourceUrl: `${official}/en/rentals/motorcycles/detech-espero-50cc-2024`, verifiedAt: '2026-08-25'
  }
];

export const getVehicle = (id: string): Vehicle | undefined => vehicles.find(v => v.id === id);
