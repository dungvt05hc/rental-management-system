# System Management Module

## Overview

The System Management module provides administrators with comprehensive control over the Rental Management System, including:

- **System Information**: View system statistics, version, and database status
- **System Settings**: Configure application settings organized by category
- **Language Management**: Integration with the existing localization system

## Features

### 1. System Information Dashboard

Displays real-time system statistics:
- Application version and environment
- Total users, rooms, tenants (active/total)
- Server time and default language
- Database connection status and provider information

### 2. System Settings Management

#### Categories:
- **General**: Application name, timezone, date format, currency
- **Notification**: Email/SMS settings, invoice reminder configuration
- **Payment**: Late fee settings, grace period configuration
- **Display**: Pagination, theme preferences
- **Security**: Session timeout, password expiry settings

#### Features:
- View settings grouped by category
- Bulk update multiple settings at once
- Create custom settings with different data types (string, number, boolean, JSON)
- Delete editable settings
- Seed default settings
- Export/import settings as JSON

### 3. Access Control

All System Management endpoints are **Admin-only** (`[Authorize(Roles = "Admin")]`)

## Backend Architecture

### Entities

**SystemSetting.cs**
- `Id`: Unique identifier
- `Key`: Unique setting key (e.g., "system.currency")
- `Value`: Setting value (stored as string)
- `Category`: Grouping category
- `DataType`: Type hint (string, number, boolean, json)
- `Description`: Human-readable description
- `IsEditable`: Whether users can modify
- `IsVisible`: Whether users can see
- `CreatedAt`, `UpdatedAt`, `ModifiedBy`: Audit fields

### API Endpoints

**SystemManagementController** (`/api/SystemManagement`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/info` | Get system information and statistics |
| GET | `/settings` | Get all visible settings |
| GET | `/settings/by-category` | Get settings grouped by category |
| GET | `/settings/{key}` | Get specific setting by key |
| GET | `/settings/category/{category}` | Get settings for a category |
| POST | `/settings` | Create new setting |
| PUT | `/settings/{key}` | Update setting |
| PUT | `/settings/bulk` | Bulk update multiple settings |
| DELETE | `/settings/{key}` | Delete setting |
| POST | `/settings/seed` | Seed default settings |
| GET | `/settings/export` | Export settings as JSON file |
| POST | `/settings/import` | Import settings from JSON |

### Service Layer

**SystemManagementService** implements:
- CRUD operations for settings
- Bulk operations for efficient updates
- Settings grouping by category
- System statistics aggregation
- Import/export functionality
- Default settings seeding

## Frontend Components

### Main Components

1. **SystemManagement.tsx**: Main container with tab navigation
2. **SystemInfoTab.tsx**: Dashboard displaying system statistics
3. **SystemSettingsTab.tsx**: Settings editor with category accordions
4. **LanguageManagementTab.tsx**: Reference to existing localization features

### API Service

**systemManagementApi.ts**: TypeScript service for all API calls

## Usage

### Accessing System Management

1. Login as Admin user
2. Navigate to System Management section
3. Use tabs to switch between:
   - System Info: View-only dashboard
   - Settings: Edit system configuration
   - Languages: Link to localization features

### Managing Settings

#### View Settings
```typescript
const settings = await systemManagementApi.getSettingsByCategory();
```

#### Update Single Setting
```typescript
await systemManagementApi.updateSetting('system.currency', {
  value: 'EUR',
  description: 'Euro currency'
});
```

#### Bulk Update
```typescript
await systemManagementApi.bulkUpdateSettings({
  settings: [
    { key: 'system.currency', value: 'EUR' },
    { key: 'system.currencySymbol', value: '€' },
    { key: 'display.itemsPerPage', value: '20' }
  ]
});
```

#### Create Custom Setting
```typescript
await systemManagementApi.createSetting({
  key: 'custom.feature.enabled',
  value: 'true',
  category: 'Features',
  dataType: 'boolean',
  description: 'Enable custom feature'
});
```

### Seeding Default Settings

Run once to populate default settings:

```bash
POST /api/SystemManagement/settings/seed
```

Or use the UI "Seed Defaults" button.

## Database Migration

The SystemSettings table has been added via Entity Framework migration:

```bash
cd RentalManagementSystem/Backend/RentalManagement.Api
dotnet ef migrations add AddSystemSettingsTable
dotnet ef database update
```

## Default Settings

The system includes these default categories and settings:

### General Settings
- `system.name`: Application name
- `system.timezone`: Default timezone (UTC)
- `system.dateFormat`: Date display format
- `system.currency`: Currency code (USD)
- `system.currencySymbol`: Currency symbol ($)

### Notification Settings
- `notification.emailEnabled`: Enable email notifications
- `notification.smsEnabled`: Enable SMS notifications
- `notification.invoiceReminderDays`: Days before due date for reminders

### Payment Settings
- `payment.lateFeeEnabled`: Enable late fees
- `payment.lateFeePercentage`: Late fee percentage
- `payment.gracePeriodDays`: Grace period before late fees

### Display Settings
- `display.itemsPerPage`: Pagination size
- `display.theme`: UI theme (light/dark)

### Security Settings
- `security.sessionTimeout`: Session timeout in minutes
- `security.passwordExpiryDays`: Password expiry period

## Security Considerations

1. **Admin-Only Access**: All endpoints require Admin role
2. **Audit Trail**: All changes tracked with `ModifiedBy` field
3. **Validation**: Settings marked as `IsEditable=false` cannot be modified
4. **Data Types**: Type hints help prevent invalid values

## Integration with Existing Features

The System Management module integrates with:

- **Localization**: Reference to existing language management
- **Authentication**: Uses existing JWT authentication and role-based authorization
- **Database**: Uses existing RentalManagementContext
- **Logging**: Leverages Serilog for audit logging

## Best Practices

1. **Backup Before Import**: Export current settings before importing
2. **Test in Development**: Verify setting changes in dev environment
3. **Use Bulk Updates**: More efficient for multiple changes
4. **Document Custom Settings**: Add clear descriptions for new settings
5. **Type Safety**: Use appropriate `DataType` for validation

## Troubleshooting

### Settings Not Loading
- Check Admin role assignment
- Verify JWT token is valid
- Check API endpoint connectivity

### Cannot Update Setting
- Verify setting has `IsEditable=true`
- Check you're logged in as Admin
- Review browser console for errors

### Export/Import Issues
- Ensure JSON is valid
- Check file permissions
- Verify data types match

## Future Enhancements

Potential improvements:
- Setting validation rules
- Setting change history/rollback
- Settings search and filtering
- Real-time settings updates via SignalR
- Setting templates and presets
- Advanced language management UI
