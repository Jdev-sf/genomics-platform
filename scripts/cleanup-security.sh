# scripts/cleanup-security.sh

echo "🧹 Removing vulnerable dependencies..."

# Remove the problematic packages completely
npm uninstall nsp cli-table2 hoek boom wreck

echo "📦 Installing secure alternatives..."

# Install secure audit tools
npm install --save-dev --legacy-peer-deps \
  better-npm-audit@^3.7.3 \
  audit-ci@^6.6.1

echo "🔧 Updating package.json scripts..."

# The cleanup is complete - update your package.json scripts manually