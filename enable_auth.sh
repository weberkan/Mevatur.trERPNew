#!/bin/bash

# Script to re-enable authentication in all API routes
# This reverses the temporary auth bypasses

echo "Re-enabling authentication in API routes..."

# List of API route files to fix
API_ROUTES=(
    "app/api/groups/route.ts"
    "app/api/groups/archive/route.ts"
    "app/api/participants/route.ts"
    "app/api/users/route.ts"
    "app/api/users/create/route.ts"
    "app/api/payments/route.ts"
    "app/api/expenses/route.ts"
    "app/api/rooms/route.ts"
    "app/api/company-entries/route.ts"
    "app/api/rates/route.ts"
)

for route_file in "${API_ROUTES[@]}"; do
    if [[ -f "$route_file" ]]; then
        echo "Processing $route_file..."
        
        # Remove the fake user line and restore auth checks
        sed -i '/const currentUser = { id: 1 }; \/\/ Fake user for testing/d' "$route_file"
        
        # Uncomment the actual auth check lines
        sed -i 's|// const currentUser = await getUserFromToken(request);|const currentUser = await getUserFromToken(request);|' "$route_file"
        sed -i 's|// if (!currentUser) {|if (!currentUser) {|' "$route_file"
        sed -i 's|//   return NextResponse.json({ error: '\''Unauthorized'\'' }, { status: 401 });|  return NextResponse.json({ error: '\''Unauthorized'\'' }, { status: 401 });|' "$route_file"
        sed -i 's|// }|}|' "$route_file"
        
        # Remove TEMPORARY comments
        sed -i '/TEMPORARY: Disable auth for testing/d' "$route_file"
        
        echo "✓ Fixed $route_file"
    else
        echo "⚠ File not found: $route_file"
    fi
done

echo ""
echo "Authentication has been re-enabled in all API routes!"
echo "Make sure to commit and deploy these changes."