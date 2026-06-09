namespace RoadHelp.Application.Interfaces;

public interface IS3Service
{
    Task<string> UploadAsync(string key, Stream fileStream, string contentType, bool isPublic = false);
    string GetPresignedUrl(string key, int expiresMinutes = 60);
    Task DeleteAsync(string key);
}
