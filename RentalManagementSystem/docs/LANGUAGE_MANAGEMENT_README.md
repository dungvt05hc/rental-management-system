# Language Management Feature

## Overview

The Language Management feature provides a comprehensive system for managing multiple languages in the Rental Management System. It includes full CRUD (Create, Read, Update, Delete) operations with a clean separation between backend and frontend, following coding standards and best practices.

## Features

### Backend Features (C# .NET)

1. **Full CRUD Operations**
   - Create new languages
   - Read all languages (active and inactive)
   - Update existing languages
   - Soft delete languages (sets IsActive to false)
   - Set default language

2. **Business Rules**
   - Cannot delete the default language
   - Only one language can be set as default at a time
   - Setting a new default automatically unsets the previous default
   - Language codes are immutable after creation

3. **API Endpoints**
   - `GET /api/localization/languages` - Get all active languages
   - `GET /api/localization/languages/all` - Get all languages including inactive (Admin only)
   - `GET /api/localization/languages/{code}` - Get language by code
   - `GET /api/localization/languages/default` - Get the default language
   - `POST /api/localization/languages` - Create a new language (Admin only)
   - `PUT /api/localization/languages/{code}` - Update a language (Admin only)
   - `DELETE /api/localization/languages/{code}` - Delete a language (Admin only)
   - `POST /api/localization/languages/{code}/set-default` - Set as default language (Admin only)

### Frontend Features (React + TypeScript)

1. **Language Management UI**
   - Responsive table view of all languages
   - Create new language modal
   - Edit language modal
   - Delete language with confirmation
   - Set default language with one click
   - Visual indicators for active/inactive and default status

2. **User Experience**
   - Loading states with spinner
   - Error handling with user-friendly messages
   - Form validation
   - Confirmation dialogs for destructive actions
   - Real-time updates after operations

## Architecture

### Backend Structure

```
RentalManagement.Api/
├── Models/
│   ├── DTOs/
│   │   └── LanguageDto.cs          # DTOs for Language operations
│   └── Entities/
│       └── Language.cs              # Language entity model
├── Services/
│   ├── Interfaces/
│   │   └── ILocalizationService.cs  # Service interface
│   └── Implementations/
│       └── LocalizationService.cs   # Service implementation
├── Controllers/
│   └── LocalizationController.cs    # API endpoints
└── Mappings/
    └── MappingProfile.cs            # AutoMapper configuration
```

### Frontend Structure

```
Frontend/src/
├── components/
│   └── admin/
│       └── LanguageManagement.tsx   # Main component
├── services/
│   └── localizationService.ts       # API service
└── types/
    └── localization.ts              # TypeScript types
```

## Data Models

### Language Entity

```csharp
public class Language
{
    public int Id { get; set; }
    public required string Code { get; set; }           // ISO 639-1 code (e.g., "en", "vi")
    public required string Name { get; set; }           // English name (e.g., "English")
    public required string NativeName { get; set; }     // Native name (e.g., "English", "Tiếng Việt")
    public bool IsDefault { get; set; }                 // Is this the default language?
    public bool IsActive { get; set; }                  // Is this language active?
    public DateTime CreatedAt { get; set; }
}
```

### DTOs

**CreateLanguageDto**
- `Code` (string, required) - Language code
- `Name` (string, required) - Language name
- `NativeName` (string, required) - Native name
- `IsDefault` (bool) - Set as default

**UpdateLanguageDto**
- `Name` (string, required) - Language name
- `NativeName` (string, required) - Native name
- `IsDefault` (bool) - Set as default
- `IsActive` (bool) - Active status

**LanguageDto** (Response)
- `Id` (int) - Language ID
- `Code` (string) - Language code
- `Name` (string) - Language name
- `NativeName` (string) - Native name
- `IsDefault` (bool) - Is default
- `IsActive` (bool) - Is active
- `CreatedAt` (DateTime) - Creation date

## Usage Examples

### Backend Usage

#### Create a Language

```csharp
var createDto = new CreateLanguageDto
{
    Code = "vi",
    Name = "Vietnamese",
    NativeName = "Tiếng Việt",
    IsDefault = false
};

var language = await localizationService.CreateLanguageAsync(createDto);
```

#### Update a Language

```csharp
var updateDto = new UpdateLanguageDto
{
    Name = "Vietnamese (Updated)",
    NativeName = "Tiếng Việt",
    IsDefault = false,
    IsActive = true
};

var language = await localizationService.UpdateLanguageAsync("vi", updateDto);
```

#### Set Default Language

```csharp
var language = await localizationService.SetDefaultLanguageAsync("en");
```

#### Delete a Language

```csharp
var success = await localizationService.DeleteLanguageAsync("fr");
```

### Frontend Usage

#### Access the Language Management Page

Navigate to `/admin/languages` in your browser after logging in as an admin.

#### Using the API Service

