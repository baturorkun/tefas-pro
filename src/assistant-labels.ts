/**
 * Asistan tool adlarının okunabilir karşılıkları.
 *
 * Paylaşılan modülde, çünkü aynı etiket iki yerde görünüyor: beklerken
 * "hangi adımdayız" satırında (sunucu akışı üretiyor) ve cevabın altındaki
 * kaynak satırında (arayüz çiziyor, geçmişten yüklenen konuşmalarda da).
 * Sunucu etiketi olayla göndermekle yetinseydi, geçmişten yüklenen bir
 * konuşmada elde yalnız `islem_sayimi` gibi ham adlar kalırdı.
 *
 * Ad kimliktir, etiket sunumdur: veritabanına ad yazılır, ekrana etiket.
 * Etiket değişince eski kayıtlar da yeni etiketle görünür.
 *
 * İsim tamlaması seçildi ki hem tek başına ("Fon listesi") hem de akışta
 * ("Fon listesi okunuyor…") doğru Türkçe olsun.
 */
export const TOOL_ETIKET: Record<string, string> = {
  portfoy_ozeti: 'Portföy özeti',
  fon_listesi: 'Fon listesi',
  dagilim: 'Varlık dağılımı',
  hisse_maruziyeti: 'Hisse maruziyeti',
  fon_detayi: 'Fon detayı',
  donemsel_getiri: 'Dönemsel getiri',
  kapanan_pozisyonlar: 'Kapanan pozisyonlar',
  islem_listesi: 'İşlem listesi',
  islem_sayimi: 'İşlem sayımı',
};

/** Etiketi olmayan tool ham adıyla görünür; boş satırdan iyidir. */
export function toolEtiket(ad: string): string {
  return TOOL_ETIKET[ad] ?? ad;
}
