namespace RentalManagement.Api.Models.Exceptions;

/// <summary>
/// Nghiệp vụ từ chối yêu cầu, và câu từ chối ĐƯỢC VIẾT CHO NGƯỜI DÙNG ĐỌC.
///
/// Đây là điểm khác biệt duy nhất so với mọi exception khác, và nó là lý do
/// loại này tồn tại: <see cref="Exception.Message"/> của nó được phép gửi
/// thẳng về client, còn message của mọi exception khác thì không.
///
/// Trước đây hai controller tự bắt <see cref="InvalidOperationException"/> rồi
/// trả <c>ex.Message</c> về client. Cách đó hỏng ở chỗ không phân biệt được
/// "Mã ngôn ngữ 'vi' đã tồn tại" — câu viết cho người dùng — với
/// "Sequence contains no elements" hay một thông báo lỗi Npgsql kèm tên bảng,
/// tên cột. Cả hai đều là InvalidOperationException.
///
/// Quy tắc: chỉ ném loại này khi câu chữ đã sẵn sàng hiện lên màn hình.
/// Mọi thứ khác cứ để nguyên, ExceptionHandlerMiddleware sẽ thay bằng câu
/// chung và ghi chi tiết vào log kèm traceId.
/// </summary>
public class DomainException : Exception
{
    /// <summary>Mã HTTP trả về. Mặc định 400.</summary>
    public int StatusCode { get; }

    public DomainException(string message, int statusCode = 400)
        : base(message)
    {
        StatusCode = statusCode;
    }
}

/// <summary>Không tìm thấy thứ người dùng yêu cầu. Trả 404.</summary>
public sealed class DomainNotFoundException : DomainException
{
    public DomainNotFoundException(string message)
        : base(message, 404)
    {
    }
}

/// <summary>
/// Yêu cầu đụng vào một ràng buộc đang tồn tại — trùng khoá, xoá thứ đang được
/// dùng, sửa thứ khoá cứng. Trả 409.
/// </summary>
public sealed class DomainConflictException : DomainException
{
    public DomainConflictException(string message)
        : base(message, 409)
    {
    }
}
