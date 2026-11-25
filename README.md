# YSOL INTERNET

**[Tarayıcıda oyna](https://creamud.github.io/ysol-internet/)** · [3D sahne galerisi](https://creamud.github.io/ysol-internet/galeri.html)

YSOL INTERNET, kendi internet kafeni işlettiğin birinci şahıs 3D simülasyon. Kafene isim ver, kasalardan bilgisayarları aç, resepsiyonda müşterileri onayla ve seans ücretlerini tahsil et. Zamazingo’dan ekipman sipariş ederek kafeni büyüt, biriktirdiğin parayla YSOL GT’yi al ve mahallede sür.

## Oyun içinden

![Kafe ve resepsiyon](https://github.com/user-attachments/assets/16ea33f4-8e8b-4f4f-8e2d-fa32e834354e)

![Kafenin önündeki cadde ve YSOL GT](https://github.com/user-attachments/assets/3c4efb53-203b-4b48-8d5b-9bc320800ae7)

<details>
<summary>Kafe ismi ekranı</summary>

![Kafe ismi ekranı](https://github.com/user-attachments/assets/9c011745-57b7-47a9-a036-6436d2d370b3)

</details>

## Kontroller

| Tuş | İşlev |
| --- | --- |
| WASD | Yürü veya araç sür |
| Fare | Etrafa bak |
| E | Etkileşim, resepsiyona otur / kalk veya araçtan in |
| P | Telefonu aç |
| C | Elindeki kahveyi iç |
| Space | Zıpla veya araçla fren yap |
| Esc | Duraklat |

Standart eşlemeli Xbox ve PlayStation kumandalarında sol çubuk hareket, sağ çubuk bakış içindir. Menüde yön tuşlarıyla dolaş, A / × ile onayla ve B / ○ ile geri dön.

| Kumanda | İşlev |
| --- | --- |
| X / □ | Etkileşim veya araçtan in |
| A / × | Zıpla veya araçla fren yap |
| Y / △ | Kahveyi iç |
| LB / L1, RB / R1 | Eşyayı döndür, taşı veya taşımayı iptal et |
| View / Create | Telefon |
| Menu / Options | Duraklat veya devam et |
| RT / R2, LT / L2 | İleri ve geri gaz |

## Yerelde çalıştırma

Node.js 20.19+ veya 22.12+ ile proje kökünde bağımlılıkları kur ve Vite'ı başlat.

```sh
npm ci
npm run dev
```

[Oyunu](http://127.0.0.1:5173/) veya [sahne galerisini](http://127.0.0.1:5173/galeri.html) aç. Sonraki oturumlarda `npm run dev` yeterli.

Kayıt, rehber, ödeme ve sürüş testlerini `npm test` ile çalıştır.

## Otomatik kayıt

Oyun kafe adını, paranı, saati, aldığın eşyaları, siparişlerini ve aktif seansları tarayıcı profiline otomatik kaydeder. Aynı adresi aynı tarayıcı profiliyle yeniden açınca **Devam et** düğmesiyle oyuna dönebilirsin. Kayıtlar cihazlar arasında eşitlenmez. Site verilerini silmek ilerlemeni siler.

Masaüstü tarayıcı ve WebGL gerekir. Fareyle bakış için fare kilidi kullanılır. Oyun Three.js ile çalışır.
