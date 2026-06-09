using Amazon.S3;
using Amazon.S3.Model;
using RoadHelp.Application.Interfaces;

namespace RoadHelp.Infrastructure.Services;

public class S3Service : IS3Service
{
    private readonly IAmazonS3 _s3Client;
    private readonly string _bucketName = "roadhelp";

    public S3Service(IAmazonS3 s3Client)
    {
        _s3Client = s3Client;
    }

    public async Task<string> UploadAsync(string key, Stream fileStream, string contentType, bool isPublic = false)
    {
        var request = new PutObjectRequest
        {
            BucketName = _bucketName,
            Key = key,
            InputStream = fileStream,
            ContentType = contentType,
            CannedACL = isPublic ? S3CannedACL.PublicRead : S3CannedACL.Private
        };

        await _s3Client.PutObjectAsync(request);
        return isPublic ? $"{key}" : key;
    }

    public string GetPresignedUrl(string key, int expiresMinutes = 60)
    {
        var request = new GetPreSignedUrlRequest
        {
            BucketName = _bucketName,
            Key = key,
            Expires = DateTime.UtcNow.AddMinutes(expiresMinutes)
        };
        return _s3Client.GetPreSignedURL(request);
    }

    public async Task DeleteAsync(string key)
    {
        await _s3Client.DeleteObjectAsync(new DeleteObjectRequest
        {
            BucketName = _bucketName,
            Key = key
        });
    }
}
