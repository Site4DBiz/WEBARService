#!/bin/bash

# Supabase CLI Setup Script
# This script helps you set up Supabase CLI and initialize your project

echo "🚀 Supabase Setup Script"
echo "========================"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "📦 Supabase CLI not found. Installing..."
    
    # Detect OS and install accordingly
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            brew install supabase/tap/supabase
        else
            echo "❌ Homebrew not found. Please install Homebrew first or install Supabase CLI manually."
            echo "Visit: https://supabase.com/docs/guides/cli/getting-started"
            exit 1
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        if command -v brew &> /dev/null; then
            brew install supabase/tap/supabase
        else
            # Alternative: Download binary directly
            echo "Installing via direct download..."
            curl -L https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz | tar -xz
            sudo mv supabase /usr/local/bin/
        fi
    else
        echo "❌ Unsupported OS. Please install Supabase CLI manually."
        echo "Visit: https://supabase.com/docs/guides/cli/getting-started"
        exit 1
    fi
    
    echo "✅ Supabase CLI installed successfully!"
else
    echo "✅ Supabase CLI is already installed (version: $(supabase --version))"
fi

echo ""
echo "📝 Initializing Supabase project..."
echo ""

# Initialize Supabase project if not already initialized
if [ ! -d "supabase" ]; then
    supabase init
    echo "✅ Supabase project initialized!"
else
    echo "ℹ️  Supabase project already initialized"
fi

echo ""
echo "🔗 Linking to remote project..."
echo "Please enter your Supabase project details:"
echo ""

# Get project reference from user
read -p "Enter your Supabase project reference (e.g., abcdefghijklmnop): " PROJECT_REF

if [ -n "$PROJECT_REF" ]; then
    supabase link --project-ref "$PROJECT_REF"
    echo "✅ Project linked successfully!"
else
    echo "⚠️  No project reference provided. Skipping link step."
    echo "You can link later using: supabase link --project-ref YOUR_PROJECT_REF"
fi

echo ""
echo "📋 Next steps:"
echo "1. Update your .env.local file with your Supabase project credentials"
echo "2. Run 'supabase db pull' to sync your database schema"
echo "3. Run 'npm run dev' to start your development server"
echo ""
echo "📚 Documentation:"
echo "- Supabase CLI: https://supabase.com/docs/guides/cli"
echo "- Next.js + Supabase: https://supabase.com/docs/guides/getting-started/quickstarts/nextjs"
echo ""
echo "✨ Setup complete!"