#!/bin/sh
set -e
APP_HOME=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
VERSION=8.13
MIN_MAJOR=8
MIN_MINOR=7

version_ok() {
  v="$1"
  major=$(printf '%s\n' "$v" | sed -n 's/^Gradle \([0-9][0-9]*\)\..*/\1/p')
  minor=$(printf '%s\n' "$v" | sed -n 's/^Gradle [0-9][0-9]*\.\([0-9][0-9]*\).*/\1/p')
  [ -n "$major" ] && [ -n "$minor" ] || return 1
  [ "$major" -gt "$MIN_MAJOR" ] && return 0
  [ "$major" -eq "$MIN_MAJOR" ] && [ "$minor" -ge "$MIN_MINOR" ]
}

for p in   "$(command -v gradle 2>/dev/null || true)"   "$HOME/.gradle/gradle/bin/gradle"   "/data/data/com.m4coding.ide/files/usr/bin/gradle"   "/data/user/0/com.m4coding.ide/files/usr/bin/gradle"   "/data/data/com.itsaky.androidide/files/usr/bin/gradle"   "/data/user/0/com.itsaky.androidide/files/usr/bin/gradle"; do
  if [ -x "$p" ]; then
    outv=$("$p" --version 2>/dev/null | sed -n 's/^Gradle /Gradle /p' | head -n 1 || true)
    if version_ok "$outv"; then
      exec "$p" "$@"
    fi
  fi
done

CACHE="${GRADLE_USER_HOME:-$HOME/.gradle}/wrapper/dists/gradle-${VERSION}-bin"
DIST="$CACHE/gradle-${VERSION}"
if [ -x "$DIST/bin/gradle" ]; then
  exec "$DIST/bin/gradle" "$@"
fi

mkdir -p "$CACHE"
ZIP="$CACHE/gradle-${VERSION}-bin.zip"
URL="https://services.gradle.org/distributions/gradle-${VERSION}-bin.zip"

if command -v curl >/dev/null 2>&1; then
  curl -fL --retry 3 --retry-delay 2 "$URL" -o "$ZIP"
elif command -v wget >/dev/null 2>&1; then
  wget -O "$ZIP" "$URL"
else
  echo "Gradle 8.7 topilmadi: curl/wget mavjud emas." >&2
  exit 1
fi

unzip -tq "$ZIP" >/dev/null
rm -rf "$DIST"
unzip -q "$ZIP" -d "$CACHE"
exec "$DIST/bin/gradle" "$@"
