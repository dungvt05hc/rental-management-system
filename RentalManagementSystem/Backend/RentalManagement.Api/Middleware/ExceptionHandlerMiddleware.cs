using System.Diagnostics;
using System.Text.Json;

using RentalManagement.Api.Models.DTOs;
using RentalManagement.Api.Models.Email;
using RentalManagement.Api.Models.Exceptions;

namespace RentalManagement.Api.Middleware;

/// <summary>
/// Catches every unhandled exception in the pipeline, logs it in full on the server
/// and returns a generic <see cref="ApiResponse{T}"/> to the client carrying only a
/// trace id. Exception details are never sent to the client outside Development.
/// </summary>
public class ExceptionHandlerMiddleware
{
    private static readonly JsonSerializerOptions SerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlerMiddleware> _logger;
    private readonly IHostEnvironment _environment;

    public ExceptionHandlerMiddleware(
        RequestDelegate next,
        ILogger<ExceptionHandlerMiddleware> logger,
        IHostEnvironment environment)
    {
        _next = next;
        _logger = logger;
        _environment = environment;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var traceId = Activity.Current?.Id ?? context.TraceIdentifier;

        // Lỗi nghiệp vụ là KẾT QUẢ MONG ĐỢI, không phải sự cố: người dùng gửi
        // một yêu cầu mà luật không cho phép. Ghi nó ở mức Error làm log lỗi đầy
        // những dòng không ai cần xử lý, và che mất sự cố thật.
        if (exception is DomainException)
        {
            _logger.LogInformation(
                "Domain rule rejected the request. TraceId={TraceId} Method={Method} Path={Path} Reason={Reason}",
                traceId,
                context.Request.Method,
                context.Request.Path.Value,
                exception.Message);
        }
        else
        {
            _logger.LogError(
                exception,
                "Unhandled exception. TraceId={TraceId} Method={Method} Path={Path}",
                traceId,
                context.Request.Method,
                context.Request.Path.Value);
        }

        // Headers are already on the wire — the client is mid-response, nothing to do but
        // let the server abort the connection so the payload is not silently truncated.
        if (context.Response.HasStarted)
        {
            _logger.LogWarning(
                "Response already started, cannot write error payload. TraceId={TraceId}",
                traceId);
            throw exception;
        }

        var (statusCode, message) = MapException(exception);

        context.Response.Clear();
        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json";
        context.Response.Headers["X-Trace-Id"] = traceId;

        var errors = new List<string> { $"traceId: {traceId}" };

        // Lỗi nghiệp vụ không kèm chi tiết kỹ thuật kể cả ở Development: câu
        // `message` đã nói đủ, còn stack trace của một luật nghiệp vụ chỉ là
        // nhiễu và làm người đọc quen với việc bỏ qua phần errors.
        if (_environment.IsDevelopment() && exception is not DomainException)
        {
            errors.Add($"{exception.GetType().FullName}: {exception.Message}");

            if (exception.StackTrace is not null)
            {
                errors.Add(exception.StackTrace);
            }
        }

        var payload = ApiResponse<object>.ErrorResponse(message, errors.ToArray());

        await context.Response.WriteAsync(JsonSerializer.Serialize(payload, SerializerOptions));
    }

    private static (int StatusCode, string Message) MapException(Exception exception) => exception switch
    {
        // DomainException phải đứng TRƯỚC InvalidOperationException: nó là loại
        // duy nhất mà Message được viết sẵn cho người dùng đọc, nên nó được gửi
        // nguyên văn. Mọi nhánh còn lại thay bằng câu chung — chi tiết chỉ nằm
        // trong log, tra lại bằng traceId.
        DomainException domain => (domain.StatusCode, domain.Message),
        EmailRateLimitExceededException => (StatusCodes.Status429TooManyRequests, "Too many emails have been sent to this address. Please try again later"),
        KeyNotFoundException => (StatusCodes.Status404NotFound, "The requested resource was not found"),
        UnauthorizedAccessException => (StatusCodes.Status403Forbidden, "You are not allowed to perform this operation"),
        ArgumentException => (StatusCodes.Status400BadRequest, "The request is invalid"),
        InvalidOperationException => (StatusCodes.Status400BadRequest, "The request could not be processed"),
        _ => (StatusCodes.Status500InternalServerError, "An unexpected error occurred while processing the request")
    };
}
