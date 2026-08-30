import { describe, expect, it } from 'vitest';

import {
  addDays,
  dailyWindows,
  isWeekend,
  monthlyWindows,
  mergeDailySources,
  monthsBack,
  parseArgs,
  prevWeekday,
  todayIso,
} from '../src/collector.js';
import { parseWatchlistFile } from '../src/db/seed.js';

describe('tarih yardımcıları', () => {
  it('todayIso yerel takvim gününü verir', () => {
    expect(todayIso(new Date(2026, 7, 30, 1, 30))).toBe('2026-08-30');
  });
  it('monthsBack ay ve yıl sınırını geçer', () => {
    expect(monthsBack('2026-08-30', 6)).toBe('2026-02-28');
    expect(monthsBack('2026-01-15', 1)).toBe('2025-12-15');
  });
  it('hedef ayda o gün yoksa ayın son gününe kırpar', () => {
    expect(monthsBack('2028-03-31', 1)).toBe('2028-02-29'); // artık yıl
    expect(monthsBack('2027-03-31', 1)).toBe('2027-02-28');
  });
});

describe('parseArgs', () => {
  it('varsayılan: akış 12 ay, büyüklük 6 ay, artımlı', () => {
    expect(parseArgs([])).toEqual({
      funds: undefined, backfill: false, skipYield: false, flowMonths: 12, sizeMonths: 6,
    });
  });
  it('bayrakları okur', () => {
    expect(parseArgs(['--funds', 'AAA,BBB', '--backfill', '--skip-yield',
                      '--flow-months', '24', '--size-months', '3'])).toEqual({
      funds: ['AAA', 'BBB'], backfill: true, skipYield: true, flowMonths: 24, sizeMonths: 3,
    });
  });
});

describe('iş günü pencereleri', () => {
  it('hafta sonunu tanır', () => {
    expect(isWeekend('2026-08-29')).toBe(true);  // Cumartesi
    expect(isWeekend('2026-08-30')).toBe(true);  // Pazar
    expect(isWeekend('2026-08-28')).toBe(false); // Cuma
  });
  it('Pazartesiden önceki hafta içi gün Cumadır', () => {
    expect(prevWeekday('2026-08-31')).toBe('2026-08-28');
    expect(prevWeekday('2026-08-28')).toBe('2026-08-27');
  });
  it('günlük pencereler hafta sonu içermez ve uç uca eklenir', () => {
    const w = dailyWindows('2026-08-20', '2026-08-28');
    expect(w.map((x) => x.end)).toEqual([
      '2026-08-21', '2026-08-24', '2026-08-25', '2026-08-26', '2026-08-27', '2026-08-28',
    ]);
    // Pazartesi penceresi Cuma'dan başlar
    expect(w[1]).toEqual({ start: '2026-08-21', end: '2026-08-24' });
    for (let i = 1; i < w.length; i += 1) expect(w[i]!.start).toBe(w[i - 1]!.end);
  });
  it('kaçırılan günler telafi edilir: son kayıttan bugüne kadar pencere üretilir', () => {
    // Sunucu Cuma'dan sonra kapalı kaldı, Salı açıldı: Pazartesi ve Salı gelir.
    const w = dailyWindows('2026-08-28', '2026-09-01');
    expect(w.map((x) => x.end)).toEqual(['2026-08-31', '2026-09-01']);
    expect(w[0]?.start).toBe('2026-08-28');
  });
  it('hafta sonunda yeni pencere üretilmez', () => {
    expect(dailyWindows('2026-08-28', '2026-08-30')).toEqual([]);
  });
  it('aylık pencereler bitişik, en yenisi verilen tarihte biter', () => {
    const w = monthlyWindows('2026-02-28', 3);
    expect(w).toEqual([
      { start: '2025-11-30', end: '2025-12-31' },
      { start: '2025-12-31', end: '2026-01-31' },
      { start: '2026-01-31', end: '2026-02-28' },
    ]);
  });
  it('addDays ay ve yıl sınırını geçer', () => {
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
  });
});

describe('parseWatchlistFile', () => {
  it('durum verilmezse watching', () => {
    expect(parseWatchlistFile('AAA\nBBB owned\n')).toEqual([
      { code: 'AAA', status: 'watching' },
      { code: 'BBB', status: 'owned' },
    ]);
  });
  it('yorum ve boş satırları atlar', () => {
    expect(parseWatchlistFile('# not\n\n  \nCCC owned\n')).toEqual([
      { code: 'CCC', status: 'owned' },
    ]);
  });
  it('kodu büyük harfe çevirir', () => {
    expect(parseWatchlistFile('ddd')[0]?.code).toBe('DDD');
  });
  it('geçersiz durumda patlar', () => {
    expect(() => parseWatchlistFile('AAA sahip')).toThrow(/geçersiz durum/);
  });
});

describe('mergeDailySources', () => {
  // Dört kaynak aynı güne farklı alanlar yazar. Ayrı ayrı upsert edilirlerse
  // aynı satır birden çok kez yazılır ve ingest_run.rows_upserted gerçek satır
  // sayısını aşar — backfill 33.336 raporlarken veritabanında 23.739 satır vardı.
  it('aynı günün alanlarını tek satırda birleştirir', () => {
    const rows = mergeDailySources(
      'THF',
      { date: '2026-08-28', price: 2.73 },
      [{ date: '2026-08-28', returnPct: 1.8 }, { date: '2026-08-27', returnPct: 0.4 }],
      [{ date: '2026-08-28', netFlow: 100 }],
    );
    expect(rows).toHaveLength(2);
    const son = rows.find((r) => r.trade_date === '2026-08-28');
    expect(son).toEqual({
      fund_code: 'THF', trade_date: '2026-08-28',
      nav_per_share: 2.73, daily_return_pct: 1.8, net_flow: 100,
    });
  });
  it('yalnız bir kaynağı olan gün de satır üretir', () => {
    const rows = mergeDailySources('X', null, [{ date: '2026-01-02', returnPct: 1 }], []);
    expect(rows).toEqual([
      { fund_code: 'X', trade_date: '2026-01-02', daily_return_pct: 1 },
    ]);
  });
  it('hiç veri yoksa boş döner', () => {
    expect(mergeDailySources('X', null, [], [])).toEqual([]);
  });
});
