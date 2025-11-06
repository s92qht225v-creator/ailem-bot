#!/bin/bash
# Script to remove useTranslation imports from components

cd /Users/ali/ailem-bot

# Find all files with useTranslation and remove the import line
find src/components -name "*.jsx" -type f -exec sed -i '' '/import.*useTranslation/d' {} \;

# Remove const { t } = useTranslation() lines
find src/components -name "*.jsx" -type f -exec sed -i '' '/const.*useTranslation()/d' {} \;

# Remove const { t, language } = useTranslation() lines  
find src/components -name "*.jsx" -type f -exec sed -i '' '/const.*{.*t.*language.*}.*useTranslation/d' {} \;

echo "✅ Removed useTranslation imports from components"
echo "⚠️  You still need to replace t() calls with Uzbek text manually"
