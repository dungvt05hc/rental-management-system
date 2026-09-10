using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using RentalManagement.Api.Models.DTOs;
using RentalManagement.Api.Models.Email;
using RentalManagement.Api.Services.Interfaces;

namespace RentalManagement.Api.Controllers;

/// <summary>
/// Controller for verifying the email infrastructure
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "Admin")]
public class EmailController : ControllerBase
{
    private readonly IEmailService _emailService;
    private readonly EmailSettings _settings;

    public EmailController(IEmailService emailService, IOptions<EmailSettings> settings)
    {
        _emailService = emailService;
        _settings = settings.Value;
    }

    /// <summary>
    /// Sends a test email so a deployment can be checked without touching a real flow (Admin only)
    /// </summary>
    /// <remarks>
    /// Returns 202 as soon as the message is queued — delivery happens in the
    /// background. With SMTP unconfigured the message is only logged. A fourth
    /// call to the same address inside the rate limit window returns 429.
    /// </remarks>
    [HttpPost("test")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status202Accepted)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> SendTest([FromBody] SendTestEmailDto request)
    {
        if (request.Template is { } template)
        {
            await _emailService.SendTemplateAsync(request.To, template, SampleModelFor(template));
        }
        else
        {
            await _emailService.SendAsync(
                request.To,
                "Kiểm tra cấu hình email",
                "<p>Email thử nghiệm từ hệ thống quản lý phòng cho thuê. "
                + "Nếu bạn đọc được dòng này với đầy đủ dấu tiếng Việt thì cấu hình SMTP đã đúng.</p>");
        }

        var message = _settings.IsConfigured
            ? "Email has been queued for delivery"
            : "SMTP is not configured; the email was logged instead of sent";

        return Accepted(ApiResponse<object>.SuccessResponse(new
        {
            queued = true,
            smtpConfigured = _settings.IsConfigured
        }, message));
    }

    /// <summary>
    /// Dữ liệu mẫu cho từng template, để endpoint test dựng được email thật sự
    /// giống email hệ thống sẽ gửi.
    /// </summary>
    private static object SampleModelFor(EmailTemplate template) => template switch
    {
        EmailTemplate.ResetPassword => new
        {
            FullName = "Nguyễn Văn A",
            ResetLink = "https://example.com/reset-password?token=test",
            ExpiryMinutes = 30
        },
        EmailTemplate.WelcomeNewUser => new
        {
            FullName = "Nguyễn Văn A",
            Email = "nguyenvana@example.com",
            LoginLink = "https://example.com/login"
        },
        EmailTemplate.EmailConfirmation => new
        {
            FullName = "Nguyễn Văn A",
            ConfirmationLink = "https://example.com/confirm-email?token=test",
            ExpiryHours = 24
        },
        _ => throw new ArgumentException($"Unknown email template '{template}'", nameof(template))
    };
}
