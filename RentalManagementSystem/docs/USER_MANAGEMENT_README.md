# User Management Module

## Overview

The User Management module provides comprehensive CRUD operations and role management capabilities for system administrators. This module is part of the System Management section and offers full control over user accounts, roles, permissions, and user lifecycle management.

## Features

### Core Functionality
- ✅ **Create Users** - Add new users with customizable roles and settings
- ✅ **Read Users** - View user details with pagination and filtering
- ✅ **Update Users** - Modify user information and settings
- ✅ **Delete Users** - Remove users from the system
- ✅ **Assign Roles** - Manage user roles (Admin, Manager, Staff)
- ✅ **User Activation/Deactivation** - Enable or disable user accounts
- ✅ **Password Reset** - Admin can reset user passwords
- ✅ **Bulk Operations** - Perform actions on multiple users at once
- ✅ **User Statistics** - Dashboard metrics for user management
- ✅ **Audit Logging** - Track user activity and changes

## API Endpoints

All endpoints require **Admin** role authentication.

### 1. Get Users (Paginated & Filtered)

```http
GET /api/SystemManagement/users
```

**Query Parameters:**
```typescript
{
  page: number;           // Default: 1
  pageSize: number;       // Default: 10
  searchTerm?: string;    // Search in name/email
  role?: string;          // Filter by role
  isActive?: boolean;     // Filter by status
  sortBy?: string;        // FirstName, LastName, Email, CreatedAt
  sortOrder?: string;     // asc or desc (default: desc)
}
```

**Response:**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "users": [
      {
        "id": "string",
        "firstName": "string",
        "lastName": "string",
        "fullName": "string",
        "email": "string",
        "phoneNumber": "string",
        "roles": ["Admin", "Manager"],
        "isActive": true,
        "createdAt": "2026-01-09T10:00:00Z"
      }
    ],
    "totalCount": 100,
    "page": 1,
    "pageSize": 10,
    "totalPages": 10,
    "hasPrevious": false,
    "hasNext": true
  }
}
```

**Example Request:**
```bash
curl -X GET "https://api.example.com/api/SystemManagement/users?page=1&pageSize=20&searchTerm=john&isActive=true" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 2. Get User by ID

```http
GET /api/SystemManagement/users/{userId}
```

**Response:**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "id": "user-id",
    "firstName": "John",
    "lastName": "Doe",
    "fullName": "John Doe",
    "email": "john.doe@example.com",
    "phoneNumber": "+1234567890",
    "roles": ["Manager", "Staff"],
    "isActive": true,
    "createdAt": "2026-01-01T00:00:00Z"
  }
}
```

### 3. Create User

```http
POST /api/SystemManagement/users
```

**Request Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane.smith@example.com",
  "phoneNumber": "+1234567890",
  "password": "SecurePass123!",  // Optional - auto-generated if not provided
  "roles": ["Staff"],
  "isActive": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "id": "new-user-id",
    "firstName": "Jane",
    "lastName": "Smith",
    "fullName": "Jane Smith",
    "email": "jane.smith@example.com",
    "phoneNumber": "+1234567890",
    "roles": ["Staff"],
    "isActive": true,
    "createdAt": "2026-01-09T10:00:00Z"
  }
}
```

### 4. Update User

```http
PUT /api/SystemManagement/users/{userId}
```

