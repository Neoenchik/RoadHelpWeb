namespace RoadHelp.Application.Dtos;

public class UploadDocumentDto
{
    public string FileName { get; set; } = string.Empty;
}

public record BroadcastDto(string Title, string Message, string? Role = null);
