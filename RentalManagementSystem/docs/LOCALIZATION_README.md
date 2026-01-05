# Localization System

## Overview

This rental management system now includes a comprehensive localization system supporting **Vietnamese (Tiếng Việt)** and **English** languages.

## Backend Implementation

### Features

- **Language Management**: Create and manage multiple languages
- **Translation Management**: Store translations with categories for organization
- **REST API**: Full CRUD operations for languages and translations
- **Auto-seeding**: Automatically seeds English and Vietnamese translations on startup
- **Categorization**: Translations organized by categories (common, auth, rooms, tenants, invoices, dashboard)

### API Endpoints

#### Languages

- `GET /api/localization/languages` - Get all active languages
- `GET /api/localization/languages/{code}` - Get language by code
- `GET /api/localization/languages/default` - Get default language
- `POST /api/localization/languages` - Create new language (Admin only)

#### Translations

- `GET /api/localization/translations/{languageCode}` - Get all translations for a language
- `GET /api/localization/translations/{languageCode}/resources` - Get translations grouped by category
- `GET /api/localization/translations/{languageCode}/{key}` - Get specific translation
- `PUT /api/localization/translations/{languageCode}` - Upsert translation (Manager+)
- `POST /api/localization/translations/bulk` - Bulk upsert translations (Manager+)
- `DELETE /api/localization/translations/{languageCode}/{key}` - Delete translation (Admin only)
- `POST /api/localization/seed` - Seed default translations (Admin only)

### Database Schema

**Languages Table**:
- `Id` - Primary key
- `Code` - Language code (e.g., "en", "vi")
- `Name` - English name
- `NativeName` - Native language name
- `IsDefault` - Default language flag
- `IsActive` - Active status
- `CreatedAt` - Creation timestamp

**Translations Table**:
- `Id` - Primary key
- `Key` - Translation key (e.g., "common.save")
- `Value` - Translated text
- `LanguageId` - Foreign key to Languages
- `Category` - Organization category
- `Description` - Optional context
- `CreatedAt` / `UpdatedAt` - Timestamps

### Default Translations

The system includes comprehensive translations for:

- **Common**: save, cancel, delete, edit, add, search, filter, etc.
- **Authentication**: login, logout, register, username, password, email
- **Rooms**: title, roomNumber, roomType, status, price, available, occupied
- **Tenants**: title, name, phone, idCard
- **Invoices**: title, invoiceNumber, amount, dueDate, paid, unpaid
- **Dashboard**: title, totalRooms, occupiedRooms, revenue

## Frontend Implementation

### Features

- **React Context API**: Centralized language state management
- **TypeScript Support**: Full type safety
- **localStorage Persistence**: Remembers user language preference
- **Language Switcher Components**: Desktop and mobile-friendly UI
- **Translation Hook**: Simple `useTranslation()` hook
- **Automatic Fallbacks**: Falls back to key if translation missing

### Project Structure

```
src/
├── types/
│   └── localization.ts          # TypeScript interfaces
├── services/
│   └── localizationService.ts   # API communication
├── contexts/
│   └── LocalizationContext.tsx  # Language state management
├── hooks/
│   └── useTranslation.ts        # Translation hook
├── components/
│   └── LanguageSwitcher.tsx     # UI components
└── App.tsx                       # Main app with provider
```

### Usage Examples

#### 1. Basic Translation

```tsx
import { useTranslation } from './hooks/useTranslation';

function MyComponent() {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('dashboard.title')}</h1>
      <button>{t('common.save')}</button>
    </div>
  );
}
```

#### 2. Translation with Fallback

```tsx
const { t } = useTranslation();

// If key doesn't exist, shows "Dashboard"
<h1>{t('dashboard.title', 'Dashboard')}</h1>
```

#### 3. Language Switching

```tsx
import { LanguageSwitcher } from './components/LanguageSwitcher';

function Header() {
  return (
    <header>
      <LanguageSwitcher />
    </header>
  );
}
```

#### 4. Programmatic Language Change

