using System;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace RoadHelp.Api.Dtos;

public class UploadDocumentDto
{
    [Required]
    public IFormFile File { get; set; } = null!;
}