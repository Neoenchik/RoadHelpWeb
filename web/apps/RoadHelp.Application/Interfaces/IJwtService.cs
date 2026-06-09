using System;

namespace RoadHelp.Application.Interfaces;

public interface IJwtService
{
    string GenerateAccessToken(Guid userId, string role);
    string GenerateRefreshToken();
}
