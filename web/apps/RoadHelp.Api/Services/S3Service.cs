using System;
using System.IO;
using System.Threading.Tasks;
using Amazon.S3;
using Amazon.S3.Model;

namespace RoadHelp.Api.Services;

public interface IS3Service
{
    Task<string> UploadAsync(string key, Stream fileStream, string contentType, bool isPublic = false);
    string GetPresignedUrl(string key, int expiresMinutes = 60);
    Task DeleteAsync(string key);
}

public class S3Service : IS3Service
{
    private readonly IAmazonS3 _s3Client;
    private readonly string _bucketName = "roadhelp-bucket"; // Should come from config

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
        
        // Return public URL or private key
        return isPublic ? $"https://{_bucketName}.s3.amazonaws.com/{key}" : key;
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
        var request = new DeleteObjectRequest
        {
            BucketName = _bucketName,
            Key = key
        };
        await _s3Client.DeleteObjectAsync(request);
    }
}