#!/bin/bash
# scripts/install-security.sh

echo "🔧 Installing security dependencies..."

# Install security packages with legacy peer deps to avoid React conflicts
npm install --legacy-peer-deps \
  @upstash/ratelimit@^2.0.3 \
  @upstash/redis@^1.28.4 \
  isomorphic-dompurify@^2.13.0

# Update testing library to be compatible with React 19
npm install --save-dev --legacy-peer-deps \
  @testing-library/react@^15.0.0 \
  eslint-plugin-security@^3.0.1

echo "✅ Security dependencies installed successfully!"

echo "🗄️ Setting up database indices..."

# Apply database migration with proper handling
npx prisma migrate dev --name add_performance_indices

echo "✅ Database indices created successfully!"

echo "🔐 Security setup complete!"
echo "Next steps:"
echo "1. Update your .env file with Upstash Redis credentials"
echo "2. Test rate limiting with: npm run dev"
echo "3. Run security audit: npm run security:audit"