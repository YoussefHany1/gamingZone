#!/bin/bash
# Decode the GOOGLE_SERVICES_JSON_BASE64 secret and write google-services.json
# This runs as an EAS Build post-install hook (after prebuild generates the android directory)

if [ -z "$GOOGLE_SERVICES_JSON_BASE64" ]; then
  echo "⚠️  GOOGLE_SERVICES_JSON_BASE64 is not set, skipping google-services.json injection"
  exit 0
fi

echo "📄 Injecting google-services.json from EAS Secret..."

# Write to project root (for prebuild/expo config plugins)
echo "$GOOGLE_SERVICES_JSON_BASE64" | base64 --decode > ./google-services.json
echo "✅ Written to ./google-services.json"

# Write to android/app/ (where Gradle expects it)
if [ -d "./android/app" ]; then
  echo "$GOOGLE_SERVICES_JSON_BASE64" | base64 --decode > ./android/app/google-services.json
  echo "✅ Written to ./android/app/google-services.json"
else
  echo "⚠️  android/app directory not found yet, creating it..."
  mkdir -p ./android/app
  echo "$GOOGLE_SERVICES_JSON_BASE64" | base64 --decode > ./android/app/google-services.json
  echo "✅ Written to ./android/app/google-services.json"
fi

echo "✅ google-services.json injection complete"
