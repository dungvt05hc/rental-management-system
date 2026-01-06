namespace RentalManagement.Api.PaymentCore.Domain.Enums;

public enum PaymentMethodType
{
    Cash = 0,
    MoMo = 1,
    ZaloPay = 2,
    VNPay = 3,
    Visa = 4,
    Mastercard = 5,
    PayPal = 6,
    BankTransfer = 7,
    QRCode = 8
}

public enum PaymentIntentStatus
{
    Created = 0,           // Initial state
    RequiresAction = 1,    // Waiting for user action (redirect, QR scan)
    Processing = 2,        // Payment being processed by provider
    Succeeded = 3,         // Payment successful
    Failed = 4,            // Payment failed
    Cancelled = 5,         // Cancelled by user or expired
    RequiresCapture = 6    // Authorized but not captured (for card payments)
}

public enum TransactionStatus
{
    Pending = 0,
    Completed = 1,
    Failed = 2,
    Refunded = 3,
    PartiallyRefunded = 4
}

public enum TransactionType
{
    Payment = 0,
    Refund = 1,
    Capture = 2,
    Void = 3
}

public enum RefundStatus
{
    Pending = 0,
    Succeeded = 1,
    Failed = 2,
    Cancelled = 3
}

public enum RefundReason
{
    Duplicate = 0,
    Fraudulent = 1,
    RequestedByCustomer = 2,
    ServiceNotProvided = 3,
    Other = 99
}

public enum InvoiceStatus
{
    Draft = 0,
    Issued = 1,
    PartiallyPaid = 2,
    Paid = 3,
    Overdue = 4,
    Cancelled = 5,
    Refunded = 6
}

public enum PaymentProviderStatus
{
    Pending,
    Processing,
    Succeeded,
    Failed,
    Cancelled,
    RequiresAction
}

public enum RefundProviderStatus
{
    Pending,
    Succeeded,
    Failed,
    Cancelled
}
