namespace RoadHelp.Application.Interfaces;

public interface IRefreshTokenStore
{
    Task StoreAsync(string refreshToken, Guid userId, TimeSpan ttl);
    Task<Guid?> ValidateAsync(string refreshToken);
    Task RevokeAsync(string refreshToken);
}
