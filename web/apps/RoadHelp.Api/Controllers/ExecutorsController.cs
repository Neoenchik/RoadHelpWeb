using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RoadHelp.Api.Data;
using RoadHelp.Api.Dtos;
using RoadHelp.Api.Enums;
using RoadHelp.Api.Services;

namespace RoadHelp.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Route("api/executor")]
[Authorize(Roles = "EXECUTOR")]
public class ExecutorsController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IS3Service _s3;

    public ExecutorsController(ApplicationDbContext db, IS3Service s3)
    {
        _db = db;
        _s3 = s3;
    }

    [HttpGet("me")]
    public async Task<IActionResult> GetMe()
    {
        var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdString))
            return Unauthorized("Invalid token");

        var userId = Guid.Parse(userIdString);
        var profile = await _db.ExecutorProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
        if (profile == null)
        {
            profile = new RoadHelp.Api.Models.ExecutorProfile { UserId = userId };
            _db.ExecutorProfiles.Add(profile);
            await _db.SaveChangesAsync();
        }

        return Ok(new
        {
            online_status = profile.OnlineStatus.ToString(),
            verification_status = profile.VerificationStatus.ToString(),
            rating = profile.Rating,
            completed_count = profile.CompletedCount,
            service_types = profile.ServiceTypes,
            vehicle_make = profile.VehicleMake,
            vehicle_plate = profile.VehiclePlate
        });
    }

    [HttpPatch("me")]
    public async Task<IActionResult> UpdateMe([FromBody] UpdateExecutorMeDto dto)
    {
        var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdString))
            return Unauthorized("Invalid token");

        var userId = Guid.Parse(userIdString);
        var profile = await _db.ExecutorProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
        if (profile == null) return NotFound();

        if (dto.ServiceTypes != null)
            profile.ServiceTypes = dto.ServiceTypes;

        profile.VehicleMake = dto.VehicleMake;
        profile.VehiclePlate = dto.VehiclePlate;
        await _db.SaveChangesAsync();

        return Ok(new
        {
            service_types = profile.ServiceTypes,
            vehicle_make = profile.VehicleMake,
            vehicle_plate = profile.VehiclePlate,
            rating = profile.Rating,
            completed_count = profile.CompletedCount,
            verification_status = profile.VerificationStatus.ToString(),
            online_status = profile.OnlineStatus.ToString()
        });
    }

    [HttpPatch("me/status")]
    public async Task<IActionResult> UpdateStatus([FromBody] UpdateExecutorStatusDto dto)
    {
        var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdString))
            return Unauthorized("Invalid token");

        var userId = Guid.Parse(userIdString);
        var profile = await _db.ExecutorProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
        if (profile == null) return NotFound();

        if (!Enum.TryParse<ExecutorOnlineStatus>(dto.Status, out var status))
            return BadRequest("Invalid status");

        profile.OnlineStatus = status;
        await _db.SaveChangesAsync();
        return Ok(new { online_status = profile.OnlineStatus.ToString() });
    }

    [HttpPatch("me/location")]
    public async Task<IActionResult> UpdateLocation([FromBody] LocationUpdateDto dto)
    {
        var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdString))
            return Unauthorized("Invalid token");

        var userId = Guid.Parse(userIdString);
        var profile = await _db.ExecutorProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
        if (profile == null) return NotFound();

        profile.Lat = dto.Lat;
        profile.Lng = dto.Lng;
        profile.LocationUpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { lat = profile.Lat, lng = profile.Lng });
    }

    [HttpGet("orders/incoming")]
    public IActionResult GetIncomingOrder()
    {
        return Ok(null);
    }

    [HttpGet("orders/history")]
    public async Task<IActionResult> GetHistory()
    {
        var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdString))
            return Unauthorized("Invalid token");

        var userId = Guid.Parse(userIdString);
        var items = await _db.Orders
            .Where(o => o.ExecutorId == userId && o.Status == OrderStatus.COMPLETED)
            .OrderByDescending(o => o.CreatedAt)
            .Take(50)
            .Select(o => new
            {
                id = o.Id,
                service_type = o.ServiceType.ToString(),
                created_at = o.CreatedAt,
                address = o.Address,
                estimated_price = o.EstimatedPrice,
                final_price = o.FinalPrice
            })
            .ToListAsync();

        return Ok(new { items });
    }

    /// <summary>
    /// Загрузка документов исполнителя в S3 (приватно). Возвращает предподписанные URL для проверки загрузки.
    /// Принимает список файлов (картинки или PDF), проверяет размер и тип, сохраняет ключи в профиле исполнителя.
    /// </summary>
    /// <param name="files">Список файлов для загрузки (image/* или application/pdf)</param>
    /// <returns>Список предподписанных URL</returns>
    [HttpPost("me/documents")]
    public async Task<IActionResult> UploadDocuments(List<IFormFile> files)
    {
        if (files == null || files.Count == 0) return BadRequest("Files are empty");

        var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdString))
            return Unauthorized("Invalid token");

        var userId = Guid.Parse(userIdString);
        var profile = await _db.ExecutorProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
        if (profile == null) return NotFound();

        var uploadedKeys = new List<string>();

        foreach (var file in files)
        {
            if (file.Length > 10 * 1024 * 1024) return StatusCode(413, $"File {file.FileName} exceeds 10MB");
            if (!file.ContentType.StartsWith("image/") && file.ContentType != "application/pdf")
                return BadRequest($"Invalid file type for {file.FileName}");

            using var stream = file.OpenReadStream();
            var ext = Path.GetExtension(file.FileName);
            var key = $"documents/{userId}/{Guid.NewGuid()}{ext}";

            // Upload as private
            await _s3.UploadAsync(key, stream, file.ContentType, isPublic: false);
            profile.DocumentsUrl.Add(key);
            uploadedKeys.Add(key);
        }

        await _db.SaveChangesAsync();

        // Give them pre-signed URLs to verify
        var urls = uploadedKeys.Select(k => _s3.GetPresignedUrl(k)).ToList();
        return Ok(new { urls });
    }
}