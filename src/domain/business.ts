import type { BusinessInfo } from './types.js';

export const businessInfo: BusinessInfo = {
  legalName: 'UNIQ Moto Company Limited',
  brand: 'UNIQ Moto',
  phone: '+84372112370',
  phoneDisplay: '+84 37 211 2370',
  whatsappUrl: 'https://wa.me/84372112370',
  telegramHandle: '@RikRent1',
  telegramUrl: 'https://t.me/RikRent1',
  zaloPhone: '+84 37 211 2370',
  website: 'https://uniqmoto.com',
  publicRating: 4.9,
  publicReviewCount: 204,
  publicFleetCount: 82,
  branches: [
    {
      id: 'north',
      name: { ru: 'Северный филиал', en: 'North branch', vi: 'Chi nhánh phía Bắc', ko: '북부 지점' },
      address: '312 Đ. 2/4, Bắc Nha Trang, Khánh Hòa 650000, Vietnam',
      mapsUrl: 'https://www.google.com/maps/search/?api=1&query=UNIQ+Moto+312+Duong+2%2F4+Nha+Trang'
    },
    {
      id: 'center',
      name: { ru: 'Центр города', en: 'City center branch', vi: 'Chi nhánh trung tâm', ko: '도심 지점' },
      address: '254 Nguyễn Thị Minh Khai, Nha Trang, Khánh Hòa 650000, Vietnam',
      mapsUrl: 'https://www.google.com/maps/search/?api=1&query=UNIQ+Moto+254+Nguyen+Thi+Minh+Khai+Nha+Trang'
    }
  ],
  verifiedAt: '2026-08-25'
};
