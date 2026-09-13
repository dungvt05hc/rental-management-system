// API Response Types
export interface ApiResponse<T = unknown> {
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

// POST /auth/forgot-password — khớp ForgotPasswordDto
export interface ForgotPasswordRequest {
  email: string;
}

// POST /auth/reset-password — khớp ResetPasswordDto
export interface ResetPasswordRequest {
  email: string;
  token: string;
  newPassword: string;
}

// POST /auth/register — khớp SelfRegisterDto
// Không có trường role: role do mã mời quy định, và DTO phía backend cũng không
// có chỗ nào để nhận role từ request.
export interface SelfRegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
  invitationCode: string;
}

// Kết quả đăng ký — cố tình không có token: tài khoản mới còn phải xác nhận email.
export interface SelfRegisterResult {
  email: string;
  requiresEmailConfirmation: boolean;
}

// GET /auth/check-email — khớp CheckEmailResultDto
export interface CheckEmailResult {
  available: boolean;
}

// POST /auth/confirm-email — khớp ConfirmEmailDto
export interface ConfirmEmailRequest {
  email: string;
  token: string;
}

// POST /auth/resend-confirmation — khớp ResendConfirmationDto
export interface ResendConfirmationRequest {
  email: string;
}

// Invitation Types — khớp InvitationDtos.cs

// Khớp enum InvitationStatus phía backend. ASP.NET serialize enum thành số theo
// mặc định, nên các giá trị dưới đây phải giữ đúng thứ tự khai báo của C#.
export enum InvitationStatus {
  Pending = 0,
  Redeemed = 1,
  Revoked = 2,
  Expired = 3
}

export interface Invitation {
  id: string;
  codePrefix: string;
  role: string;
  email?: string | null;
  note?: string | null;
  status: InvitationStatus;
  expiresAt: string;
  createdAt: string;
  createdByEmail?: string | null;
  redeemedAt?: string | null;
  redeemedByEmail?: string | null;
  revokedAt?: string | null;
}

export interface CreateInvitationRequest {
  role: UserRole;
  email?: string;
  expiresInDays: number;
  note?: string;
}

