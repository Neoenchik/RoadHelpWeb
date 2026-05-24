using System;
using System.Text.Json.Serialization;

namespace RoadHelp.Api.Dtos;

/// <summary>
/// DTO для создания заказа: координаты, адрес и тип услуги.
/// </summary>
public class CreateOrderDto
{
    /// <summary>Широта</summary>
    [JsonPropertyName("lat")]
    public double Lat { get; set; }
    /// <summary>Долгота</summary>
    [JsonPropertyName("lng")]
    public double Lng { get; set; }
    /// <summary>Адрес места вызова</summary>
    [JsonPropertyName("address")]
    public string Address { get; set; } = string.Empty;
    /// <summary>Тип услуги (например, эвакуатор/ремонт)</summary>
    [JsonPropertyName("service_type")]
    public string ServiceType { get; set; } = string.Empty;
    /// <summary>Дополнительное описание</summary>
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