```typescript
import { localizationService } from './services/localizationService';

// Get all languages
const languages = await localizationService.getAllLanguages();

// Create a language
const newLanguage = await localizationService.createLanguage({
  code: 'fr',
  name: 'French',
  nativeName: 'Français',
  isDefault: false
});

// Update a language
const updated = await localizationService.updateLanguage('fr', {
  name: 'French',
  nativeName: 'Français',
  isDefault: false,
  isActive: true
});

// Delete a language
await localizationService.deleteLanguage('fr');

// Set default language
await localizationService.setDefaultLanguage('en');
```

## Coding Standards

### Backend Standards

1. **Naming Conventions**
   - PascalCase for classes, methods, and properties
   - Descriptive method names (e.g., `CreateLanguageAsync`, `UpdateLanguageAsync`)
   - Use `required` keyword for required properties

2. **Async/Await Pattern**
   - All database operations are asynchronous
   - Methods end with `Async` suffix

3. **Error Handling**
   - Use `InvalidOperationException` for business rule violations
   - Proper validation before operations
   - Clear error messages

4. **Documentation**
   - XML documentation comments for all public APIs
   - Clear parameter descriptions
   - Return type documentation

5. **Dependency Injection**
   - Constructor injection for dependencies
   - Interface-based design

### Frontend Standards

1. **Component Design**
   - Functional components with hooks
   - Single responsibility principle
   - Props interface definitions
   - Clear component documentation

2. **State Management**
   - `useState` for local state
   - Proper loading and error states
   - Optimistic updates

3. **Type Safety**
   - TypeScript interfaces for all data structures
   - Proper type annotations
   - No `any` types

4. **Error Handling**
   - Try-catch blocks for async operations
   - User-friendly error messages
   - Loading states during operations

5. **Styling**
   - Tailwind CSS utility classes
   - Responsive design
   - Consistent spacing and colors

## Testing

### Backend Testing

```csharp
[Fact]
public async Task CreateLanguageAsync_ShouldCreateLanguage()
{
    // Arrange
    var createDto = new CreateLanguageDto
    {
        Code = "es",
        Name = "Spanish",
        NativeName = "Español",
        IsDefault = false
    };

    // Act
    var result = await _localizationService.CreateLanguageAsync(createDto);

    // Assert
    Assert.NotNull(result);
    Assert.Equal("es", result.Code);
    Assert.Equal("Spanish", result.Name);
}

[Fact]
public async Task DeleteLanguageAsync_WhenLanguageIsDefault_ShouldThrowException()
{
    // Arrange
    var defaultLanguage = await _context.Languages.FirstAsync(l => l.IsDefault);

    // Act & Assert
    await Assert.ThrowsAsync<InvalidOperationException>(
        () => _localizationService.DeleteLanguageAsync(defaultLanguage.Code)
    );
}
```

### Frontend Testing

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LanguageManagement } from './LanguageManagement';

test('renders language management page', () => {
  render(<LanguageManagement />);
  expect(screen.getByText('Language Management')).toBeInTheDocument();
});

test('opens create modal when add button is clicked', () => {
  render(<LanguageManagement />);
  fireEvent.click(screen.getByText('Add New Language'));
  expect(screen.getByText('Add New Language')).toBeInTheDocument();
});
```

## Security

1. **Authorization**
   - Admin-only endpoints protected with `[Authorize(Policy = "Admin")]`
   - JWT token authentication required
   - Role-based access control

2. **Input Validation**
   - Required field validation
   - Data type validation
   - Business rule validation

3. **SQL Injection Prevention**
   - Entity Framework Core parameterized queries
   - No raw SQL queries

## Performance Considerations

1. **Database Queries**
   - Efficient filtering with LINQ
   - Proper indexing on `Code` column
   - Limited result sets

2. **Caching**
   - Consider implementing caching for frequently accessed languages
   - Cache invalidation on updates

3. **API Response**
   - Pagination for large datasets (future enhancement)
   - Minimal data transfer with DTOs

## Future Enhancements

1. **Translation Management**
   - Manage translations for each language
   - Import/export translation files
   - Translation validation

2. **Language Packs**
   - Bundle languages with translations
   - Import pre-configured language packs

3. **Audit Trail**
   - Track who created/modified languages
   - Change history

4. **Advanced Features**
   - Language fallback mechanism
   - Pluralization rules
   - Date/time format localization
   - Currency format localization

## Troubleshooting

### Common Issues

1. **Cannot delete default language**
   - Solution: Set another language as default first

2. **Duplicate language code**
   - Solution: Language codes must be unique

3. **Authorization errors**
   - Solution: Ensure user has Admin role

4. **Connection issues**
   - Solution: Check API base URL in frontend environment variables

## API Response Examples

### Success Response

```json
{
  "id": 1,
  "code": "en",
  "name": "English",
  "nativeName": "English",
  "isDefault": true,
  "isActive": true,
  "createdAt": "2026-01-06T10:00:00Z"
}
```

### Error Response

```json
{
  "message": "Cannot delete the default language. Please set another language as default first."
}
```

## Conclusion

The Language Management feature provides a robust, scalable solution for managing multiple languages in the Rental Management System. It follows best practices, coding standards, and provides a great user experience for administrators managing the system's internationalization.