**Request Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Johnson",
  "email": "jane.johnson@example.com",
  "phoneNumber": "+9876543210",
  "isActive": true
}
```

### 5. Delete User

```http
DELETE /api/SystemManagement/users/{userId}
```

**Response:**
```json
{
  "success": true,
  "message": "User deleted successfully",
  "data": true
}
```

**Note:** Users cannot delete their own account.

### 6. Activate/Deactivate User

```http
PATCH /api/SystemManagement/users/{userId}/activation
```

**Request Body:**
```json
{
  "isActive": false,
  "reason": "Account suspended due to policy violation"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User deactivated successfully",
  "data": true
}
```

### 7. Reset User Password

```http
POST /api/SystemManagement/users/{userId}/reset-password
```

**Request Body:**
```json
{
  "newPassword": "NewSecurePass123!",
  "confirmPassword": "NewSecurePass123!",
  "sendEmailNotification": false
}
```

### 8. Assign Roles

```http
POST /api/SystemManagement/users/{userId}/roles
```

**Request Body:**
```json
["Manager", "Staff"]
```

**Response:**
```json
{
  "success": true,
  "message": "Roles assigned successfully",
  "data": true
}
```

### 9. Remove Roles

```http
DELETE /api/SystemManagement/users/{userId}/roles
```

**Request Body:**
```json
["Staff"]
```

**Note:** Users must have at least one role.

### 10. Get Available Roles

```http
GET /api/SystemManagement/users/roles/available
```

**Response:**
```json
{
  "success": true,
  "message": "Success",
  "data": [
    {
      "id": "role-id-1",
      "name": "Admin",
      "userCount": 5
    },
    {
      "id": "role-id-2",
      "name": "Manager",
      "userCount": 12
    },
    {
      "id": "role-id-3",
      "name": "Staff",
      "userCount": 45
    }
  ]
}
```

### 11. Get User Statistics

```http
GET /api/SystemManagement/users/statistics
```

**Response:**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "totalUsers": 62,
    "activeUsers": 58,
    "inactiveUsers": 4,
    "newUsersLast30Days": 8,
    "usersByRole": {
      "Admin": 5,
      "Manager": 12,
      "Staff": 45
    }
  }
}
```

### 12. Bulk User Operations

```http
POST /api/SystemManagement/users/bulk
```

**Request Body:**
```json
{
  "userIds": ["user-id-1", "user-id-2", "user-id-3"],
  "operation": "deactivate",  // activate, deactivate, or delete
  "data": {
    "reason": "Bulk deactivation for policy compliance"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Bulk operation completed. 3 users affected.",
  "data": 3
}
```

### 13. Get User Audit Log

```http
GET /api/SystemManagement/users/{userId}/audit-log?limit=50
```

**Response:**
```json
{
  "success": true,
  "message": "Success",
  "data": [
    "User created: 2026-01-01 10:00:00",
    "Last updated: 2026-01-09 10:00:00",
    "Account status: Active"
  ]
}
```

## Role Hierarchy

The system uses three predefined roles:

1. **Admin** - Full system access, can manage all users and settings
2. **Manager** - Can manage staff users and operational data
3. **Staff** - Basic access to perform day-to-day operations

## Security Features

### Authentication & Authorization
- All user management endpoints require Admin role
- JWT token-based authentication
- Role-based access control (RBAC)

### Password Security
- Minimum 6 characters
- Must contain uppercase, lowercase, and digit
- Secure password generation for auto-created users
- Password reset with token validation

### Account Protection
- Users cannot delete their own account
- Users cannot deactivate their own account
- Audit logging for all user operations
- Account lockout after failed login attempts

## Usage Examples

### Frontend Integration (React/TypeScript)

```typescript
// UserManagementService.ts
import api from './api';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  roles: string[];
  isActive: boolean;
  createdAt: string;
}

export interface UserFilter {
  page?: number;
  pageSize?: number;
  searchTerm?: string;
  role?: string;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: string;
}

export const UserManagementService = {
  // Get users with filters
  async getUsers(filter: UserFilter) {
    const params = new URLSearchParams();
    Object.entries(filter).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });
    
    const response = await api.get(`/SystemManagement/users?${params}`);
    return response.data;
  },

  // Create user
  async createUser(userData: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber?: string;
    password?: string;
    roles: string[];
    isActive?: boolean;
  }) {
    const response = await api.post('/SystemManagement/users', userData);
    return response.data;
  },

  // Update user
  async updateUser(userId: string, userData: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phoneNumber?: string;
    isActive?: boolean;
  }) {
    const response = await api.put(`/SystemManagement/users/${userId}`, userData);
    return response.data;
  },

  // Delete user
  async deleteUser(userId: string) {
    const response = await api.delete(`/SystemManagement/users/${userId}`);
    return response.data;
  },

  // Assign roles
  async assignRoles(userId: string, roles: string[]) {
    const response = await api.post(`/SystemManagement/users/${userId}/roles`, roles);
    return response.data;
  },

  // Get statistics
  async getStatistics() {
    const response = await api.get('/SystemManagement/users/statistics');
    return response.data;
  }
};
```

