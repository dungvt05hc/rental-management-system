using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RentalManagement.Api.Models.DTOs;
using RentalManagement.Api.Services.Interfaces;

namespace RentalManagement.Api.Controllers;

/// <summary>
/// Controller for authentication operations
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

    /// <summary>
    /// Assign role to user (Admin only)
    /// </summary>
    /// <param name="userId">User ID</param>
    /// <param name="assignRoleDto">Role assignment information</param>
    /// <returns>Role assignment result</returns>
    [HttpPost("users/{userId}/roles")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse<bool>>> AssignRole(string userId, [FromBody] AssignRoleDto assignRoleDto)
    {
        var result = await _authService.AssignRoleAsync(userId, assignRoleDto.RoleName);

        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Remove role from user (Admin only)
    /// </summary>
    /// <param name="userId">User ID</param>
    /// <param name="assignRoleDto">Role removal information</param>
    /// <returns>Role removal result</returns>
    [HttpDelete("users/{userId}/roles")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse<bool>>> RemoveRole(string userId, [FromBody] AssignRoleDto assignRoleDto)
    {
        var result = await _authService.RemoveRoleAsync(userId, assignRoleDto.RoleName);

        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Get all users (Admin/Manager only)
    /// </summary>
    /// <returns>List of all users</returns>
    [HttpGet("users")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<ApiResponse<IEnumerable<UserDto>>>> GetAllUsers()
    {
        var result = await _authService.GetUsersAsync();

        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }
}
