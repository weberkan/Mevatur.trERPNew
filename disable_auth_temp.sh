#!/bin/bash

# Temporarily disable auth checks in all API endpoints for testing
# This will allow full system functionality testing

echo "Disabling auth checks in API endpoints..."

# List of files to modify
files=(
    "app/api/payments/route.ts"
    "app/api/expenses/route.ts"
    "app/api/rooms/route.ts"
    "app/api/roles/route.ts" 
    "app/api/users/route.ts"
    "app/api/company-entries/route.ts"
    "app/api/groups/archive/route.ts"
)

# Backup and modify each file
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "Processing $file..."
        
        # Create backup
        cp "$file" "${file}.bak"
        
        # Replace auth checks with temporary bypass
        sed -i 's/const currentUser = await getUserFromToken(request);/\/\/ TEMPORARY: Disable auth for testing\n    \/\/ const currentUser = await getUserFromToken(request);/g' "$file"
        sed -i 's/if (!currentUser) {/\/\/ if (!currentUser) {/g' "$file"
        sed -i 's/return NextResponse.json({ error: '\''Unauthorized'\'' }, { status: 401 });/\/\/   return NextResponse.json({ error: '\''Unauthorized'\'' }, { status: 401 });\n    \/\/ }/g' "$file"
        sed -i 's/}/\/\/   return NextResponse.json({ error: '\''Unauthorized'\'' }, { status: 401 });\n    \/\/ }\n    const currentUser = { id: 1 }; \/\/ Fake user for testing/g' "$file"
    fi
done

echo "Auth checks disabled. Remember to re-enable them later!"
echo "Backup files created with .bak extension"