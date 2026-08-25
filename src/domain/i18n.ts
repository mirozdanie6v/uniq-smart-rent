import type { Language } from './types.js';

type Dictionary = Record<string, string>;
export const languages: { id: Language; label: string }[] = [
  { id: 'ru', label: 'RU' }, { id: 'en', label: 'EN' }, { id: 'vi', label: 'VI' }, { id: 'ko', label: 'KO' }
];

const dict: Record<Language, Dictionary> = {
  ru: {
    brandSub: 'NHA TRANG · SMART RENT', home: 'Главная', catalog: 'Каталог', bookings: 'Аренды', profile: 'MY UNIQ',
    find: 'Найти свободную технику', available: 'Доступно сейчас', all: 'Все', send: 'Отправить заявку',
    team: 'Команда', owner: 'Владелец', client: 'Клиент', fleetToday: 'Парк сегодня', events: 'Ближайшие события',
    demo: 'DEMO VISUAL', book: 'Забронировать', details: 'Подробнее', back: 'Назад', yourRental: 'Ваша аренда',
    success: 'Заявка создана в demo-режиме', switchRole: 'Режим', from: 'Получение', to: 'Возврат', total: 'Итого',
    deposit: 'Депозит', status: 'Статус', analytics: 'Ключевые KPI', load: 'Загрузка', idle: 'Окна простоя', repeat: 'Повторные',
    conversion: 'Конверсия', noBookings: 'Заявок пока нет', clientHistory: 'История и предпочтения', language: 'Язык'
  },
  en: {
    brandSub: 'NHA TRANG · SMART RENT', home: 'Home', catalog: 'Catalog', bookings: 'Rentals', profile: 'MY UNIQ',
    find: 'Find available transport', available: 'Available now', all: 'All', send: 'Send request',
    team: 'Team', owner: 'Owner', client: 'Client', fleetToday: 'Fleet today', events: 'Upcoming events',
    demo: 'DEMO VISUAL', book: 'Book', details: 'Details', back: 'Back', yourRental: 'Your rental',
    success: 'Demo request created', switchRole: 'Mode', from: 'Pick-up', to: 'Return', total: 'Total',
    deposit: 'Deposit', status: 'Status', analytics: 'Key KPIs', load: 'Utilization', idle: 'Idle windows', repeat: 'Repeat',
    conversion: 'Conversion', noBookings: 'No requests yet', clientHistory: 'History & preferences', language: 'Language'
  },
  vi: {
    brandSub: 'NHA TRANG · SMART RENT', home: 'Trang chủ', catalog: 'Danh mục', bookings: 'Thuê xe', profile: 'MY UNIQ',
    find: 'Tìm xe còn trống', available: 'Đang có sẵn', all: 'Tất cả', send: 'Gửi yêu cầu',
    team: 'Đội ngũ', owner: 'Chủ sở hữu', client: 'Khách hàng', fleetToday: 'Đội xe hôm nay', events: 'Sự kiện sắp tới',
    demo: 'HÌNH DEMO', book: 'Đặt xe', details: 'Chi tiết', back: 'Quay lại', yourRental: 'Lượt thuê của bạn',
    success: 'Đã tạo yêu cầu demo', switchRole: 'Chế độ', from: 'Nhận xe', to: 'Trả xe', total: 'Tổng',
    deposit: 'Đặt cọc', status: 'Trạng thái', analytics: 'KPI chính', load: 'Tỷ lệ sử dụng', idle: 'Khoảng trống', repeat: 'Quay lại',
    conversion: 'Chuyển đổi', noBookings: 'Chưa có yêu cầu', clientHistory: 'Lịch sử & sở thích', language: 'Ngôn ngữ'
  },
  ko: {
    brandSub: 'NHA TRANG · SMART RENT', home: '홈', catalog: '카탈로그', bookings: '렌탈', profile: 'MY UNIQ',
    find: '이용 가능한 차량 찾기', available: '현재 이용 가능', all: '전체', send: '요청 보내기',
    team: '팀', owner: '소유자', client: '고객', fleetToday: '오늘의 차량', events: '예정 이벤트',
    demo: '데모 비주얼', book: '예약', details: '상세', back: '뒤로', yourRental: '내 렌탈',
    success: '데모 요청이 생성되었습니다', switchRole: '모드', from: '픽업', to: '반납', total: '합계',
    deposit: '보증금', status: '상태', analytics: '핵심 KPI', load: '가동률', idle: '공실 구간', repeat: '재이용',
    conversion: '전환율', noBookings: '요청이 없습니다', clientHistory: '이력 및 선호', language: '언어'
  }
};

export function t(lang: Language, key: string): string { return dict[lang][key] ?? dict.en[key] ?? key; }
