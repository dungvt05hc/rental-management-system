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
  userName: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

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
  createdAt: string;
  updatedAt: string;
  tenant?: Tenant;
}

export enum RoomStatus {
  Available = 'Available',
  Occupied = 'Occupied',
  Maintenance = 'Maintenance'
}

export interface CreateRoomRequest {
  roomNumber: string;
  description?: string;
  monthlyRent: number;
  status: RoomStatus;
}

export interface UpdateRoomRequest extends Partial<CreateRoomRequest> {}

export interface RoomSearchRequest {
  search?: string;
  status?: RoomStatus;
  minRent?: number;
  maxRent?: number;
  page?: number;
  pageSize?: number;
}

// Tenant Types
export interface Tenant {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  identityNumber: string;
  address: string;
  emergencyContact: string;
  emergencyPhone: string;
  roomId?: string;
  checkInDate?: string;
  checkOutDate?: string;
  securityDeposit: number;
  status: TenantStatus;
  createdAt: string;
  updatedAt: string;
  room?: Room;
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
  identityNumber: string;
  address: string;
  emergencyContact: string;
  emergencyPhone: string;
  roomId?: string;
  checkInDate?: string;
  checkOutDate?: string;
  securityDeposit: number;
  status: TenantStatus;
}

export interface UpdateTenantRequest extends Partial<CreateTenantRequest> {}

export interface TenantSearchRequest {
  search?: string;
  status?: TenantStatus;
  roomId?: string;
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
  dueDate: string;
  issuedDate: string;
  status: InvoiceStatus;
  description?: string;
  createdAt: string;
  updatedAt: string;
  tenant?: Tenant;
  room?: Room;
  payments?: Payment[];
}

export enum InvoiceStatus {
  Pending = 'Pending',
  Paid = 'Paid',
  Overdue = 'Overdue',
  Cancelled = 'Cancelled'
}

export interface CreateInvoiceRequest {
  tenantId: string;
  roomId: string;
  amount: number;
  dueDate: string;
  description?: string;
}

export interface UpdateInvoiceRequest extends Partial<CreateInvoiceRequest> {
  status?: InvoiceStatus;
}

export interface InvoiceSearchRequest {
  search?: string;
  status?: InvoiceStatus;
  tenantId?: string;
  roomId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
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
