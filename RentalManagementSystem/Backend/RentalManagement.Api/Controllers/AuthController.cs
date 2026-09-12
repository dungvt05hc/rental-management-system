using System.ComponentModel.DataAnnotations;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using RentalManagement.Api.Models.DTOs;
using RentalManagement.Api.Security;
using RentalManagement.Api.Services.Interfaces;

namespace RentalManagement.Api.Controllers;

/// <summary>
/// Controller for authentication and the caller's own profile.
/// User administration lives in <see cref="UsersController"/>.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    /// <summary>
    /// User login
    /// </summary>
    /// <param name="loginDto">Login credentials</param>
    /// <returns>JWT token and user information</returns>
    [HttpPost("login")]
    [EnableRateLimiting(RateLimitPolicies.Login)]
    public async Task<ActionResult<ApiResponse<AuthResponseDto>>> Login([FromBody] LoginDto loginDto)
    {
        var result = await _authService.LoginAsync(loginDto);

        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Registers an account from an invitation code
    /// </summary>
    /// <remarks>
    /// Ẩn danh: người được mời chưa có tài khoản nên không thể tự xác thực.
    /// Role KHÔNG lấy từ request — <see cref="SelfRegisterDto"/> không có trường
    /// role, nên một body có "role" chỉ đơn giản không được bind vào đâu cả.
    /// Role thật do mã mời quy định.
    ///
    /// Trả về 200 mà không kèm JWT: tài khoản mới còn phải xác nhận email trước
    /// khi đăng nhập được.
    /// </remarks>
    /// <param name="registerDto">Registration information plus the invitation code</param>
    [HttpPost("register")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicies.Register)]
    [ProducesResponseType(typeof(ApiResponse<SelfRegisterResultDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<SelfRegisterResultDto>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<ApiResponse<SelfRegisterResultDto>>> Register(
        [FromBody] SelfRegisterDto registerDto,
        CancellationToken ct)
    {
        var result = await _authService.RegisterAsync(registerDto, ct);

        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Tells the registration form whether an email address is still free
    /// </summary>
    /// <remarks>
    /// Endpoint này trả lời đúng câu hỏi "địa chỉ này đã có tài khoản chưa", nên
    /// nó là một kênh user enumeration có chủ ý, đánh đổi lấy việc form báo trùng
    /// email ngay khi rời ô nhập. Rate limit theo IP là thứ giữ cho nó không
    /// thành công cụ quét danh sách địa chỉ.
    /// </remarks>
    /// <param name="email">Address to check</param>
    [HttpGet("check-email")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicies.CheckEmail)]
    [ProducesResponseType(typeof(ApiResponse<CheckEmailResultDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<ApiResponse<CheckEmailResultDto>>> CheckEmail(
        [FromQuery, Required, EmailAddress] string email,
        CancellationToken ct)
    {
        var available = await _authService.IsEmailAvailableAsync(email, ct);

        return Ok(ApiResponse<CheckEmailResultDto>.SuccessResponse(
            new CheckEmailResultDto { Available = available }));
    }

    /// <summary>
    /// Confirms an email address with the token from the emailed link
    /// </summary>
    /// <param name="confirmEmailDto">Email and confirmation token</param>
    [HttpPost("confirm-email")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ApiResponse<bool>>> ConfirmEmail(
        [FromBody] ConfirmEmailDto confirmEmailDto)
    {
        var result = await _authService.ConfirmEmailAsync(confirmEmailDto);

        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Requests another email confirmation link
    /// </summary>
    /// <remarks>
    /// Như <c>forgot-password</c>: luôn trả 200 với cùng một thông điệp, dù địa
    /// chỉ có tài khoản chờ xác nhận hay không.
    /// </remarks>
    /// <param name="resendDto">The address to send the link to</param>
    [HttpPost("resend-confirmation")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicies.ResendConfirmation)]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<ApiResponse<bool>>> ResendConfirmation(
        [FromBody] ResendConfirmationDto resendDto,
        CancellationToken ct)
    {
        await _authService.ResendEmailConfirmationAsync(resendDto, ct);

        return Ok(ApiResponse<bool>.SuccessResponse(
            true,
            "If that address belongs to an account waiting for confirmation, "
            + "we have sent a new link to it"));
    }

    /// <summary>
    /// Requests a password reset link by email
    /// </summary>
    /// <remarks>
    /// Always returns 200 with the same message, whether or not the address has
    /// an account. Answering differently — 404, a different message, anything —
    /// would let anyone test addresses against the system and harvest the list
    /// of registered users.
    /// </remarks>
    /// <param name="forgotPasswordDto">The address to send the link to</param>
    [HttpPost("forgot-password")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicies.ForgotPassword)]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<ApiResponse<bool>>> ForgotPassword(
        [FromBody] ForgotPasswordDto forgotPasswordDto,
        CancellationToken ct)
    {
        await _authService.SendPasswordResetLinkAsync(forgotPasswordDto, ct);

        return Ok(ApiResponse<bool>.SuccessResponse(
            true,
            "If that email address is in our system, we have sent password reset instructions to it"));
    }

    /// <summary>
    /// Sets a new password using the token from a password reset link
    /// </summary>
    /// <remarks>
    /// On success every JWT issued before this call stops working, so the user
    /// has to sign in again with the new password.
    /// </remarks>
    /// <param name="resetPasswordDto">Email, reset token and new password</param>
    [HttpPost("reset-password")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ApiResponse<bool>>> ResetPassword(
        [FromBody] ResetPasswordDto resetPasswordDto)
    {
        var result = await _authService.ResetPasswordAsync(resetPasswordDto);

        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Get current user profile
    /// </summary>
    /// <returns>Current user information</returns>
    [HttpGet("profile")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<UserDto>>> GetProfile()
    {
        var userId = User.FindFirst("id")?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return BadRequest(ApiResponse<UserDto>.ErrorResponse("User not found"));
        }

        var result = await _authService.GetUserAsync(userId);

        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Update user profile
    /// </summary>
    /// <param name="updateUserDto">Updated user information</param>
    /// <returns>Updated user information</returns>
    [HttpPut("profile")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<UserDto>>> UpdateProfile([FromBody] UpdateUserDto updateUserDto)
    {
        var userId = User.FindFirst("id")?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return BadRequest(ApiResponse<UserDto>.ErrorResponse("User not found"));
        }

        // Convert UpdateUserDto to RegisterRequestDto for the service call
        var registerDto = new RegisterRequestDto
        {
            FirstName = updateUserDto.FirstName ?? "",
            LastName = updateUserDto.LastName ?? "",
            Email = "", // Email should not be updated through this endpoint
            PhoneNumber = updateUserDto.PhoneNumber
        };

        var result = await _authService.UpdateUserAsync(userId, registerDto);

        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

}
