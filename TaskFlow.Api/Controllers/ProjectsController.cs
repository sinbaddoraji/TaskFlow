using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using AutoMapper;
using TaskFlow.Api.Models.DTOs;
using TaskFlow.Api.Models.Entities;
using TaskFlow.Api.Models.Requests;
using TaskFlow.Api.Models.Responses;
using TaskFlow.Api.Repositories.Interfaces;

namespace TaskFlow.Api.Controllers;

[Authorize]
[Route("api/v1/[controller]")]
public class ProjectsController(
    IProjectRepository projectRepository,
    IMapper mapper,
    ILogger<ProjectsController> logger)
    : BaseController(logger)
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<ProjectDto>>>> GetProjects()
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized(ApiResponse<List<ProjectDto>>.ErrorResult("User not authenticated"));

            var projects = await projectRepository.GetProjectsByUserIdAsync(userId);
            var projectDtos = mapper.Map<List<ProjectDto>>(projects);

            return Ok(ApiResponse<List<ProjectDto>>.SuccessResult(projectDtos));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving projects");
            return StatusCode(500, ApiResponse<List<ProjectDto>>.ErrorResult("An error occurred while retrieving projects"));
        }
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<ProjectDto>>> GetProject(string id)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized(ApiResponse<ProjectDto>.ErrorResult("User not authenticated"));

            var project = await projectRepository.GetByIdAsync(id);
            if (project == null)
                return NotFound(ApiResponse<ProjectDto>.ErrorResult("Project not found"));

            // Check if user has access to this project
            if (project.OwnerId != userId && !project.Members.Any(m => m.UserId == userId))
                return Forbid();

            var projectDto = mapper.Map<ProjectDto>(project);
            return Ok(ApiResponse<ProjectDto>.SuccessResult(projectDto));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving project {ProjectId}", id);
            return StatusCode(500, ApiResponse<ProjectDto>.ErrorResult("An error occurred while retrieving the project"));
        }
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<ProjectDto>>> CreateProject(CreateProjectRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized(ApiResponse<ProjectDto>.ErrorResult("User not authenticated"));

            var project = mapper.Map<Project>(request);
            project.OwnerId = userId;
            project.CreatedAt = DateTime.UtcNow;
            project.UpdatedAt = DateTime.UtcNow;

            var createdProject = await projectRepository.CreateAsync(project);
            var projectDto = mapper.Map<ProjectDto>(createdProject);

            return CreatedAtAction(nameof(GetProject), new { id = createdProject.Id },
                ApiResponse<ProjectDto>.SuccessResult(projectDto, "Project created successfully"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating project");
            return StatusCode(500, ApiResponse<ProjectDto>.ErrorResult("An error occurred while creating the project"));
        }
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ApiResponse<ProjectDto>>> UpdateProject(string id, UpdateProjectRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized(ApiResponse<ProjectDto>.ErrorResult("User not authenticated"));

            var existingProject = await projectRepository.GetByIdAsync(id);
            if (existingProject == null)
                return NotFound(ApiResponse<ProjectDto>.ErrorResult("Project not found"));

            if (existingProject.OwnerId != userId)
                return Forbid();

            // Selectively update only the provided fields
            mapper.Map(request, existingProject);
            
            // Always update the timestamp
            existingProject.UpdatedAt = DateTime.UtcNow;

            var updatedProject = await projectRepository.UpdateAsync(id, existingProject);
            var projectDto = mapper.Map<ProjectDto>(updatedProject);

            return Ok(ApiResponse<ProjectDto>.SuccessResult(projectDto, "Project updated successfully"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating project {ProjectId}", id);
            return StatusCode(500, ApiResponse<ProjectDto>.ErrorResult("An error occurred while updating the project"));
        }
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteProject(string id)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized(ApiResponse<bool>.ErrorResult("User not authenticated"));

            var project = await projectRepository.GetByIdAsync(id);
            if (project == null)
                return NotFound(ApiResponse<bool>.ErrorResult("Project not found"));

            if (project.OwnerId != userId)
                return Forbid();

            var deleted = await projectRepository.DeleteAsync(id);
            return Ok(ApiResponse<bool>.SuccessResult(deleted, "Project deleted successfully"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting project {ProjectId}", id);
            return StatusCode(500, ApiResponse<bool>.ErrorResult("An error occurred while deleting the project"));
        }
    }

    [HttpPost("{projectId}/members")]
    public async Task<ActionResult<ApiResponse<ProjectMemberDto>>> AddMember(string projectId, AddProjectMemberRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized(ApiResponse<ProjectMemberDto>.ErrorResult("User not authenticated"));

            var project = await projectRepository.GetByIdAsync(projectId);
            if (project == null)
                return NotFound(ApiResponse<ProjectMemberDto>.ErrorResult("Project not found"));

            if (project.OwnerId != userId)
                return Forbid();

            var member = new ProjectMember
            {
                UserId = request.UserId,
                Role = request.Role,
                JoinedAt = DateTime.UtcNow
            };

            project.Members.Add(member);
            project.UpdatedAt = DateTime.UtcNow;

            await projectRepository.UpdateAsync(projectId, project);
            var memberDto = mapper.Map<ProjectMemberDto>(member);

            return Ok(ApiResponse<ProjectMemberDto>.SuccessResult(memberDto, "Member added successfully"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding member to project {ProjectId}", projectId);
            return StatusCode(500, ApiResponse<ProjectMemberDto>.ErrorResult("An error occurred while adding the member"));
        }
    }

    [HttpDelete("{projectId}/members/{userId}")]
    public async Task<ActionResult<ApiResponse<bool>>> RemoveMember(string projectId, string userId)
    {
        try
        {
            var currentUserId = GetCurrentUserId();
            if (currentUserId == null)
                return Unauthorized(ApiResponse<bool>.ErrorResult("User not authenticated"));

            var project = await projectRepository.GetByIdAsync(projectId);
            if (project == null)
                return NotFound(ApiResponse<bool>.ErrorResult("Project not found"));

            if (project.OwnerId != currentUserId)
                return Forbid();

            var memberRemoved = project.Members.RemoveAll(m => m.UserId == userId) > 0;
            if (!memberRemoved)
                return NotFound(ApiResponse<bool>.ErrorResult("Member not found"));

            project.UpdatedAt = DateTime.UtcNow;
            await projectRepository.UpdateAsync(projectId, project);

            return Ok(ApiResponse<bool>.SuccessResult(true, "Member removed successfully"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error removing member {UserId} from project {ProjectId}", userId, projectId);
            return StatusCode(500, ApiResponse<bool>.ErrorResult("An error occurred while removing the member"));
        }
    }

    [HttpPut("{projectId}/members/{userId}")]
    public async Task<ActionResult<ApiResponse<ProjectMemberDto>>> UpdateMemberRole(string projectId, string userId, UpdateProjectMemberRoleRequest request)
    {
        try
        {
            var currentUserId = GetCurrentUserId();
            if (currentUserId == null)
                return Unauthorized(ApiResponse<ProjectMemberDto>.ErrorResult("User not authenticated"));

            var project = await projectRepository.GetByIdAsync(projectId);
            if (project == null)
                return NotFound(ApiResponse<ProjectMemberDto>.ErrorResult("Project not found"));

            if (project.OwnerId != currentUserId)
                return Forbid();

            var member = project.Members.FirstOrDefault(m => m.UserId == userId);
            if (member == null)
                return NotFound(ApiResponse<ProjectMemberDto>.ErrorResult("Member not found"));

            member.Role = request.Role;
            project.UpdatedAt = DateTime.UtcNow;

            await projectRepository.UpdateAsync(projectId, project);
            var memberDto = mapper.Map<ProjectMemberDto>(member);

            return Ok(ApiResponse<ProjectMemberDto>.SuccessResult(memberDto, "Member role updated successfully"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating member role for {UserId} in project {ProjectId}", userId, projectId);
            return StatusCode(500, ApiResponse<ProjectMemberDto>.ErrorResult("An error occurred while updating the member role"));
        }
    }
}