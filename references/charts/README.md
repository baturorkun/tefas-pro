# Portfoy performans grafigi — referans

`portfolio-performance.png`, onceki projenin (`github/tefas`, `main.py`
icindeki `generate_history_chart`) urettigi grafiktir. RQ-0015 bunu tefas-pro'ya
tasir. Grafik matplotlib ile uretilmisti; tefas-pro'da satir ici SVG olarak
cizilir, kutuphane eklenmez.

## Referans uygulamanin secimleri

| Ozellik | Deger |
|---|---|
| Panel duzeni | 2 satir, ortak x ekseni, yukseklik orani 2:1 |
| Ust panel | cizgi + alan dolgusu, `#1f4e79`, cizgi kalinligi 1.8, dolgu alpha 0.12 |
| Dolgu tabani | serinin en dusuk degeri x 0.998 |
| Alt panel | dikey bar, genislik 0.7 |
| Pozitif bar | `#1a7a1a` |
| Negatif bar | `#c00000` |
| Sifir cizgisi | siyah, kalinlik 0.6 |
| Grid | alpha 0.3, kesikli |
| Y ekseni (ust) | binde bir, `1,234K` bicimi |
| Y ekseni (alt) | `+0.5%` bicimi, isaretli |
| Tarih etiketi | en fazla ~8 adet, 30 derece egik |
| Varsayilan pencere | son 30 gun |

## Kritik nokta: cash-flow adjustment

Referans uygulamanin kodundaki iki yorum bunun nedenini soyluyor:

```
# Daily return bars should be cash-flow-adjusted (so red/green days are visible)
# Build cash-flow-adjusted portfolio value line: start at first day's value,
# then add only organic daily_gain (excluding new capital injections)
```

Cizgi ham portfoy degeri degildir. Ilk gunun degerinden baslanir ve her gun
yalnizca organik kazanc eklenir; sermaye girisi/cikisi seriye girmez. Aksi
halde para yatirilan gun cizgi dikey firlar ve o gunun gercek performansi
gorunmez olur. Ayni duzeltme gunluk getiri yuzdesi icin de gecerlidir.
