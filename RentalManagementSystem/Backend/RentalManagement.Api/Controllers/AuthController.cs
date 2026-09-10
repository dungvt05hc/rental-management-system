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
    /// User registration
    /// </summary>
    /// <param name="registerDto">Registration information</param>
    /// <returns>Registration result</returns>
    [HttpPost("register")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse<AuthResponseDto>>> Register([FromBody] RegisterDto registerDto)
    {
        var result = await _authService.RegisterAsync(registerDto);

        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
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