### React Component Example

```tsx
// UserManagementPage.tsx
import React, { useState, useEffect } from 'react';
import { UserManagementService } from '../services/UserManagementService';

export const UserManagementPage: React.FC = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    page: 1,
    pageSize: 10,
    searchTerm: '',
    isActive: undefined
  });

  useEffect(() => {
    loadUsers();
  }, [filter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await UserManagementService.getUsers(filter);
      if (response.success) {
        setUsers(response.data.users);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (userData) => {
    try {
      const response = await UserManagementService.createUser(userData);
      if (response.success) {
        loadUsers(); // Reload users
        // Show success message
      }
    } catch (error) {
      console.error('Error creating user:', error);
    }
  };

  return (
    <div className="user-management">
      <h1>User Management</h1>
      {/* Add your UI components here */}
    </div>
  );
};
```

## Best Practices

### 1. User Creation
- Always validate email uniqueness before creation
- Use strong auto-generated passwords if not provided
- Assign appropriate roles based on user responsibilities
- Set `isActive: true` by default for immediate access

### 2. User Updates
- Validate email changes to prevent duplicates
- Log all profile changes for audit purposes
- Update `UpdatedAt` timestamp automatically

### 3. User Deletion
- Consider soft delete (deactivation) instead of hard delete
- Verify user has no active dependencies before deletion
- Archive user data for compliance purposes

### 4. Role Management
- Ensure users always have at least one role
- Validate role existence before assignment
- Consider role hierarchy when removing roles

### 5. Security
- Always use HTTPS in production
- Rotate JWT secrets regularly
- Implement rate limiting on sensitive endpoints
- Monitor for suspicious user activities

## Error Handling

Common error responses:

```json
{
  "success": false,
  "message": "Error message",
  "errors": ["Detailed error 1", "Detailed error 2"]
}
```

**Common Error Codes:**
- `400 Bad Request` - Invalid input data
- `401 Unauthorized` - Missing or invalid JWT token
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - User not found
- `409 Conflict` - Email already exists
- `500 Internal Server Error` - Server error

## Testing

### Test Scenarios

1. **Create User**
   - Valid user creation
   - Duplicate email handling
   - Auto-generated password
   - Multiple roles assignment

2. **Update User**
   - Partial updates
   - Email uniqueness validation
   - Status change

3. **Delete User**
   - Successful deletion
   - Self-deletion prevention
   - Non-existent user

4. **Role Management**
   - Assign valid roles
   - Remove roles (maintain at least one)
   - Invalid role handling

5. **Bulk Operations**
   - Multiple user activation
   - Multiple user deletion
   - Self-exclusion in bulk operations

## Database Schema

The User Management module uses ASP.NET Identity tables:

- `AspNetUsers` - User accounts
- `AspNetRoles` - System roles
- `AspNetUserRoles` - User-role relationships
- `AspNetUserLogins` - External login providers
- `AspNetUserClaims` - User claims
- `AspNetUserTokens` - Authentication tokens

## Performance Considerations

- **Pagination**: Always use pagination for large user lists
- **Indexing**: Email and Username columns are indexed
- **Caching**: Consider caching role data
- **Lazy Loading**: Load roles only when needed
- **Bulk Operations**: Process in batches for large datasets

## Future Enhancements

- [ ] Email notifications for user actions
- [ ] Two-factor authentication (2FA)
- [ ] User groups/departments
- [ ] Advanced audit logging with detailed history
- [ ] User import/export (CSV, Excel)
- [ ] Custom role creation and permission management
- [ ] User profile pictures/avatars
- [ ] Password expiration policies
- [ ] Session management

## Support

For issues or questions, please refer to:
- API Documentation: `/swagger`
- System Logs: `logs/rental-management-{date}.txt`
- GitHub Issues: [Project Repository]

## License

This module is part of the Rental Management System and follows the same license terms.
