using RoadHelp.Application.Interfaces;

namespace RoadHelp.Infrastructure.Payment;

public class MockPaymentProvider : IPaymentProvider
{
    public Task<string> AttachCardAsync(string returnUrl)
    {
        return Task.FromResult($"mock_intent_{Guid.NewGuid()}");
    }

    public Task<bool> ConfirmAttachAsync(string intentId)
    {
        return Task.FromResult(true);
    }

    public Task<bool> ChargeAsync(string providerToken, decimal amount, string idempotencyKey)
    {
        Console.WriteLine($"[MockPayment] Charged {amount} using token {providerToken} for order {idempotencyKey}");
        return Task.FromResult(true);
    }

    public Task RefundAsync(string transactionId, decimal amount)
    {
        Console.WriteLine($"[MockPayment] Refunded {amount} for tx {transactionId}");
        return Task.CompletedTask;
    }
}
