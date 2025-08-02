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
public class ProjectsController : BaseController
{
    private readonly IProjectRepository _projectRepository;
    private readonly ITaskRepository _taskRepository;
    private readonly IUserRepository _userRepository;
    private readonly IMapper _mapper;

    public ProjectsController(
        IProjectRepository projectRepository,
        ITaskRepository taskRepository,
        IUserRepository userRepository,
        IMapper mapper,
        ILogger<ProjectsController> logger)
        : base(logger)
    {
        _projectRepository = projectRepository;
        _taskRepository = taskRepository;
        _userRepository = userRepository;
        _mapper = mapper;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<ProjectDto>>>> GetProjects([FromQuery] bool includeArchived = false)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized(ApiResponse<List<ProjectDto>>.ErrorResult("User not authenticated"));

            var projects = await _projectRepository.GetProjectsByUserIdAsync(userId);
            
            if (!includeArchived)
            {
                projects = projects.Where(p => !p.IsArchived).ToList();
            }

            var projectDtos = new List<ProjectDto>();
            
            foreach (var project in projects)
            {
                var projectDto = _mapper.Map<ProjectDto>(project);
                
                // Get task count for the project
                var projectTasks = await _taskRepository.GetTasksByProjectIdAsync(project.Id);
                projectDto.TaskCount = projectTasks.Count;
                
                // Get owner name
                if (!string.IsNullOrEmpty(project.OwnerId))
                {
                    var owner = await _userRepository.GetByIdAsync(project.OwnerId);
                    projectDto.OwnerName = owner?.Name;
                }

                projectDtos.Add(projectDto);
            }

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

            var project = await _projectRepository.GetByIdAsync(id);
            if (project == null)
                return NotFound(ApiResponse<ProjectDto>.ErrorResult("Project not found"));

            // Check if user has access to the project
            if (!await _projectRepository.IsUserMemberOfProjectAsync(id, userId))
                return Forbid();

            var projectDto = _mapper.Map<ProjectDto>(project);
            
            // Get task count for the project
            var projectTasks = await _taskRepository.GetTasksByProjectIdAsync(project.Id);
            projectDto.TaskCount = projectTasks.Count;
            
            // Get owner name
            if (!string.IsNullOrEmpty(project.OwnerId))
            {
                var owner = await _userRepository.GetByIdAsync(project.OwnerId);
                projectDto.OwnerName = owner?.Name;
            }

            // Get member details
            foreach (var memberDto in projectDto.Members)
            {
                var user = await _userRepository.GetByIdAsync(memberDto.UserId);
                if (user != null)
                {
                    memberDto.UserName = user.Name;
                    memberDto.UserEmail = user.Email;
                }
            }

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

            var project = _mapper.Map<Project>(request);
            project.OwnerId = userId;

            var createdProject = await _projectRepository.CreateAsync(project);
            var projectDto = _mapper.Map<ProjectDto>(createdProject);
            projectDto.TaskCount = 0;

            // Get owner name
            var owner = await _userRepository.GetByIdAsync(userId);
            projectDto.OwnerName = owner?.Name;

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
    public async Task<ActionResult<ApiResponse<ProjectDto>>> UpdateProject(string id, CreateProjectRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized(ApiResponse<ProjectDto>.ErrorResult("User not authenticated"));

            var existingProject = await _projectRepository.GetByIdAsync(id);
            if (existingProject == null)
                return NotFound(ApiResponse<ProjectDto>.ErrorResult("Project not found"));

            // Check if user is the owner or admin
            if (existingProject.OwnerId != userId && 
                !existingProject.Members.Any(m => m.UserId == userId && m.Role == ProjectRole.Admin))
                return Forbid();

            // Map the request to the existing project
            _mapper.Map(request, existingProject);
            existingProject.UpdatedAt = DateTime.UtcNow;

            var updatedProject = await _projectRepository.UpdateAsync(id, existingProject);
            var projectDto = _mapper.Map<ProjectDto>(updatedProject);

            // Get task count
            var projectTasks = await _taskRepository.GetTasksByProjectIdAsync(updatedProject.Id);
            projectDto.TaskCount = projectTasks.Count;

            return Ok(ApiResponse<ProjectDto>.SuccessResult(projectDto, "Project updated successfully"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating project {ProjectId}", id);
            return StatusCode(500, ApiResponse<ProjectDto>.ErrorResult("An error occurred while updating the project"));
        }
    }

    [HttpPatch("{id}/archive")]
    public async Task<ActionResult<ApiResponse<ProjectDto>>> ArchiveProject(string id)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized(ApiResponse<ProjectDto>.ErrorResult("User not authenticated"));

            var project = await _projectRepository.GetByIdAsync(id);
            if (project == null)
                return NotFound(ApiResponse<ProjectDto>.ErrorResult("Project not found"));

            if (project.OwnerId != userId)
                return Forbid();

            project.IsArchived = true;
            project.UpdatedAt = DateTime.UtcNow;

            var updatedProject = await _projectRepository.UpdateAsync(id, project);
            var projectDto = _mapper.Map<ProjectDto>(updatedProject);

            return Ok(ApiResponse<ProjectDto>.SuccessResult(projectDto, "Project archived successfully"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error archiving project {ProjectId}", id);
            return StatusCode(500, ApiResponse<ProjectDto>.ErrorResult("An error occurred while archiving the project"));
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

            var project = await _projectRepository.GetByIdAsync(id);
            if (project == null)
                return NotFound(ApiResponse<bool>.ErrorResult("Project not found"));

            if (project.OwnerId != userId)
                return Forbid();

            var deleted = await _projectRepository.DeleteAsync(id);
            return Ok(ApiResponse<bool>.SuccessResult(deleted, "Project deleted successfully"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting project {ProjectId}", id);
            return StatusCode(500, ApiResponse<bool>.ErrorResult("An error occurred while deleting the project"));
        }
    }

    [HttpGet("{id}/tasks")]
    public async Task<ActionResult<ApiResponse<List<TaskDto>>>> GetProjectTasks(string id)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized(ApiResponse<List<TaskDto>>.ErrorResult("User not authenticated"));

            if (!await _projectRepository.IsUserMemberOfProjectAsync(id, userId))
                return Forbid();

            var tasks = await _taskRepository.GetTasksByProjectIdAsync(id);
            var taskDtos = _mapper.Map<List<TaskDto>>(tasks);

            return Ok(ApiResponse<List<TaskDto>>.SuccessResult(taskDtos));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving tasks for project {ProjectId}", id);
            return StatusCode(500, ApiResponse<List<TaskDto>>.ErrorResult("An error occurred while retrieving project tasks"));
        }
    }
}