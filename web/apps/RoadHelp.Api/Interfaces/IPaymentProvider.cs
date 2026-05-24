using System;
using System.Threading.Tasks;

namespace RoadHelp.Api.Interfaces;

public interface IPaymentProvider
{
    Task<string> AttachCardAsync(string returnUrl);
    Task<bool> ConfirmAttachAsync(string intentId);
    Task<bool> ChargeAsync(string providerToken, decimal amount, string idempotencyKey);
    Task RefundAsync(string transactionId, decimal amount);
}

// Mock Implementation for Development (Task B2)
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
        // Mock success always
        Console.WriteLine($"[MockPayment] Charged {amount} using token {providerToken} for order {idempotencyKey}");
        return Task.FromResult(true);
    }

    public Task RefundAsync(string transactionId, decimal amount)
    {
        Console.WriteLine($"[MockPayment] Refunded {amount} for tx {transactionId}");
        return Task.CompletedTask;
    }
}