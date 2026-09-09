# spacetrace sitesi — Claude Code notları

Bu depo yalnızca tanıtım sitesi. Ürünün kendisi, sürüm hattı ve indirme
sözleşmesi [core depoda](https://github.com/unalcakir28/spacetrace):
`docs/RELEASING.md` kanalları ve varlık adlarını anlatıyor.

**İndirme sözleşmesi burada değil, orada tanımlı.** `src/data/releases.ts`
içindeki etiket ve dosya adları, core deposundaki üç sürüm iş akışının ürettiği
dizelerle birebir aynı olmak zorunda; birini yeniden adlandırmak her indirme
bağlantısını sessizce kırar.

## Ne olduğu

Bu depo **Astro** projesi. Beş dil (en, tr, it, fr, de) ve 31 statik sayfa
üretiyor; `pages.yml` derleyip GitHub Pages'e yüklüyor, Pages de
`spacetrace.teknobakkall.com` alan adından sunuyor.

Kolay bozulan yerler:

- **Sözlükler İngilizceye karşı tipli.** `src/i18n/ui/en.ts` kaynak; diğer dört
  dil `Dictionary` tipiyle ona uyuyor. Bir dile eklenip diğerlerinde unutulan
  anahtar `yarn typecheck` ile derleme hatası veriyor, canlı sayfada boşluk
  olarak değil. İş akışı bu yüzden `build`'den önce `typecheck` çalıştırıyor.
- **`yarn check` yazma.** yarn 1.x'in kendi yerleşik komutu ve script'i
  gölgeliyor — sessizce "Folder in sync" der ve tip denetimi hiç çalışmaz.
  Script'in adı bu yüzden `typecheck`.
- **İndirme sözleşmesi tek yerde:** `src/data/releases.ts`. Etiket adları ve
  varlık adları yukarıdaki tablodakilerle aynı olmak zorunda; oradaki bir
  yeniden adlandırma her indirme bağlantısını kırar.
- **JS kapalıyken de çalışan bir indirme sayfası bırakmak şart.** Bağlantılar
  işaretlemede gerçek dosyalara işaret ediyor (`continuous` etiketleri hiç
  kımıldamıyor); `src/scripts/releases.ts` yalnızca üzerine bilgi ekliyor —
  sürüm, tarih, boyut, ve kararlı sürüm çıktığında bağlantıların ona
  yükseltilmesi. Her adım korumalı, hata sessizce yutuluyor.
- **Etkileşimli treemap tek React adası** (`src/components/demo/`). Sunucuda da
  makul bir geometriyle çiziliyor, yani JS olmadan da dolu görünüyor.
- **`base: "/"`** — her iç bağlantı `localeUrl()` üzerinden geçiyor. Elle yazılan
  bir yol `astro dev`'de çalışır, üretimde 404 verir. Bu dolaylılık sayesinde
  site core deposundan kendi alan adına tek satırlık değişiklikle taşındı.
- **`public/CNAME` alan adını taşıyor.** Silinirse Pages varsayılan adrese döner
  ve sertifika düşer.

SEO ve AI keşfedilebilirliği tarafında kalan işler core deposunun TODO.md'sinde,
"Yayın sonrası — SEO ve AISEO" bölümünde; ölçümler orada.

### Otomatik dil

Pages statik, yani `Accept-Language` okuyacak bir sunucu yok — algılama
`src/components/LangRedirect.astro` içindeki satır içi script'te, `<head>`'in en
başında (stylesheet ve fontlardan önce, terk edilecek sayfa için boşuna istek
atılmasın diye).

Dört kural var ve her biri bunun kullanıcıya karşı çalışmasını engellemek için:

1. **Yalnızca öneksiz (İngilizce) sayfalarda çalışıyor.** `/tr/hub/` gibi dili
   adıyla söyleyen bir adres birinin bilinçli seçimi ya da paylaştığı bağlantı;
   oradan taşımak yanlış olurdu.
2. **Açık seçim kalıcı kazanıyor.** Değiştiriciden dil seçmek, bildirim
   çubuğundan "English"e dönmek ya da çubuğu kapatmak `localStorage`'a
   `spacetrace.lang` yazıyor; ondan sonra bu script hiç çalışmıyor.
3. **Tarayıcının tercih listesinde İngilizce, diğer dört dilden önce geçiyorsa
   hiçbir şey olmuyor.** Sıra okunuyor: `["en-GB","tr"]` İngilizce'de kalıyor,
   `["tr-TR","en-US"]` Türkçe'ye gidiyor. Desteklenmeyen bir dil de İngilizce'de
   bırakıyor (`hreflang` içindeki `x-default` bu).
4. **Her hata sayfayı yerinde bırakıyor** — gizli sekmede `localStorage`
   istisna atabilir, `navigator.languages` olmayabilir.

Yönlendirmeden sonra hedef sayfada bir kez bildirim çubuğu görünüyor
(`LangNotice.astro`): o dilde bir cümle ve çıkış yolu olarak **English**.
Haber verilmeden taşınmak, dil algılamanın insanların sevmediği kısmı; çıkış tek
tık ve okuyabildikleri bir kelime olmak zorunda. Çubuk `sessionStorage`
bayrağıyla tek seferlik — okunduğu anda siliniyor.

`404` sayfasında algılama kapalı (`detectLanguage={false}`): yolu çevrilmiş
rotalardan biri değil.

#### Doğrulama zorunlu, ve derlenmiş çıktıya karşı

`yarn verify` (`website/scripts/verify-lang.mjs`) yönlendiriciyi **`dist/`'ten
çıkarıp sahte bir tarayıcıda çalıştırıyor** ve 20 vakada okuyucunun nereye
gittiğini ölçüyor. Pages iş akışında `yarn build`'den sonra çalışıyor.

Bu adım bir sebeple var: özellik bir kez **etkisiz halde canlıya çıktı**.
Astro'da satır içi script gövdesini JSX çocuğu olarak `` {`…`} `` ile sarmak,
sarmalayıcıyı olduğu gibi HTML'e basıyor; ortaya çıkan kod bir blok içinde
değerlendirilip atılan bir string oluyor. Sonuç: derleme yeşil, script sayfada,
içinde `window.location.replace` **geçiyor**, ve hiçbir şey yapmıyor. Yani
"script var mı" ya da "içinde şu ifade var mı" diye bakan bir test bunu
onaylardı — tek dişli kontrol script'i çalıştırmak.

İkinci tuzak: `define:vars` ile `set:html` birlikte kullanılamıyor, `define:vars`
kazanıyor ve gövde tamamen kayboluyor. Bu yüzden tek mekanizma var — değerler
dahil tüm script frontmatter'da string olarak kuruluyor ve `set:html` ile
veriliyor.

Davranışı değiştirirken `verify-lang.mjs`'deki vakaları birlikte güncelle.

## Changelog sayfası

`/changelog/` beş dilde, kaynağı **bu depo değil**:
`src/data/changelog.json`, çekirdek depodaki
`crates/changelog/changelog.json`'ın kopyası. Aynı dosya CLI'ya, masaüstüne ve
hub'a da derleniyor — yani sayfadaki metin ile uygulamanın "Yenilikler"
penceresindeki metin ayrışamaz. Metni burada düzeltme, çekirdekte düzelt.

```bash
yarn sync:changelog    # kopyayı tazeler
```

**Tazeleme Pages iş akışının içinde.** Her push'ta ve altı saatte bir
çalışıyor: indiriyor, doğruluyor, değiştiyse commit'liyor, sonra derleyip
yayınlıyor. Elle tetiklemek için `gh workflow run pages.yml`.

Ayrı bir "sync" iş akışı olarak denendi ve **çalışmadı**: commit'liyordu ama
Pages hiç koşmuyordu, çünkü `GITHUB_TOKEN` ile yapılan bir push bilerek başka
iş akışı tetiklemiyor. Bölmeye kalkma; tek iş akışı, tek dağıtım yolu.

İndirme adımı ölümcül değil — commit'lenmiş kopya geçerli bir sayfa, ve bir ağ
hatası ya da bozuk bir yukarı akış dosyası sitenin dağıtımını düşürmemeli.

`src/data/changelog.ts`'teki `const source: Source = raw` **kontrolün kendisi**:
`text` alanı `Record<Locale, string>` olduğu için bir girdide Almanca eksikse
`yarn typecheck` kırılıyor — sözlüklerin İngilizce'ye karşı tiplenmesinin veri
tarafındaki karşılığı. Bu, silip denenerek doğrulandı, varsayılmadı.

`kind` alanı orada denetlenemiyor (JSON içe aktarımı dize literallerini
genişletiyor), o yüzden `toKind` derleme sırasında fırlatıyor.

Girdi metinlerindeki `` `backtick` `` parçaları `<code translate="no">` olarak
render ediliyor: komut ve bayraklar beş dilde de aynı, ve tarayıcının
`--no-clone-dedupe`'u çevirmeyi önermesi onu bozmayı önermek olurdu.