// Mã gốc chỉ có trong response tạo mã — backend chỉ lưu bản băm.
export interface CreatedInvitation {
  invitation: Invitation;
  code: string;
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
  customer?: Customer;
  currentCustomer?: Customer;
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

export type RoomSearchRequest = {
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

// Customer Types
export interface Customer {
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
  // Các trường dưới đây suy ra từ hợp đồng đang hoạt động của khách,
  // backend tính sẵn trong CustomerDto — không lưu trên bản ghi Customer.
  activeContractId?: number;
  contractStartDate?: string;
  contractEndDate?: string;
  securityDeposit: number;
  monthlyRent?: number;
  isActive?: boolean;
  hasActiveContract?: boolean;
  contractCount?: number;
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

export interface CreateCustomerRequest {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth?: string;
  identificationNumber?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  notes?: string;
}

export interface UpdateCustomerRequest extends Partial<CreateCustomerRequest> {
  isActive?: boolean;
}

export interface AssignRoomRequest {
  roomId: number;
  contractStartDate: string;
  contractEndDate: string;
  monthlyRent: number;
  securityDeposit: number;
}

// Rental Contract Types
export enum RentalContractStatus {
  Draft = 1,
  Active = 2,
  Ended = 3,
  Cancelled = 4,
}

export interface RentalContract {
  id: number;
  customerId: number;
  customerName: string;
  roomId: number;
  room?: {
    id: number;
    roomNumber: string;
    typeName?: string;
    monthlyRent: number;
    floor: number;
  };
  startDate: string;
  endDate?: string;
  monthlyRent: number;
  securityDeposit: number;
  status: RentalContractStatus;
  statusName: string;
  isCurrentlyActive: boolean;
  invoiceCount: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRentalContractRequest {
  customerId: number;
  roomId: number;
  startDate: string;
  endDate?: string;
  monthlyRent?: number;
  securityDeposit: number;
  status?: RentalContractStatus;
  notes?: string;
}

export interface UpdateRentalContractRequest {
  startDate?: string;
  endDate?: string;
  monthlyRent?: number;
  securityDeposit?: number;
  notes?: string;
}

export interface EndRentalContractRequest {
  endDate?: string;
  notes?: string;
}

export type RentalContractSearchRequest = {
  customerId?: number;
  roomId?: number;
  status?: RentalContractStatus;
  page?: number;
  pageSize?: number;
}

export type CustomerSearchRequest = {
  search?: string;
  searchTerm?: string;
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
  customerId: string;
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
  customer?: Customer;
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
  customerId: number;
  roomId: number;
  billingPeriod: string;
  additionalCharges?: number;
  discount?: number;
  dueDate: string;
  additionalChargesDescription?: string;
  notes?: string;
  invoiceItems?: CreateInvoiceItemRequest[];
}

// Khớp với UpdateInvoiceDto ở Backend/Models/DTOs/InvoiceDtos.cs
export interface UpdateInvoiceRequest {
  additionalCharges?: number;
  discount?: number;
  status?: InvoiceStatus;
  dueDate?: string;
  additionalChargesDescription?: string;
  notes?: string;
  // Backend UpdateInvoiceDto có nhận InvoiceItems — type cũ thiếu field này
  invoiceItems?: CreateInvoiceItemRequest[];
}

export type InvoiceSearchRequest = {
  search?: string;
  searchTerm?: string;
  status?: InvoiceStatus;
  customerId?: string;
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

export type ItemSearchRequest = {
  searchTerm?: string;
  category?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDirection?: string;
}

// Payment Types
// Khớp với InvoiceSummaryDto ở Backend/Models/DTOs/InvoiceDtos.cs.
// PaymentDto nhúng bản tóm tắt này chứ không trả invoiceId rời.
export interface InvoiceSummary {
  id: string;
  invoiceNumber: string;
  customerName: string;
  roomNumber: string;
  totalAmount: number;
  remainingBalance: number;
  status: InvoiceStatus;
  statusName: string;
  billingPeriod: string;
  dueDate: string;
  isOverdue: boolean;
}

// Khớp với PaymentDto ở Backend/Models/DTOs/InvoiceDtos.cs
export interface Payment {
  id: string;
  invoice?: InvoiceSummary;
  amount: number;
  method: PaymentMethod;
  methodName: string;
  referenceNumber?: string;
  paymentDate: string;
  recordedDate: string;
  recordedByUserId?: string;
  notes?: string;
  isVerified: boolean;
  createdAt: string;
}

// Khớp với enum PaymentMethod ở Backend/Models/Entities/Payment.cs.
// Backend không đăng ký JsonStringEnumConverter nên enum lên wire là SỐ,
// không phải chuỗi.
export enum PaymentMethod {
  Cash = 1,
  Check = 2,
  BankTransfer = 3,
  CreditCard = 4,
  DebitCard = 5,
  DigitalWallet = 6,
  MoneyOrder = 7,
  Other = 8
}

// Khớp với CreatePaymentDto ở Backend/Models/DTOs/InvoiceDtos.cs
export interface CreatePaymentRequest {
  // Backend CreatePaymentDto.InvoiceId is an int — must be sent as a number,
  // System.Text.Json rejects a quoted string here.
  invoiceId: number;
  amount: number;
  method: PaymentMethod;
  referenceNumber?: string;
  paymentDate: string;
  notes?: string;
}

export interface UpdatePaymentRequest extends Partial<CreatePaymentRequest> {}

export type PaymentSearchRequest = {
  search?: string;
  invoiceId?: string;
  paymentMethod?: PaymentMethod;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

// Report Types
/**
 * GET /reports/occupancy-rate
 *
 * SHAPE NÀY ĐÃ ĐƯỢC ĐO LẠI TỪ RESPONSE THẬT, không phải chép từ tên endpoint.
 * Bản khai báo cũ ghi { totalRooms, occupiedRooms, availableRooms,
 * maintenanceRooms, occupancyRate } — chỉ `totalRooms` là có thật. Bốn trường
 * còn lại luôn undefined ở runtime, nên mọi chỗ đọc chúng đều im lặng ra
 * undefined rồi rơi xuống nhánh fallback hoặc in ra ô trống.
 *
 * Xem ReportingService.GetOccupancyRateReportAsync để đối chiếu.
 */
export interface OccupancyReport {
  reportPeriod: ReportPeriod;
  totalRooms: number;
  /** Số phòng đang có khách tại thời điểm chạy báo cáo. */
  currentOccupancy: number;
  currentOccupancyRate: number;
  /** Tỉ lệ lấp đầy theo từng tháng trong khoảng đã chọn. */
  monthlyOccupancy: Array<{
    period: string;
    occupiedRooms: number;
    occupancyRate: number;
  }>;
  averageOccupancyRate: number;
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
  newCustomers: number;
  departedCustomers: number;
}

// Các báo cáo dưới đây được backend trả về dưới dạng anonymous object
// (ApiResponse<object> trong IReportingService), nên không có DTO để đối chiếu.
// Các type sau mô tả đúng shape mà ReportingService dựng, ở dạng camelCase —
// ASP.NET Core serialize theo JsonSerializerDefaults.Web nên tên property
// PascalCase phía C# lên wire thành camelCase.

export interface ReportPeriod {
  fromDate: string;
  toDate: string;
}

// GET /reports/outstanding-payments
export interface OutstandingInvoiceRow {
  invoiceId: string;
  customerName: string;
  amount: number;
  dueDate: string;
  status: string;
}

export interface OverdueInvoiceRow extends OutstandingInvoiceRow {
  daysOverdue: number;
}

export interface UpcomingInvoiceRow extends OutstandingInvoiceRow {
  daysUntilDue: number;
}

export interface OutstandingPaymentsReport {
  generatedAt: string;
  summary: {
    totalOutstandingAmount: number;
    totalOverdueAmount: number;
    totalUpcomingAmount: number;
    overdueCount: number;
    upcomingCount: number;
  };
  overdueInvoices: OverdueInvoiceRow[];
  upcomingInvoices: UpcomingInvoiceRow[];
  ageAnalysis: {
    overdue0to30Days: number;
    overdue31to60Days: number;
    overdue61to90Days: number;
    overdueOver90Days: number;
  };
}

// GET /reports/financial-summary
export interface FinancialMonthlyBreakdown {
  period: string;
  year: number;
  month: number;
  totalInvoiced: number;
  paidAmount: number;
  outstandingAmount: number;
  invoiceCount: number;
  collectionRate: number;
}

export interface FinancialSummaryReport {
  reportPeriod: ReportPeriod;
  revenue: {
    totalRevenue: number;
    totalPayments: number;
    totalOutstanding: number;
    collectionRate: number;
  };
  deposits: {
    totalSecurityDeposits: number;
  };
  monthlyBreakdown: FinancialMonthlyBreakdown[];
  summary: {
    averageMonthlyRevenue: number;
    totalInvoices: number;
    netIncome: number;
  };
}

// GET /reports/customer-statistics
export interface CustomerStatisticsReport {
  generatedAt: string;
  overview: {
    totalCustomers: number;
    activeCustomers: number;
    inactiveCustomers: number;
    assignedCustomers: number;
    unassignedCustomers: number;
  };
  contractStatus: {
    expiringIn30Days: number;
    expiringIn90Days: number;
  };
  recentActivity: {
    newCustomersLast30Days: number;
  };
  demographics: {
    ageGroups: Record<string, number>;
    totalWithAgeData: number;
  };
  financialSummary: {
    totalMonthlyRent: number;
    averageMonthlyRent: number;
    totalSecurityDeposits: number;
    averageSecurityDeposit: number;
  };
  ratios: {
    occupancyRate: number;
    activityRate: number;
  };
}

// GET /reports/room-utilization
export interface RoomUtilizationDetail {
  roomId: string;
  roomNumber: string;
  floor: number;
  status: string;
  monthlyRent: number;
  currentCustomer: {
    id: string;
    name: string;
    contractStart?: string;
    contractEnd?: string;
    monthlyRent: number;
  } | null;
  isOccupied: boolean;
}

export interface RoomUtilizationReport {
  generatedAt: string;
  summary: {
    totalRooms: number;
    occupiedRooms: number;
    vacantRooms: number;
    occupancyRate: number;
  };
  statusDistribution: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  floorAnalysis: Array<{
    floor: number;
    totalRooms: number;
    occupiedRooms: number;
    vacantRooms: number;
    occupancyRate: number;
    totalRevenue: number;
    averageRent: number;
  }>;
  roomDetails: RoomUtilizationDetail[];
  revenue: {
    totalMonthlyRevenue: number;
    averageRentPerRoom: number;
    potentialRevenue: number;
    revenueEfficiency: number;
  };
}

// GET /reports/payment-method-distribution
export interface PaymentMethodDistributionReport {
  reportPeriod: ReportPeriod;
  summary: {
    totalPayments: number;
    totalAmount: number;
    averagePayment: number;
  };
  distribution: Array<{
    paymentMethod: string;
    count: number;
    totalAmount: number;
    averageAmount: number;
    percentage: number;
  }>;
}

// GET /payments/statistics
export interface PaymentStatistics {
  totalPayments: number;
  totalAmount: number;
  verifiedPayments: number;
  unverifiedPayments: number;
  currentMonthPayments: number;
  currentMonthAmount: number;
  lastMonthPayments: number;
  lastMonthAmount: number;
  paymentMethodBreakdown: Array<{
    method: string;
    count: number;
    amount: number;
  }>;
}

// GET /reports/dashboard-summary
export interface ExpiringContractRow {
  customerName: string;
  roomNumber: string;
  expiryDate?: string;
}

export interface DashboardSummaryReport {
  generatedAt: string;
  occupancy: {
    totalRooms: number;
    occupiedRooms: number;
    vacantRooms: number;
    occupancyRate: number;
  };
  customers: {
    totalActive: number;
    newThisMonth: number;
  };
  financials: {
    monthlyRevenue: number;
    lastMonthRevenue: number;
    revenueGrowthRate: number;
    pendingPayments: number;
    overdueInvoices: number;
  };
  upcomingEvents: {
    contractsExpiring: number;
    expiringContracts: ExpiringContractRow[];
  };
  alerts: Array<{
    type: string;
    message: string;
  }>;
}

// Khớp với PagedResponse<T> ở Backend/Models/DTOs/CommonDtos.cs
export interface PaginatedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
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
  data?: Record<string, unknown>;
}
