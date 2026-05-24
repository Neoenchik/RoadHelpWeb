using System.Text.Json.Serialization;

namespace RoadHelp.Api.Dtos;

public class UpdateUserMeDto
{
    [JsonPropertyName("first_name")]
    public string? FirstName { get; set; }

    [JsonPropertyName("last_name")]
    public string? LastName { get; set; }

    [JsonPropertyName("role")]
    public string? Role { get; set; }
}

public class UpdateExecutorMeDto
{
    [JsonPropertyName("service_types")]
    public List<string>? ServiceTypes { get; set; }

    [JsonPropertyName("vehicle_make")]
    public string? VehicleMake { get; set; }

    [JsonPropertyName("vehicle_plate")]
    public string? VehiclePlate { get; set; }
}

public class UpdateExecutorStatusDto
{
    [JsonPropertyName("status")]
    public string Status { get; set; } = "OFFLINE";
}
