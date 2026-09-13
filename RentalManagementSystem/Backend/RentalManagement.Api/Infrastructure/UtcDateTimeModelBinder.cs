using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Mvc.ModelBinding.Binders;

namespace RentalManagement.Api.Infrastructure;

/// <summary>
/// Ép mọi <see cref="DateTime"/> bind từ query/route/form về <see cref="DateTimeKind.Utc"/>.
///
/// VÌ SAO CẦN:
///
/// Model binder mặc định dựng "2026-09-01" thành DateTime có Kind=Unspecified.
/// Npgsql TỪ CHỐI kiểu đó với cột `timestamp with time zone` và ném
/// ArgumentException, nên endpoint trả về 400 kèm một lỗi hạ tầng khó hiểu chứ
/// không phải lỗi nghiệp vụ.
///
/// Hậu quả đã đo được trước khi sửa: mọi lời gọi tới /reports/financial-summary
/// và /reports/occupancy-rate có kèm ngày đều hỏng. Trang Báo cáo phía frontend
/// truyền ngày ở mọi lần mở, nên báo cáo doanh thu và tổng hợp theo tháng CHƯA
/// BAO GIỜ tải được.
///
/// Vá ở đây chứ không vá ở từng controller: có 12 tham số DateTime rải trên ba
/// controller, và endpoint mới viết sau này sẽ dính lại đúng lỗi đó.
///
/// QUY ƯỚC: giờ gửi lên được hiểu là GIỜ UTC.
///   - Chuỗi có "Z" hoặc offset (+07:00) → binder mặc định trả Kind=Utc hoặc
///     Local; Local được đổi sang UTC đúng theo offset.
///   - Chuỗi không có offset ("2026-09-01", "2026-09-01T10:00:00") → coi như đã
///     là UTC. Toàn bộ backend ghi bằng DateTime.UtcNow nên đây là cách hiểu
///     nhất quán với dữ liệu đang nằm trong DB.
/// </summary>
public class UtcDateTimeModelBinder : IModelBinder
{
    private readonly IModelBinder _inner;

    public UtcDateTimeModelBinder(IModelBinder inner)
    {
        _inner = inner;
    }

    public async Task BindModelAsync(ModelBindingContext bindingContext)
    {
        await _inner.BindModelAsync(bindingContext);

        if (!bindingContext.Result.IsModelSet || bindingContext.Result.Model is not DateTime value)
        {
            return;
        }

        var utc = value.Kind switch
        {
            DateTimeKind.Utc => value,
            // Có offset thật thì quy đổi cho đúng mốc thời gian.
            DateTimeKind.Local => value.ToUniversalTime(),
            // Không có offset: gắn nhãn UTC, KHÔNG dịch giờ.
            _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
        };

        bindingContext.Result = ModelBindingResult.Success(utc);
    }
}

/// <summary>
/// Cắm <see cref="UtcDateTimeModelBinder"/> vào trước binder mặc định cho
/// <c>DateTime</c> và <c>DateTime?</c>.
/// </summary>
public class UtcDateTimeModelBinderProvider : IModelBinderProvider
{
    public IModelBinder? GetBinder(ModelBinderProviderContext context)
    {
        ArgumentNullException.ThrowIfNull(context);

        var type = Nullable.GetUnderlyingType(context.Metadata.ModelType) ?? context.Metadata.ModelType;
        if (type != typeof(DateTime))
        {
            return null;
        }

        // Bọc binder mặc định thay vì tự phân tích chuỗi: giữ nguyên mọi định
        // dạng ngày mà ASP.NET vốn đã chấp nhận, chỉ sửa đúng phần Kind.
        var loggerFactory = context.Services.GetRequiredService<ILoggerFactory>();
        return new UtcDateTimeModelBinder(new SimpleTypeModelBinder(type, loggerFactory));
    }
}
