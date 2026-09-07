# CLAUDE.md

## Dự án
Rental Management System — quản lý phòng cho thuê.
Backend .NET 9 Web API (EF Core + PostgreSQL), Frontend React 19 + Vite + Tailwind.

## Chạy local
./dev.sh                    # postgres + backend + frontend
./dev.sh reset              # tạo lại database
./dev.sh migration <Tên>    # tạo migration mới

Frontend: http://localhost:3000 · API: http://localhost:5152 · Postgres: 5433

## Quy ước

- **Secret không bao giờ vào repo.** Kể cả trong .md, .sh, comment. Dùng biến môi trường.
- **EF migrations phải được commit.** Thư mục Migrations/ là source code.
- **Không dùng `as any`, `@ts-ignore`, `@ts-expect-error`** để làm im lỗi type.
  Nếu type sai, sửa type. Nếu cần đổi contract API, hỏi trước.
- **Không nới lỏng tsconfig hoặc eslint config** để né lỗi.
- `npm run build` có typecheck. Build đỏ là không merge.
- Dùng `DateTime.UtcNow`, không dùng `DateTime.Now`.
- Exception xử lý ở ExceptionHandlerMiddleware, không try/catch catch-all trong controller.
- Không trả `ex.Message` về client.

## Cấu trúc
RentalManagementSystem/
├── Backend/RentalManagement.Api/
│   ├── Controllers/   → mỏng, chỉ validate + gọi service
│   ├── Services/      → toàn bộ business logic
│   ├── Data/          → DbContext, cấu hình entity
│   └── Models/        → Entities + DTOs
└── Frontend/src/
    ├── components/    → theo domain (invoices, rooms, tenants, …)
    ├── services/      → gọi API, một file một domain
    ├── contexts/      → Auth, Localization, Toast, Notification
    └── types/         → type dùng chung, phải khớp DTO backend

## Lưu ý
- App dùng pattern "Page" cho form (InvoiceFormPage), không dùng modal.
  Đừng thêm XxxDialog mới cho form.
- Phân quyền 3 role: Admin, Manager, Staff. Kiểm tra ở cả backend
  ([Authorize(Roles=...)]) và frontend (utils/accessControl.ts).
- Localization qua LocalizationContext + bảng Translations trong DB.