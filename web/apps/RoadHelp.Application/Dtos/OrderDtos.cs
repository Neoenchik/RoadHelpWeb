using System.Text.Json.Serialization;

namespace RoadHelp.Application.Dtos;

public class CreateOrderDto
{
    [JsonPropertyName("lat")]
    public double Lat { get; set; }
    [JsonPropertyName("lng")]
    public double Lng { get; set; }
    [JsonPropertyName("address")]
    public string Address { get; set; } = string.Empty;
    [JsonPropertyName("service_type")]
    public string ServiceType { get; set; } = string.Empty;
    [JsonPropertyName("description")]
    public string? Description { get; set; }
}

public class LocationUpdateDto
{
    [JsonPropertyName("lat")]
    public double Lat { get; set; }
    [JsonPropertyName("lng")]
    public double Lng { get; set; }
}

public class CancelOrderDto
{
    [JsonPropertyName("reason")]
    public string Reason { get; set; } = string.Empty;
}

public class SelectExecutorDto
{
    [JsonPropertyName("executor_id")]
    public Guid ExecutorId { get; set; }
}

public class ReviewOrderDto
{
    [JsonPropertyName("score")]
    public int Score { get; set; }
    [JsonPropertyName("comment")]
    public string? Comment { get; set; }
}

public class DisputeResolutionDto
{
    [JsonPropertyName("resolution")]
    public string Resolution { get; set; } = string.Empty;
    [JsonPropertyName("note")]
    public string? Note { get; set; }
}

public class PushSubscribeDto
{
    [JsonPropertyName("endpoint")]
    public string Endpoint { get; set; } = string.Empty;
    [JsonPropertyName("keys")]
    public PushKeysDto Keys { get; set; } = new();
}

public class PushKeysDto
{
    [JsonPropertyName("p256dh")]
    public string P256dh { get; set; } = string.Empty;
    [JsonPropertyName("auth")]
    public string Auth { get; set; } = string.Empty;
}

public class CreateInviteDto
{
    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;
    [JsonPropertyName("role")]
    public string Role { get; set; } = "OPERATOR";
}

public class UpdateUserRoleDto
{
    [JsonPropertyName("role")]
    public string Role { get; set; } = string.Empty;
}

public class UpdateExecutorStatusDto
{
    [JsonPropertyName("verification_status")]
    public string VerificationStatus { get; set; } = string.Empty;
    [JsonPropertyName("reason")]
    public string? Reason { get; set; }
}
