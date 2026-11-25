# YSOL Internet geliştirme kuralları

Her oyun geliştirme oturumunun başında bu proje için Vite sunucusunu kontrol et. Çalışıyorsa aynı sunucuyu kullan. İlk kurulumda proje kökünde `npm install`, sonraki açılışlarda `npm run dev` çalıştır. Oyunu http://127.0.0.1:5173 üzerinden aç ve kullanıcı için sunucuyu çalışır bırak. Port başka projeye aitse boş bir port seç ve gerçek adresi paylaş.

HTML dosyalarını giriş sayfası olarak tut. Oyun davranışını sorumlu ES modülünde, stilleri styles klasöründe geliştir. Yeni özellikleri main.js veya scene.js içinde biriktirmek yerine ilgili özellik modülüne yerleştir.

Her değişiklikte etkilenen oyun akışını Vite üzerinden dene. Ortak sahne değişikliklerinde galeri sayfasını da aç. Kayıt biçimi değiştiğinde eski bir kaydın açılışını doğrula.