```tsx
const { changeLanguage, currentLanguage } = useTranslation();

const switchToVietnamese = async () => {
  await changeLanguage('vi');
};
```

### Components

#### LanguageSwitcher (Desktop)
- Dropdown select with native names
- Shows current language
- Accessible with ARIA labels

#### LanguageSwitcherCompact (Mobile)
- Button-based switcher
- Perfect for mobile navigation
- Visual active state

## Setup Instructions

### Backend Setup

1. **Database Migration** (if not already done):
```bash
cd RentalManagementSystem/Backend/RentalManagement.Api
dotnet ef migrations add AddLocalization
dotnet ef database update
```

2. **Run the API**:
```bash
dotnet run
```

3. **Seed Default Translations** (optional, auto-seeds on startup):
```bash
# Make a POST request to:
POST /api/localization/seed
# With admin authentication
```

### Frontend Setup

1. **Environment Configuration**:
```bash
cd RentalManagementSystem/Frontend
cp .env.example .env
# Edit .env and set VITE_API_BASE_URL if needed
```

2. **Install Dependencies** (if not already done):
```bash
npm install
```

3. **Run Development Server**:
```bash
npm run dev
```

## Testing

### Test Backend API

```bash
# Get languages
curl http://localhost:5000/api/localization/languages

# Get English translations
curl http://localhost:5000/api/localization/translations/en/resources

# Get Vietnamese translations
curl http://localhost:5000/api/localization/translations/vi/resources

# Get specific translation
curl http://localhost:5000/api/localization/translations/en/common.save
```

### Test Frontend

1. Open the application in browser
2. Look for language switcher in header
3. Switch between English and Vietnamese
4. Verify all UI text changes language
5. Refresh page - should remember language preference

## Adding New Translations

### Via API (Recommended for Managers/Admins)

```bash
# Add single translation
curl -X PUT http://localhost:5000/api/localization/translations/en \
  -H "Content-Type: application/json" \
  -d '{
    "key": "mymodule.mykey",
    "value": "My English Text",
    "category": "mymodule"
  }'

# Bulk add translations
curl -X POST http://localhost:5000/api/localization/translations/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "languageCode": "en",
    "translations": {
      "mymodule.key1": "Text 1",
      "mymodule.key2": "Text 2"
    }
  }'
```

### Via Code (For Initial Setup)

Edit `LocalizationService.cs` methods:
- `GetEnglishTranslations()` - Add English translations
- `GetVietnameseTranslations()` - Add Vietnamese translations

Then restart the application or call the seed endpoint.

## Best Practices

1. **Naming Convention**: Use dot notation for keys (e.g., `category.item`)
2. **Categories**: Group related translations in categories
3. **Fallbacks**: Always provide fallback text for missing translations
4. **Context**: Add descriptions for complex translations
5. **Consistency**: Keep translation keys consistent across languages

## Adding a New Language

### Backend

```csharp
POST /api/localization/languages
{
  "code": "fr",
  "name": "French",
  "nativeName": "Français",
  "isDefault": false
}
```

Then add translations for all existing keys.

### No Frontend Changes Needed!

The frontend automatically detects and supports new languages once they're added via the API.

## Troubleshooting

### Translations Not Loading

1. Check API is running: `http://localhost:5000/swagger`
2. Verify VITE_API_BASE_URL in Frontend/.env
3. Check browser console for errors
4. Verify database has Languages and Translations tables

### Language Not Persisting

1. Check browser localStorage
2. Verify `preferred_language` key exists
3. Clear localStorage and try again

### Missing Translations

1. Shows the key itself if translation missing
2. Check API endpoint: `/api/localization/translations/{languageCode}/resources`
3. Add missing translations via API

## Future Enhancements

- [ ] Translation management UI (Admin panel)
- [ ] Import/Export translations (JSON/CSV)
- [ ] Translation interpolation (variables in translations)
- [ ] Pluralization support
- [ ] RTL language support
- [ ] Translation caching optimization
- [ ] Offline translation fallback
- [ ] Translation versioning

## License

Part of the Rental Management System project.
