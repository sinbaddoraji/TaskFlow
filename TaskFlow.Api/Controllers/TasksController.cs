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
public class TasksController : BaseController
{
    private readonly ITaskRepository _taskRepository;
    private readonly IProjectRepository _projectRepository;
    private readonly IMapper _mapper;

    public TasksController(
        ITaskRepository taskRepository,
        IProjectRepository projectRepository,
        IMapper mapper,
        ILogger<TasksController> logger)
        : base(logger)
    {
        _taskRepository = taskRepository;
        _projectRepository = projectRepository;
        _mapper = mapper;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<PaginatedResponse<TaskDto>>>> GetTasks(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? status = null,
        [FromQuery] string? priority = null,
        [FromQuery] string? projectId = null,
        [FromQuery] string? search = null,
        [FromQuery] string[]? tags = null)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized(ApiResponse<PaginatedResponse<TaskDto>>.ErrorResult("User not authenticated"));

            var tasks = new List<TaskItem>();

            if (!string.IsNullOrEmpty(search))
            {
                tasks = await _taskRepository.SearchTasksAsync(userId, search);
            }
            else if (!string.IsNullOrEmpty(projectId))
            {
                tasks = await _taskRepository.GetTasksByProjectIdAsync(projectId);
                tasks = tasks.Where(t => t.AssignedUserId == userId).ToList();
            }
            else if (tags != null && tags.Length > 0)
            {
                tasks = await _taskRepository.GetTasksByTagsAsync(userId, tags.ToList());
            }
            else
            {
                tasks = await _taskRepository.GetTasksByUserIdAsync(userId);
            }

            // Apply filters
            if (!string.IsNullOrEmpty(status) && Enum.TryParse<Models.Entities.TaskStatus>(status, true, out var taskStatus))
            {
                tasks = tasks.Where(t => t.Status == taskStatus).ToList();
            }

            if (!string.IsNullOrEmpty(priority) && Enum.TryParse<TaskPriority>(priority, true, out var taskPriority))
            {
                tasks = tasks.Where(t => t.Priority == taskPriority).ToList();
            }

            // Apply pagination
            var totalCount = tasks.Count;
            var pagedTasks = tasks.Skip((page - 1) * pageSize).Take(pageSize).ToList();
            var taskDtos = _mapper.Map<List<TaskDto>>(pagedTasks);

            var paginatedResponse = new PaginatedResponse<TaskDto>
            {
                Items = taskDtos,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize
            };

            return Ok(ApiResponse<PaginatedResponse<TaskDto>>.SuccessResult(paginatedResponse));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving tasks");
            return StatusCode(500, ApiResponse<PaginatedResponse<TaskDto>>.ErrorResult("An error occurred while retrieving tasks"));
        }
    }

    [HttpGet("today")]
    public async Task<ActionResult<ApiResponse<List<TaskDto>>>> GetTodayTasks()
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized(ApiResponse<List<TaskDto>>.ErrorResult("User not authenticated"));

            var tasks = await _taskRepository.GetTodayTasksAsync(userId);
            var taskDtos = _mapper.Map<List<TaskDto>>(tasks);

            return Ok(ApiResponse<List<TaskDto>>.SuccessResult(taskDtos));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving today's tasks");
            return StatusCode(500, ApiResponse<List<TaskDto>>.ErrorResult("An error occurred while retrieving today's tasks"));
        }
    }

    [HttpGet("upcoming")]
    public async Task<ActionResult<ApiResponse<List<TaskDto>>>> GetUpcomingTasks([FromQuery] int days = 7)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized(ApiResponse<List<TaskDto>>.ErrorResult("User not authenticated"));

            var tasks = await _taskRepository.GetUpcomingTasksAsync(userId, days);
            var taskDtos = _mapper.Map<List<TaskDto>>(tasks);

            return Ok(ApiResponse<List<TaskDto>>.SuccessResult(taskDtos));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving upcoming tasks");
            return StatusCode(500, ApiResponse<List<TaskDto>>.ErrorResult("An error occurred while retrieving upcoming tasks"));
        }
    }

    [HttpGet("timeline")]
    public async Task<ActionResult<ApiResponse<TaskTimelineDto>>> GetTaskTimeline([FromQuery] int days = 7)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized(ApiResponse<TaskTimelineDto>.ErrorResult("User not authenticated"));

            var todayTasks = await _taskRepository.GetTodayTasksAsync(userId);
            var upcomingTasks = await _taskRepository.GetUpcomingTasksAsync(userId, days);

            var timeline = new TaskTimelineDto
            {
                TodayTasks = _mapper.Map<List<TaskDto>>(todayTasks),
                UpcomingTasks = _mapper.Map<List<TaskDto>>(upcomingTasks)
            };

            return Ok(ApiResponse<TaskTimelineDto>.SuccessResult(timeline));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving task timeline");
            return StatusCode(500, ApiResponse<TaskTimelineDto>.ErrorResult("An error occurred while retrieving task timeline"));
        }
    }

    [HttpGet("overdue")]
    public async Task<ActionResult<ApiResponse<List<TaskDto>>>> GetOverdueTasks()
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized(ApiResponse<List<TaskDto>>.ErrorResult("User not authenticated"));

            var tasks = await _taskRepository.GetOverdueTasksAsync(userId);
            var taskDtos = _mapper.Map<List<TaskDto>>(tasks);

            return Ok(ApiResponse<List<TaskDto>>.SuccessResult(taskDtos));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving overdue tasks");
            return StatusCode(500, ApiResponse<List<TaskDto>>.ErrorResult("An error occurred while retrieving overdue tasks"));
        }
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<TaskDto>>> GetTask(string id)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized(ApiResponse<TaskDto>.ErrorResult("User not authenticated"));

            var task = await _taskRepository.GetByIdAsync(id);
            if (task == null)
                return NotFound(ApiResponse<TaskDto>.ErrorResult("Task not found"));

            if (task.AssignedUserId != userId)
                return Forbid();

            var taskDto = _mapper.Map<TaskDto>(task);
            return Ok(ApiResponse<TaskDto>.SuccessResult(taskDto));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving task {TaskId}", id);
            return StatusCode(500, ApiResponse<TaskDto>.ErrorResult("An error occurred while retrieving the task"));
        }
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<TaskDto>>> CreateTask(CreateTaskRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized(ApiResponse<TaskDto>.ErrorResult("User not authenticated"));

            var task = _mapper.Map<TaskItem>(request);
            task.AssignedUserId = request.AssignedUserId ?? userId;
            task.CreatedById = userId;

            var createdTask = await _taskRepository.CreateAsync(task);
            var taskDto = _mapper.Map<TaskDto>(createdTask);

            return CreatedAtAction(nameof(GetTask), new { id = createdTask.Id }, 
                ApiResponse<TaskDto>.SuccessResult(taskDto, "Task created successfully"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating task");
            return StatusCode(500, ApiResponse<TaskDto>.ErrorResult("An error occurred while creating the task"));
        }
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ApiResponse<TaskDto>>> UpdateTask(string id, CreateTaskRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized(ApiResponse<TaskDto>.ErrorResult("User not authenticated"));

            var existingTask = await _taskRepository.GetByIdAsync(id);
            if (existingTask == null)
                return NotFound(ApiResponse<TaskDto>.ErrorResult("Task not found"));

            if (existingTask.AssignedUserId != userId)
                return Forbid();

            // Map the request to the existing task
            _mapper.Map(request, existingTask);
            existingTask.UpdatedAt = DateTime.UtcNow;

            var updatedTask = await _taskRepository.UpdateAsync(id, existingTask);
            var taskDto = _mapper.Map<TaskDto>(updatedTask);

            return Ok(ApiResponse<TaskDto>.SuccessResult(taskDto, "Task updated successfully"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating task {TaskId}", id);
            return StatusCode(500, ApiResponse<TaskDto>.ErrorResult("An error occurred while updating the task"));
        }
    }

    [HttpPatch("{id}/complete")]
    public async Task<ActionResult<ApiResponse<TaskDto>>> CompleteTask(string id)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized(ApiResponse<TaskDto>.ErrorResult("User not authenticated"));

            var task = await _taskRepository.GetByIdAsync(id);
            if (task == null)
                return NotFound(ApiResponse<TaskDto>.ErrorResult("Task not found"));

            if (task.AssignedUserId != userId)
                return Forbid();

            task.Status = Models.Entities.TaskStatus.Completed;
            task.CompletedAt = DateTime.UtcNow;
            task.UpdatedAt = DateTime.UtcNow;

            var updatedTask = await _taskRepository.UpdateAsync(id, task);
            var taskDto = _mapper.Map<TaskDto>(updatedTask);

            return Ok(ApiResponse<TaskDto>.SuccessResult(taskDto, "Task completed successfully"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error completing task {TaskId}", id);
            return StatusCode(500, ApiResponse<TaskDto>.ErrorResult("An error occurred while completing the task"));
        }
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteTask(string id)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized(ApiResponse<bool>.ErrorResult("User not authenticated"));

            var task = await _taskRepository.GetByIdAsync(id);
            if (task == null)
                return NotFound(ApiResponse<bool>.ErrorResult("Task not found"));

            if (task.AssignedUserId != userId)
                return Forbid();

            var deleted = await _taskRepository.DeleteAsync(id);
            return Ok(ApiResponse<bool>.SuccessResult(deleted, "Task deleted successfully"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting task {TaskId}", id);
            return StatusCode(500, ApiResponse<bool>.ErrorResult("An error occurred while deleting the task"));
        }
    }
}