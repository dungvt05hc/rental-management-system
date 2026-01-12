// API Response Types
export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  errors?: string[];
  success: boolean;
}

// Authentication Types
export interface User {
  id: string;
  userName?: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  phoneNumber?: string;
  roles: string[] | IList<string>; // Changed from role to roles (array)
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export type IList<T> = T[];

export enum UserRole {
  Admin = 'Admin',
  Manager = 'Manager',
  Staff = 'Staff'
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
  expiresAt: string;
}

export interface RegisterRequest {
  userName: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

// Room Types
export interface Room {
  id: string;
  roomNumber: string;
  description?: string;
  monthlyRent: number;
  status: RoomStatus;
  type: RoomType;
  typeName?: string;
  statusName?: string;
  floor: number;
  area?: number;
  hasAirConditioning: boolean;
  hasPrivateBathroom: boolean;
  isFurnished: boolean;
  createdAt: string;
  updatedAt: string;
  tenant?: Tenant;
  currentTenant?: Tenant;
}

export enum RoomStatus {
  Vacant = 1,
  Rented = 2,
  Maintenance = 3,
  Reserved = 4
}

export enum RoomType {
  Single = 1,
  Double = 2,
  Triple = 3,
  Suite = 4,
  Studio = 5,
  Apartment = 6
}

export interface CreateRoomRequest {
  roomNumber: string;
  type: RoomType;
  monthlyRent: number;
  floor: number;
  area?: number;
  description?: string;
  hasAirConditioning: boolean;
  hasPrivateBathroom: boolean;
  isFurnished: boolean;
}

export interface UpdateRoomRequest extends Partial<CreateRoomRequest> {
  status: RoomStatus;
}

export interface RoomSearchRequest {
  search?: string;
  searchTerm?: string;
  status?: RoomStatus;
  type?: RoomType;
  minRent?: number;
  maxRent?: number;
  floor?: number;
  hasAirConditioning?: boolean;
  hasPrivateBathroom?: boolean;
  isFurnished?: boolean;
  page?: number;
  pageSize?: number;
}

// Tenant Types
export interface Tenant {
  id: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  email: string;
  phoneNumber: string;
  dateOfBirth?: string;
  age?: number;
  identityNumber?: string;
  identificationNumber?: string;
  address?: string;
  emergencyContact?: string;
  emergencyContactName?: string;
  emergencyPhone?: string;
  emergencyContactPhone?: string;
  checkInDate?: string;
  checkOutDate?: string;
  contractStartDate?: string;
  contractEndDate?: string;
  securityDeposit: number;
  monthlyRent?: number;
  status: TenantStatus;
  isActive?: boolean;
  hasActiveContract?: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  room?: {
    id: string;
    roomNumber: string;
    typeName?: string;
    monthlyRent: number;
    floor: number;
  };
}

export enum TenantStatus {
  Active = 'Active',
  Inactive = 'Inactive',
  Terminated = 'Terminated'
}

export interface CreateTenantRequest {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth?: string;
  identificationNumber?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  securityDeposit: number;
  monthlyRent: number;
  notes?: string;
}

export interface UpdateTenantRequest extends Partial<CreateTenantRequest> {
  isActive?: boolean;
}

export interface AssignRoomRequest {
  roomId: number;
  contractStartDate: string;
  contractEndDate: string;
  monthlyRent: number;
}

export interface TenantSearchRequest {
  search?: string;
  searchTerm?: string;
  status?: TenantStatus;
  roomId?: string;
  hasRoom?: boolean;
  isActive?: boolean;
  hasActiveContract?: boolean;
  page?: number;
  pageSize?: number;
}

// Invoice Types
export interface Invoice {
  id: string;
  tenantId: string;
  roomId: string;
  invoiceNumber: string;
  amount: number;
  totalAmount?: number;
  paidAmount?: number;
  remainingBalance?: number;
  monthlyRent?: number;
  additionalCharges?: number;
  discount?: number;
  dueDate: string;
  issuedDate?: string;
  issueDate?: string;
  billingPeriod?: string;
  paidDate?: string;
  status: InvoiceStatus;
  statusName?: string;
  description?: string;
  additionalChargesDescription?: string;
  notes?: string;
  isOverdue?: boolean;
  isPartiallyPaid?: boolean;
  createdAt: string;
  updatedAt: string;
  tenant?: Tenant;
  room?: Room;
  payments?: Payment[];
  invoiceItems?: InvoiceItem[];
}

export enum InvoiceStatus {
  Draft = 1,
  Issued = 2,
  Unpaid = 3,
  PartiallyPaid = 4,
  Paid = 5,
  Overdue = 6,
  Cancelled = 7
}

export interface CreateInvoiceRequest {
  tenantId: number;
  roomId: number;
  billingPeriod: string;
  additionalCharges?: number;
  discount?: number;
  dueDate: string;
  additionalChargesDescription?: string;
  notes?: string;
  invoiceItems?: CreateInvoiceItemRequest[];
}

export interface UpdateInvoiceRequest {
  additionalCharges?: number;
  discount?: number;
  status?: InvoiceStatus | string;
  dueDate?: string;
  additionalChargesDescription?: string;
  notes?: string;
}

export interface InvoiceSearchRequest {
  search?: string;
  searchTerm?: string;
  status?: InvoiceStatus;
  tenantId?: string;
  roomId?: string;
  billingPeriod?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  isOverdue?: boolean;
  page?: number;
  pageSize?: number;
}

export interface InvoiceItem {
  id?: string;
  invoiceId?: string;
  itemCode: string;
  itemName: string;
  description?: string;
  quantity: number;
  unitOfMeasure: string;
  unitPrice: number;
  discountPercent: number;
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
  lineTotal: number;
  lineTotalWithTax: number;
  lineNumber: number;
  category?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateInvoiceItemRequest {
  itemCode: string;
  itemName: string;
  description?: string;
  quantity: number;
  unitOfMeasure: string;
  unitPrice: number;
  discountPercent?: number;
  discountAmount?: number;
  taxPercent?: number;
  lineNumber: number;
  category?: string;
  notes?: string;
}

// Item Types
export interface Item {
  id: string;
  itemCode: string;
  itemName: string;
  description?: string;
  unitOfMeasure: string;
  unitPrice: number;
  taxPercent: number;
  category?: string;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateItemRequest {
  itemCode: string;
  itemName: string;
  description?: string;
  unitOfMeasure: string;
  unitPrice: number;
  taxPercent?: number;
  category?: string;
  isActive?: boolean;
  notes?: string;
}

export interface UpdateItemRequest {
  itemCode?: string;
  itemName?: string;
  description?: string;
  unitOfMeasure?: string;
  unitPrice?: number;
  taxPercent?: number;
  category?: string;
  isActive?: boolean;
  notes?: string;
}

export interface ItemSearchRequest {
  searchTerm?: string;
  category?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDirection?: string;
}

// Payment Types
export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  reference?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  invoice?: Invoice;
}

export enum PaymentMethod {
  Cash = 'Cash',
  BankTransfer = 'BankTransfer',
  Check = 'Check',
  CreditCard = 'CreditCard'
}

export interface CreatePaymentRequest {
  invoiceId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  reference?: string;
  notes?: string;
}

export interface UpdatePaymentRequest extends Partial<CreatePaymentRequest> {}

export interface PaymentSearchRequest {
  search?: string;
  invoiceId?: string;
  paymentMethod?: PaymentMethod;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

// Report Types
export interface OccupancyReport {
  totalRooms: number;
  occupiedRooms: number;
  availableRooms: number;
  maintenanceRooms: number;
  occupancyRate: number;
}

export interface RevenueReport {
  totalRevenue: number;
  paidAmount: number;
  pendingAmount: number;
  overdueAmount: number;
  collectionRate: number;
}

export interface MonthlyReport {
  year: number;
  month: number;
  totalRooms: number;
  occupiedRooms: number;
  totalRevenue: number;
  collectedRevenue: number;
  pendingRevenue: number;
  overdueRevenue: number;
  newTenants: number;
  departedTenants: number;
}

export interface PaginatedResult<T> {
  data: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

// Form Types
export interface FormError {
  field: string;
  message: string;
}

// Auth Context Types
export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// User Management Types
export interface CreateUserDto {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  password?: string;
  roles: string[];
  isActive: boolean;
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  isActive?: boolean;
}

export interface UserFilterDto {
  page?: number;
  pageSize?: number;
  searchTerm?: string;
  role?: string;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: string;
}

export interface PaginatedUsersDto {
  users: User[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

export interface UserActivationDto {
  isActive: boolean;
  reason?: string;
}

export interface ResetUserPasswordDto {
  newPassword: string;
  confirmPassword: string;
  sendEmailNotification?: boolean;
}

export interface RoleDto {
  id: string;
  name: string;
  userCount: number;
}

export interface UserStatisticsDto {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  newUsersLast30Days: number;
  usersByRole: Record<string, number>;
}

export interface BulkUserOperationDto {
  userIds: string[];
  operation: 'activate' | 'deactivate' | 'delete';
  data?: Record<string, any>;
}
