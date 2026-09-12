import { apiService } from './api';
import type {
  LoginRequest,
  LoginResponse,
  SelfRegisterRequest,
  SelfRegisterResult,
  CheckEmailResult,
  ConfirmEmailRequest,
  ResendConfirmationRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  User,
  ApiResponse
} from '../types';

export const authService = {
  // Login user
  async login(credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    return apiService.post<LoginResponse>('/auth/login', credentials);
  },

  // Đăng ký bằng mã mời. Không trả về token: tài khoản mới phải xác nhận email
  // xong mới đăng nhập được.
  async register(userData: SelfRegisterRequest): Promise<ApiResponse<SelfRegisterResult>> {
    return apiService.post<SelfRegisterResult>('/auth/register', userData);
  },

  // Hỏi xem địa chỉ email còn trống không, cho form đăng ký báo trùng tại chỗ.
  // Endpoint có rate limit theo IP, nên chỉ gọi khi rời ô nhập chứ đừng gọi
  // theo từng phím gõ.
  async checkEmail(email: string): Promise<ApiResponse<CheckEmailResult>> {
    return apiService.get<CheckEmailResult>('/auth/check-email', { email });
  },

  // Xác nhận địa chỉ email bằng token trong link đã gửi.
  async confirmEmail(request: ConfirmEmailRequest): Promise<ApiResponse<boolean>> {
    return apiService.post<boolean>('/auth/confirm-email', request);
  },

  // Xin một link xác nhận mới. Luôn thành công dù địa chỉ có tài khoản chờ xác
  // nhận hay không — cùng lý do với forgotPassword.
  async resendConfirmation(request: ResendConfirmationRequest): Promise<ApiResponse<boolean>> {
    return apiService.post<boolean>('/auth/resend-confirmation', request);
  },

  // Yêu cầu email chứa link đặt lại mật khẩu.
  // Luôn thành công dù địa chỉ có tài khoản hay không — backend cố tình trả về
  // như nhau để không lộ danh sách email đã đăng ký.
  async forgotPassword(request: ForgotPasswordRequest): Promise<ApiResponse<boolean>> {
    return apiService.post<boolean>('/auth/forgot-password', request);
  },

  // Đặt mật khẩu mới bằng token trong link. Mọi phiên đăng nhập cũ hết hiệu lực
  // khi thành công, nên người dùng phải đăng nhập lại.
  async resetPassword(request: ResetPasswordRequest): Promise<ApiResponse<boolean>> {
    return apiService.post<boolean>('/auth/reset-password', request);
  },

  // Get current user profile
  async getProfile(): Promise<ApiResponse<User>> {
    return apiService.get<User>('/auth/profile');
  },

  // Update user profile
  async updateProfile(userData: Partial<User>): Promise<ApiResponse<User>> {
    return apiService.put<User>('/auth/profile', userData);
  },

  // User administration (list, roles) lives in userManagementService.

  // Local logout (clear token)
  logout(): void {
    tokenStorage.clear();
    window.location.href = '/login';
  }
};

// Local storage helpers
export const tokenStorage = {
  getToken(): string | null {
    return localStorage.getItem('authToken');
  },

  setToken(token: string): void {
    localStorage.setItem('authToken', token);
  },

  removeToken(): void {
    localStorage.removeItem('authToken');
  },

  getUser(): User | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  setUser(user: User): void {
    localStorage.setItem('user', JSON.stringify(user));
  },

  removeUser(): void {
    localStorage.removeItem('user');
  },

  clear(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  }
};
