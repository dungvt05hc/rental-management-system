namespace RentalManagement.Api.Models.DTOs;

/// <summary>
/// Generic API response wrapper
/// </summary>
/// <typeparam name="T">Type of data being returned</typeparam>
public class ApiResponse<T>
{
    /// <summary>
    /// Whether the operation was successful
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// Response message
    /// </summary>
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// Response data
    /// </summary>
    public T? Data { get; set; }

    /// <summary>
    /// Error details (if any)
    /// </summary>
    public object? Errors { get; set; }

    /// <summary>
    /// Creates a successful response
    /// </summary>
    public static ApiResponse<T> SuccessResponse(T data, string message = "Operation completed successfully")
    {
        return new ApiResponse<T>
        {
            Success = true,
            Message = message,
            Data = data
        };
    }

    /// <summary>
    /// Creates an error response
    /// </summary>
    public static ApiResponse<T> ErrorResponse(string message, object? errors = null)
    {
        return new ApiResponse<T>
        {
            Success = false,
            Message = message,
            Errors = errors
        };
    }
}

/// <summary>
/// Paginated response wrapper
/// </summary>
/// <typeparam name="T">Type of items in the collection</typeparam>
public class PagedResponse<T>
{
    /// <summary>
    /// Items in the current page
    /// </summary>
    public IEnumerable<T> Items { get; set; } = new List<T>();

    /// <summary>
    /// Current page number
    /// </summary>
    public int Page { get; set; }

    /// <summary>
    /// Number of items per page
    /// </summary>
    public int PageSize { get; set; }

    /// <summary>
    /// Total number of items across all pages
    /// </summary>
    public int TotalItems { get; set; }

    /// <summary>
    /// Total number of pages
    /// </summary>
    public int TotalPages { get; set; }

    /// <summary>
    /// Whether there is a previous page
    /// </summary>
    public bool HasPreviousPage { get; set; }

    /// <summary>
    /// Whether there is a next page
    /// </summary>
    public bool HasNextPage { get; set; }

    /// <summary>
    /// Creates a paginated response
    /// </summary>
    public static PagedResponse<T> Create(IEnumerable<T> items, int page, int pageSize, int totalItems)
    {
        var totalPages = (int)Math.Ceiling(totalItems / (double)pageSize);
        
        return new PagedResponse<T>
        {
            Items = items,
            Page = page,
            PageSize = pageSize,
            TotalItems = totalItems,
            TotalPages = totalPages,
            HasPreviousPage = page > 1,
            HasNextPage = page < totalPages
        };
    }
}

/// <summary>
/// Giới hạn phân trang dùng chung cho tầng service.
/// </summary>
public static class PaginationLimits
{
    /// <summary>
    /// Số bản ghi tối đa cho một trang. Chặn client yêu cầu pageSize quá lớn
    /// (pageSize=100000) kéo cả bảng về trong một request.
    /// </summary>
    public const int MaxPageSize = 100;

    /// <summary>
    /// PageSize dùng khi client gửi giá trị không hợp lệ (&lt;= 0).
    /// </summary>
    public const int DefaultPageSize = 10;

    /// <summary>
    /// Ép page và pageSize về khoảng hợp lệ trước khi Skip/Take.
    /// </summary>
    public static (int Page, int PageSize) Normalize(int page, int pageSize)
    {
        var normalizedPage = page < 1 ? 1 : page;
        var normalizedPageSize = pageSize switch
        {
            <= 0 => DefaultPageSize,
            > MaxPageSize => MaxPageSize,
            _ => pageSize
        };

        return (normalizedPage, normalizedPageSize);
    }
}

/// <summary>
/// DTO for validation error responses
/// </summary>
public class ValidationErrorResponse
{
    /// <summary>
    /// Field that has the validation error
    /// </summary>
    public string Field { get; set; } = string.Empty;

    /// <summary>
    /// Validation error message
    /// </summary>
    public string Message { get; set; } = string.Empty;
}
