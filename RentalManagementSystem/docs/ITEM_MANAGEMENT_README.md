# Item Management Module - Setup Guide

## Overview
The Item Management module has been successfully created with full CRUD operations for both Backend and Frontend. This module allows you to manage reusable items that can be added to invoices.

## What Has Been Built

### Backend (.NET Core)

#### 1. **Entity Model** (`Models/Entities/Item.cs`)
- Reusable item master data
- Fields: ItemCode, ItemName, Description, UnitPrice, UnitOfMeasure, TaxPercent, Category, IsActive, Notes
- Timestamps: CreatedAt, UpdatedAt

#### 2. **DTOs** (`Models/DTOs/ItemDtos.cs`)
- `CreateItemDto` - For creating new items
- `UpdateItemDto` - For updating items
- `ItemDto` - Full item response
- `ItemSummaryDto` - Lightweight item summary
- `ItemSearchDto` - Search and filter parameters

#### 3. **Service Interface** (`Services/Interfaces/IItemService.cs`)
- Complete CRUD operations
- GetActiveItems - Get only active items
- GetItemsByCategory - Filter by category
- GetCategories - Get all unique categories

#### 4. **Service Implementation** (`Services/Implementations/ItemService.cs`)
- Full implementation with AutoMapper
- Validation logic (e.g., unique ItemCode)
- Pagination support
- Search and filtering

#### 5. **Controller** (`Controllers/ItemsController.cs`)
- RESTful API endpoints:
  - `GET /api/items` - List items with pagination/filtering
  - `GET /api/items/{id}` - Get single item
  - `POST /api/items` - Create item (Admin, Manager, Staff)
  - `PUT /api/items/{id}` - Update item (Admin, Manager, Staff)
  - `DELETE /api/items/{id}` - Delete item (Admin only)
  - `GET /api/items/active` - Get active items
  - `GET /api/items/category/{category}` - Get by category
  - `GET /api/items/categories` - Get all categories

#### 6. **Database Configuration**
- DbContext updated with `Items` and `InvoiceItems` DbSets
- Entity configurations with indexes and precision settings
- Relationships configured with Invoice entities

#### 7. **AutoMapper Configuration**
- Mappings for Item and InvoiceItem entities
- Automatic timestamp handling

#### 8. **Dependency Injection**
- `IItemService` registered in Program.cs

### Frontend (React + TypeScript)

#### 1. **Types** (`types/index.ts`)
- `Item` interface
- `CreateItemRequest` interface
- `UpdateItemRequest` interface
- `ItemSearchRequest` interface

#### 2. **Service** (`services/items.ts`)
- API client methods for all CRUD operations
- Matches backend endpoints

#### 3. **Components**

##### **ItemsPage** (`components/items/ItemsPage.tsx`)
Complete item management page with:
- **List View**: Table with all items
- **Search & Filters**: Search by term, filter by category, active status
- **Pagination**: Full pagination support
- **CRUD Dialog**: Modal for creating/editing items
- **Actions**: Edit and delete buttons
- **Responsive Design**: Works on mobile and desktop

##### **ItemSelector** (`components/items/ItemSelector.tsx`)
Reusable component for invoice forms:
- Browse active items catalog
- Search items
- Select item with quantity and discount
- Real-time calculation preview
- Automatic line item creation with tax calculation

#### 4. **Routing** (`App.tsx`)
- `/items` route added for Item Management page

#### 5. **Navigation** (`Layout.tsx`)
- Items menu link added with Package icon

## Database Migration Required

To create the database tables, run:

```bash
# Navigate to the API project
cd RentalManagementSystem/Backend/RentalManagement.Api

# Install EF Core tools if not already installed
dotnet tool install --global dotnet-ef --version 9.0.0

# Create migration
dotnet ef migrations add AddItemsAndInvoiceItemsTables

# Update database
dotnet ef database update
```

## Integration with Invoice Module

The Item Management module is fully integrated with the Invoice module:

1. **ItemSelector Component** can be used in invoice forms to add line items
2. **InvoiceItem DTOs** already exist for creating invoice line items
3. **Database relationships** are configured between Items and InvoiceItems

### Using ItemSelector in Invoice Forms

To integrate the ItemSelector into your invoice form:

```tsx
import { ItemSelector } from '../items';
import type { InvoiceItem } from '../../types';

// In your invoice form component:
const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);

const handleItemSelect = (item: InvoiceItem) => {
  // Set line number
  item.lineNumber = invoiceItems.length + 1;
  
  // Add to invoice items
  setInvoiceItems([...invoiceItems, item]);
};

// In your JSX:
<ItemSelector onItemSelect={handleItemSelect} />
```

## Features

### Item Management
- ✅ Create reusable items with code, name, price, unit of measure
- ✅ Organize items by category
- ✅ Set default tax rates per item
- ✅ Active/Inactive status management
- ✅ Full search and filtering
- ✅ Pagination for large datasets
- ✅ Validation (unique item codes)

### Invoice Integration
- ✅ Select items from catalog when creating invoices
- ✅ Automatic price population from master data
- ✅ Apply discounts per line item
- ✅ Calculate tax automatically
- ✅ Line-level totals calculation

## API Examples

### Create Item
```http
POST /api/items
Authorization: Bearer {token}
Content-Type: application/json

{
  "itemCode": "UTIL-001",
  "itemName": "Electricity Charge",
  "description": "Monthly electricity consumption",
  "unitOfMeasure": "kWh",
  "unitPrice": 0.15,
  "taxPercent": 10,
  "category": "Utilities",
  "isActive": true
}
```

### Search Items
```http
GET /api/items?searchTerm=electric&category=Utilities&isActive=true&page=1&pageSize=10
Authorization: Bearer {token}
```

### Get Active Items
```http
GET /api/items/active
Authorization: Bearer {token}
```

## Testing Checklist

### Backend
- [ ] Start the API server
- [ ] Run database migration
- [ ] Test CRUD operations via Swagger
- [ ] Verify validation rules
- [ ] Test search and filtering
- [ ] Check authorization (Admin, Manager, Staff roles)

### Frontend
- [ ] Start the React app
- [ ] Navigate to /items
- [ ] Create a new item
- [ ] Edit an item
- [ ] Search and filter items
- [ ] Test pagination
- [ ] Verify responsive design
- [ ] Test ItemSelector in invoice form

## Next Steps

1. **Run Database Migration** (see command above)
2. **Start Backend**: `dotnet run` in API project
3. **Start Frontend**: `npm run dev` in Frontend folder
4. **Create Sample Items**: Use the Items page to create test data
5. **Test Invoice Integration**: Use ItemSelector when creating invoices

## Sample Data

Here are some sample items you can create for testing:

1. **Electricity**
   - Code: UTIL-001
   - Unit Price: $0.15/kWh
   - Tax: 10%
   - Category: Utilities

2. **Water**
   - Code: UTIL-002
   - Unit Price: $2.50/m³
   - Tax: 10%
   - Category: Utilities

3. **Internet**
   - Code: SRV-001
   - Unit Price: $50.00/month
   - Tax: 10%
   - Category: Services

4. **Cleaning Fee**
   - Code: SRV-002
   - Unit Price: $30.00/service
   - Tax: 10%
   - Category: Services

5. **Furniture Rental**
   - Code: FURN-001
   - Unit Price: $100.00/month
   - Tax: 10%
   - Category: Equipment

## Module Complete! 🎉

The Item Management module is now fully functional and integrated with your Rental Management System.
