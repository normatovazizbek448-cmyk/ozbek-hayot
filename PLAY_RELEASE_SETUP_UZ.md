# O‘zbekistondagi Hayot — Google Play Production AAB

## Hozirgi production konfiguratsiya
- applicationId: `com.asadbekai.simulator`
- versionCode: `18`
- versionName: `1.18.0`
- minSdk: `23`
- targetSdk: `36`
- compileSdk: `36`
- AGP: `8.13.2`
- Gradle: `8.13`
- JDK: `17`
- Internet: HTTPS/WSS only

Google Play 2026-08-31 dan yangi ilovalar va update'lar uchun API 36+ target talab qiladi. Shu sabab target/compile 36 qo‘yildi.

## 1. Upload key yaratish
Linux/macOS:

```bash
keytool -genkeypair -v \\
  -keystore ozbekistondagi-hayot-upload.jks \\
  -alias ozbekistondagi-hayot-upload \\
  -keyalg RSA -keysize 4096 -validity 10000
```

Windows PowerShell ham xuddi shu `keytool` buyrug‘idan foydalanishi mumkin.

**JKS faylini Git/ZIP/Play Store listingga joylamang.** Backupni xavfsiz offline joyda saqlang.

## 2. Signing environment
Linux/macOS:

```bash
export ANDROID_RELEASE_STORE_FILE="$PWD/ozbekistondagi-hayot-upload.jks"
export ANDROID_RELEASE_STORE_PASSWORD='YOUR_STORE_PASSWORD'
export ANDROID_RELEASE_KEY_ALIAS='ozbekistondagi-hayot-upload'
export ANDROID_RELEASE_KEY_PASSWORD='YOUR_KEY_PASSWORD'
```

PowerShell:

```powershell
$env:ANDROID_RELEASE_STORE_FILE="$PWD\ozbekistondagi-hayot-upload.jks"
$env:ANDROID_RELEASE_STORE_PASSWORD="YOUR_STORE_PASSWORD"
$env:ANDROID_RELEASE_KEY_ALIAS="ozbekistondagi-hayot-upload"
$env:ANDROID_RELEASE_KEY_PASSWORD="YOUR_KEY_PASSWORD"
```

## 3. Production AAB

```bash
./gradlew clean bundleRelease
```

Natija:

`app/build/outputs/bundle/release/app-release.aab`

## 4. Tekshirish

```bash
jarsigner -verify -verbose -certs app/build/outputs/bundle/release/app-release.aab
```

AAB package/application ID `com.asadbekai.simulator` bilan mos bo‘lishi kerak.

## 5. Muhim

- Bu loyiha serverga `wss://ozbekistondagi-hayot-server.onrender.com/ws` orqali ulanadi.
- Production serverning uptime, database, backup, TLS certificate va monitoringi alohida tekshirilishi kerak.
- UC real pulga sotiladigan bo‘lsa, Google Play Billing integratsiyasi va Play Console deklaratsiyalari kerak.
- Keystore parolini source code yoki `gradle.properties` ichiga yozmang.
- Play Store update'lari uchun package name va signing key keyingi release'larda o‘zgarmasligi kerak.
