namespace RoadHelp.Application.Interfaces;

public interface IPaymentProvider
{
    Task<string> AttachCardAsync(string returnUrl);
    Task<bool> ConfirmAttachAsync(string intentId);
    Task<bool> ChargeAsync(string providerToken, decimal amount, string idempotencyKey);
    Task RefundAsync(string transactionId, decimal amount);
}
