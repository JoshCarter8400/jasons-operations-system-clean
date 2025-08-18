# 🚨 URGENT: Add Address Column to Database

## Problem
The UI has an address field but the database table `business_settings` is missing the `address` column, causing the error:
```
"table business_settings has no column named address"
```

## Quick Fix - Browser Console Method

1. **Open the React app** in your browser: http://localhost:3000/settings

2. **Open Developer Tools** (F12 or Right-click → Inspect)

3. **Go to Console tab**

4. **Run this command** to add the address column:

```javascript
// URGENT: Add address column to business_settings table
(async () => {
    try {
        console.log('🚨 URGENT: Adding address column...');
        
        // Import the libSQL client
        const { createClient } = await import('@libsql/client');
        
        // Create database connection (uses environment variables from React app)
        const db = createClient({
            url: process.env.REACT_APP_TURSO_DATABASE_URL,
            authToken: process.env.REACT_APP_TURSO_AUTH_TOKEN
        });
        
        // Check if column exists
        const tableInfo = await db.execute('PRAGMA table_info(business_settings)');
        const hasAddress = tableInfo.rows.some(row => row.name === 'address');
        
        if (hasAddress) {
            console.log('✅ Address column already exists!');
            return;
        }
        
        // Add the address column
        console.log('🔧 Adding address column...');
        await db.execute(`
            ALTER TABLE business_settings 
            ADD COLUMN address TEXT DEFAULT ''
        `);
        
        console.log('✅ Address column added successfully!');
        
        // Verify it was added
        const newInfo = await db.execute('PRAGMA table_info(business_settings)');
        const addressCol = newInfo.rows.find(row => row.name === 'address');
        
        if (addressCol) {
            console.log('🎉 SUCCESS: Address column verified!');
            console.log('Column details:', addressCol);
        }
        
    } catch (error) {
        console.error('❌ Failed to add address column:', error);
    }
})();
```

## Alternative: Use the built-in function

If the above doesn't work, try this simpler approach:

```javascript
// Use the built-in urgent fix function
urgentAddAddressColumn().then(result => {
    console.log('Migration result:', result);
});
```

## Verify the Fix

After running either command, verify the address field works:

1. **Refresh the page**: http://localhost:3000/settings
2. **Click "Edit"** on Business Information section
3. **Add an address** in the address field
4. **Click "Save Changes"**
5. **Check that no errors occur** and the address is saved

## Test Database Directly

You can also test the database function directly:

```javascript
// Test the updateBusinessSettings function with address
testBusinessSettingsWithAddress().then(result => {
    console.log('Test result:', result);
});
```

---

## Technical Details

**What this does:**
- Adds `address TEXT DEFAULT ''` column to `business_settings` table
- Preserves all existing business data
- Makes the address field functional in the UI

**SQL Command:**
```sql
ALTER TABLE business_settings ADD COLUMN address TEXT DEFAULT '';
```

**Files Updated:**
- Database schema updated with address column
- UI already has address field support
- DataContext already handles address in updates

The address column should now work properly with the Business Information editing form!