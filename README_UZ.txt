ASADBEK AI — AndroidIDE loyiha (v4)

1. ZIP faylni AndroidIDE bilan oching.
2. Gradle Sync tugashini kuting.
3. Build → Assemble Debug APK ni bosing.
4. APK: app/build/outputs/apk/debug/app-debug.apk

Tuzatilgan:
- Gradle 8.4 wrapper va AGP 8.3.2 mosligi: buzilgan/yarim yuklangan ZIP avtomatik o‘chiriladi va qayta yuklanadi.
- FIRST PERSON kamera va mobil touch-look yaxshilandi.
- Samarqand, Andijon viloyati va Toshkent poytaxti worldlari qoldirildi.
- Eski Keng Tekislik, Tog‘/O‘rmon/Kul va takroriy World 4 olib tashlandi.
- Shahardagi oddiy binolar endi haqiqiy ochiq eshikli, ichki devor/floor/shift va sodda mebel bilan enterable.
- Bino devorlari bo‘yicha piyoda collision va eshik orqali kirish/chiqish qo‘shildi.
- Mobil uchun KIRISH tugmasi va E tugmasi qo‘shildi.
- 40 ta kasb va maosh tizimi saqlandi.
- 3D ishga tushmasa zaxira 2D rejim saqlanib qoladi.

Worldlar:
1) Samarqand — Registon
2) Andijon viloyati
3) Toshkent — O‘zbekiston poytaxti

AndroidIDE’da oldingi `End-of-central-directory signature not found` xatosi chiqsa,
yangi wrapper buzilgan Gradle ZIPni tekshiradi, o‘chiradi va qayta yuklaydi.


BUILD xatosi uchun v5:
- Android Gradle Plugin 8.3.2 ga moslashtirildi.
- Gradle Wrapper 8.4 ga yangilandi.
- Foydalanilmayotgan AppCompat/WebKit dependencylar olib tashlandi; loyiha oddiy Android Activity + WebView API bilan ishlaydi.
- MainActivity dan AndroidX annotation dependency olib tashlandi.
Bu o‘zgarishlar "No matching variant ... required '8.4'" xatosini bartaraf etish uchun kiritildi.


v14: AGP 8.3.2 + Gradle 8.4 tanlandi. Maqsad: 'required 8.7' variant xatosini yo'qotish.


V24: 120 ta shahar kiyimi + 50 ta BR kiyimi, so'm/UC random drop tizimi qo'shildi.
