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

echo "✅ google-services.json injection complete"
