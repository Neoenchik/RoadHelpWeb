using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RoadHelp.Infrastructure.Data;
using RoadHelp.Application.Dtos;
using RoadHelp.Domain.Enums;
using RoadHelp.Domain.Entities;
using RoadHelp.Domain.Services;
using RoadHelp.Application.Interfaces;
using RoadHelp.Application.Services;

namespace RoadHelp.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IS3Service _s3;
    private readonly RoadHelp.Application.Interfaces.IJwtService _jwt;

    public UsersController(ApplicationDbContext db, IS3Service s3, RoadHelp.Application.Interfaces.IJwtService jwt)
    {
        _db = db;
        _s3 = s3;
        _jwt = jwt;
    }

    [HttpPatch("me")]
    public async Task<IActionResult> UpdateMe([FromBody] UpdateUserMeDto dto)
    {
        var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdString))
            return Unauthorized("Invalid token");

        var userId = Guid.Parse(userIdString);
        var user = await _db.Users
            .Include(u => u.ExecutorProfile)
            .FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null) return NotFound();

        if (!string.IsNullOrWhiteSpace(dto.FirstName))
        {
            user.FirstName = dto.FirstName.Trim();
        }

        user.LastName = string.IsNullOrWhiteSpace(dto.LastName) ? null : dto.LastName.Trim();

        if (!string.IsNullOrWhiteSpace(dto.Role) && Enum.TryParse<Role>(dto.Role, out var role))
        {
            user.Role = role;
            if (role == Role.EXECUTOR && user.ExecutorProfile == null)
            {
                _db.ExecutorProfiles.Add(new ExecutorProfile { User = user });
            }
        }

        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        var accessToken = _jwt.GenerateAccessToken(user.Id, user.Role.ToString());

        return Ok(new
        {
            access_token = accessToken,
            user = new
            {
                id = user.Id,
                phone = user.Phone,
                email = user.Email,
                first_name = user.FirstName,
                last_name = user.LastName,
                avatar_url = user.AvatarUrl,
                role = user.Role.ToString()
            }
        });
    }

    /// <summary>
    /// Загрузить и установить аватар пользователя. Проверяет сигнатуру файла, максимальный размер и сохраняет публичную ссылку в профиле.
    /// </summary>
    /// <param name="file">Файл изображения (JPEG/PNG)</param>
    /// <returns>Публичный URL загруженного аватара</returns>
    [HttpPost("me/avatar")]
    public async Task<IActionResult> UploadAvatar(IFormFile file)
    {
        if (file == null || file.Length == 0) return BadRequest("File is empty");
        if (file.Length > 5 * 1024 * 1024) return StatusCode(413, "Max size is 5MB");
        if (!file.ContentType.StartsWith("image/")) return BadRequest("Must be an image");

        // Validate magic bytes (simplified)
        using var stream = file.OpenReadStream();
        var header = new byte[4];
        await stream.ReadAsync(header, 0, 4);
        var isJpeg = header.SequenceEqual(new byte[] { 0xFF, 0xD8, 0xFF, 0xE0 }) || header.SequenceEqual(new byte[] { 0xFF, 0xD8, 0xFF, 0xE1 });
        var isPng = header.SequenceEqual(new byte[] { 0x89, 0x50, 0x4E, 0x47 });
        if (!isJpeg && !isPng) return BadRequest("Invalid file signature");

        var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdString))
            return Unauthorized("Invalid token");

        var userId = Guid.Parse(userIdString);
        var user = await _db.Users.FindAsync(userId);
        if (user == null) return NotFound();

        // Delete old avatar if exists (simplified key extraction)
        if (!string.IsNullOrEmpty(user.AvatarUrl) && user.AvatarUrl.Contains(".s3."))
        {
            var oldKey = new Uri(user.AvatarUrl).AbsolutePath.TrimStart('/');
            await _s3.DeleteAsync(oldKey);
        }

        var ext = Path.GetExtension(file.FileName);
        var newKey = $"avatars/{userId}/{Guid.NewGuid()}{ext}";

        // Reset stream position and upload
        stream.Position = 0;
        var publicUrl = await _s3.UploadAsync(newKey, stream, file.ContentType, isPublic: true);

        user.AvatarUrl = publicUrl;
        await _db.SaveChangesAsync();

        return Ok(new { url = publicUrl });
    }
}