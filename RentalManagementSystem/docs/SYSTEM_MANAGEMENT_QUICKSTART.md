# System Management - Quick Start Guide

## ✅ What Has Been Implemented

### Backend (C# / .NET)

1. **Database Entity** - `SystemSetting.cs`
   - Stores configurable system settings with categories and metadata
   - Database migration successfully applied

2. **DTOs** - `SystemSettingDto.cs`
   - Data transfer objects for API communication
   - Includes create, update, and bulk operation DTOs

3. **Service Layer**
   - `ISystemManagementService` - Interface
   - `SystemManagementService` - Implementation with full CRUD operations

4. **Controller** - `SystemManagementController.cs`
   - 12 Admin-only API endpoints
   - System info, settings CRUD, bulk operations, import/export

5. **Database Configuration**
   - Added SystemSettings DbSet to RentalManagementContext
   - Configured indexes and constraints
   - Migration created and applied

6. **Dependency Injection**
   - Service registered in Program.cs
   - AutoMapper profiles added

### Frontend (React / TypeScript)

1. **API Service** - `systemManagementApi.ts`
   - TypeScript interfaces for all data types
   - Complete API client with all endpoints

2. **Components**
   - `SystemManagement.tsx` - Main container with tab navigation
   - `SystemInfoTab.tsx` - Dashboard showing system statistics
   - `SystemSettingsTab.tsx` - Full-featured settings editor
   - `LanguageManagementTab.tsx` - Reference to localization features

## 🚀 How to Use

### Step 1: Start the Backend

```bash
cd /Users/dungvt/Projects/rental-management-system/RentalManagementSystem/Backend/RentalManagement.Api
dotnet run
```

### Step 2: Seed Default Settings (First Time Only)

Use Swagger UI or API client:
```
POST http://localhost:5000/api/SystemManagement/settings/seed
Authorization: Bearer {admin-jwt-token}
```

Or use the "Seed Defaults" button in the UI after logging in.

### Step 3: Access via Frontend

1. Login as Admin user (admin@rentalmanagement.com / Admin123!)
2. Navigate to the System Management page
3. Explore the three tabs:
   - **System Info**: View statistics and status
   - **Settings**: Manage configuration
   - **Languages**: Link to localization

## 📋 Default Settings Categories

- **General**: Application name, timezone, date format, currency
- **Notification**: Email/SMS settings, reminder configuration
- **Payment**: Late fees, grace periods
- **Display**: Pagination, theme
- **Security**: Session timeout, password expiry

## 🔧 Common Tasks

### Update Multiple Settings at Once

1. Go to Settings tab
2. Modify values in the form fields
3. Click "Save Changes (X)" button
4. All modified settings are updated in bulk

### Create Custom Setting

1. Click "Create Setting" button
2. Fill in the form:
   - Key: e.g., "feature.newFeature.enabled"
   - Value: "true"
   - Category: "Features"
   - Data Type: boolean
   - Description: Optional explanation
3. Click "Create"

### Export Settings Backup

1. Click "Export" button
2. JSON file downloads automatically
3. Save for backup or migration

### View System Statistics

1. Go to System Info tab
2. View real-time data:
   - User/room/tenant counts
   - Server time
   - Database status
   - Environment info

## 🔐 Security Notes

- **All endpoints require Admin role**
- Only editable settings can be modified
- All changes are logged with user ID
- Timestamps tracked automatically

## 📝 API Endpoints Reference

```
GET    /api/SystemManagement/info
GET    /api/SystemManagement/settings
GET    /api/SystemManagement/settings/by-category
GET    /api/SystemManagement/settings/{key}
GET    /api/SystemManagement/settings/category/{category}
POST   /api/SystemManagement/settings
PUT    /api/SystemManagement/settings/{key}
PUT    /api/SystemManagement/settings/bulk
DELETE /api/SystemManagement/settings/{key}
POST   /api/SystemManagement/settings/seed
GET    /api/SystemManagement/settings/export
POST   /api/SystemManagement/settings/import
```

## 🎯 Next Steps

1. **Test the API**: Use Swagger UI at `http://localhost:5000/swagger`
2. **Integrate Frontend**: Add SystemManagement component to your routing
3. **Customize Settings**: Add your own categories and settings as needed
4. **Language Management**: Enhance the Language tab with full UI (currently links to existing localization)

## 📚 Additional Documentation

See `SYSTEM_MANAGEMENT_README.md` for comprehensive documentation including:
- Detailed architecture
- Complete API reference
- Integration guidelines
- Security best practices
- Troubleshooting guide

## ✨ Features Highlights

✅ Admin-only access control  
✅ Organized by categories with accordions  
✅ Bulk update for efficiency  
✅ Multiple data types (string, number, boolean, JSON)  
✅ Export/import for backups  
✅ System statistics dashboard  
✅ Real-time validation  
✅ Audit trail with timestamps  
✅ Material-UI responsive design  
✅ TypeScript type safety  
✅ Full CRUD operations  
✅ Seed default settings  

Enjoy your new System Management module! 🎉
