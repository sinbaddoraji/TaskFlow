using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using AutoMapper;
using TaskFlow.Api.Models.DTOs;
using TaskFlow.Api.Models.Entities;
using TaskFlow.Api.Models.Requests;
using TaskFlow.Api.Models.Responses;
using TaskFlow.Api.Repositories.Interfaces;
using MongoDB.Bson;

namespace TaskFlow.Api.Controllers;

[Authorize]
[Route("api/v1/[controller]")]
public class TasksController : BaseController
{
    private readonly ITaskRepository _taskRepository;
    private readonly IProjectRepository _projectRepository;
    private readonly IUserRepository _userRepository;
    private readonly IMapper _mapper;

    public TasksController(
        ITaskRepository taskRepository,
        IProjectRepository projectRepository,
        IUserRepository userRepository,
        IMapper mapper,
        ILogger<TasksController> logger)
        : base(logger)
    {
        _taskRepository = taskRepository;
        _projectRepository = projectRepository;
        _userRepository = userRepository;
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

    [HttpPatch("{id}/status")]
    public async Task<ActionResult<ApiResponse<TaskDto>>> UpdateTaskStatus(string id, [FromBody] UpdateTaskStatusRequest request)
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

            if (!Enum.TryParse<Models.Entities.TaskStatus>(request.Status, true, out var newStatus))
                return BadRequest(ApiResponse<TaskDto>.ErrorResult("Invalid status value"));

            var oldStatus = task.Status;
            task.Status = newStatus;
            task.UpdatedAt = DateTime.UtcNow;

            // Handle status-specific logic
            if (newStatus == Models.Entities.TaskStatus.Completed && oldStatus != Models.Entities.TaskStatus.Completed)
            {
                task.CompletedAt = DateTime.UtcNow;
            }
            else if (newStatus != Models.Entities.TaskStatus.Completed && oldStatus == Models.Entities.TaskStatus.Completed)
            {
                task.CompletedAt = null;
            }

            var updatedTask = await _taskRepository.UpdateAsync(id, task);
            var taskDto = _mapper.Map<TaskDto>(updatedTask);

            return Ok(ApiResponse<TaskDto>.SuccessResult(taskDto, $"Task status updated to {newStatus} successfully"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating task status {TaskId}", id);
            return StatusCode(500, ApiResponse<TaskDto>.ErrorResult("An error occurred while updating the task status"));
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

    [HttpGet("calendar/{year:int}/{month:int}")]
    public async Task<ActionResult<ApiResponse<List<TaskDto>>>> GetTasksByMonth(int year, int month)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized(ApiResponse<List<TaskDto>>.ErrorResult("User not authenticated"));

            if (month < 1 || month > 12)
                return BadRequest(ApiResponse<List<TaskDto>>.ErrorResult("Invalid month value"));

            var tasks = await _taskRepository.GetTasksByMonthAsync(userId, year, month);
            var taskDtos = _mapper.Map<List<TaskDto>>(tasks);

            return Ok(ApiResponse<List<TaskDto>>.SuccessResult(taskDtos));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving tasks for {Year}-{Month}", year, month);
            return StatusCode(500, ApiResponse<List<TaskDto>>.ErrorResult("An error occurred while retrieving tasks"));
        }
    }

    [HttpGet("calendar/week")]
    public async Task<ActionResult<ApiResponse<List<TaskDto>>>> GetTasksByWeek([FromQuery] string startDate)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized(ApiResponse<List<TaskDto>>.ErrorResult("User not authenticated"));

            if (!DateTime.TryParse(startDate, out var parsedStartDate))
                return BadRequest(ApiResponse<List<TaskDto>>.ErrorResult("Invalid start date format"));

            var tasks = await _taskRepository.GetTasksByWeekAsync(userId, parsedStartDate.Date);
            var taskDtos = _mapper.Map<List<TaskDto>>(tasks);

            return Ok(ApiResponse<List<TaskDto>>.SuccessResult(taskDtos));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving tasks for week starting {StartDate}", startDate);
            return StatusCode(500, ApiResponse<List<TaskDto>>.ErrorResult("An error occurred while retrieving tasks"));
        }
    }

    [HttpGet("calendar/range")]
    public async Task<ActionResult<ApiResponse<List<TaskDto>>>> GetTasksByDateRange(
        [FromQuery] string startDate,
        [FromQuery] string endDate)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized(ApiResponse<List<TaskDto>>.ErrorResult("User not authenticated"));

            if (!DateTime.TryParse(startDate, out var parsedStartDate))
                return BadRequest(ApiResponse<List<TaskDto>>.ErrorResult("Invalid start date format"));

            if (!DateTime.TryParse(endDate, out var parsedEndDate))
                return BadRequest(ApiResponse<List<TaskDto>>.ErrorResult("Invalid end date format"));

            var tasks = await _taskRepository.GetTasksByDateRangeAsync(userId, parsedStartDate.Date, parsedEndDate.Date);
            var taskDtos = _mapper.Map<List<TaskDto>>(tasks);

            return Ok(ApiResponse<List<TaskDto>>.SuccessResult(taskDtos));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving tasks for date range {StartDate} to {EndDate}", startDate, endDate);
            return StatusCode(500, ApiResponse<List<TaskDto>>.ErrorResult("An error occurred while retrieving tasks"));
        }
    }

    // Subtask Management Endpoints
    [HttpPost("{taskId}/subtasks")]
    public async Task<ActionResult<ApiResponse<SubTaskDto>>> AddSubtask(string taskId, CreateSubtaskRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized(ApiResponse<SubTaskDto>.ErrorResult("User not authenticated"));

            var task = await _taskRepository.GetByIdAsync(taskId);
            if (task == null)
                return NotFound(ApiResponse<SubTaskDto>.ErrorResult("Task not found"));

            if (task.AssignedUserId != userId)
                return Forbid();

            var subtask = new SubTask
            {
                Id = ObjectId.GenerateNewId().ToString(),
                Title = request.Title,
                Completed = false,
                CreatedAt = DateTime.UtcNow
            };

            task.Subtasks.Add(subtask);
            task.UpdatedAt = DateTime.UtcNow;

            await _taskRepository.UpdateAsync(taskId, task);
            var subtaskDto = _mapper.Map<SubTaskDto>(subtask);

            return Ok(ApiResponse<SubTaskDto>.SuccessResult(subtaskDto, "Subtask added successfully"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding subtask to task {TaskId}", taskId);
            return StatusCode(500, ApiResponse<SubTaskDto>.ErrorResult("An error occurred while adding the subtask"));
        }
    }

    [HttpPut("{taskId}/subtasks/{subtaskId}")]
    public async Task<ActionResult<ApiResponse<SubTaskDto>>> UpdateSubtask(string taskId, string subtaskId, UpdateSubtaskRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized(ApiResponse<SubTaskDto>.ErrorResult("User not authenticated"));

            var task = await _taskRepository.GetByIdAsync(taskId);
            if (task == null)
                return NotFound(ApiResponse<SubTaskDto>.ErrorResult("Task not found"));

            if (task.AssignedUserId != userId)
                return Forbid();

            var subtask = task.Subtasks.FirstOrDefault(s => s.Id == subtaskId);
            if (subtask == null)
                return NotFound(ApiResponse<SubTaskDto>.ErrorResult("Subtask not found"));

            subtask.Title = request.Title;
            subtask.Completed = request.Completed;
            task.UpdatedAt = DateTime.UtcNow;

            await _taskRepository.UpdateAsync(taskId, task);
            var subtaskDto = _mapper.Map<SubTaskDto>(subtask);

            return Ok(ApiResponse<SubTaskDto>.SuccessResult(subtaskDto, "Subtask updated successfully"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating subtask {SubtaskId} in task {TaskId}", subtaskId, taskId);
            return StatusCode(500, ApiResponse<SubTaskDto>.ErrorResult("An error occurred while updating the subtask"));
        }
    }

    [HttpDelete("{taskId}/subtasks/{subtaskId}")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteSubtask(string taskId, string subtaskId)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized(ApiResponse<bool>.ErrorResult("User not authenticated"));

            var task = await _taskRepository.GetByIdAsync(taskId);
            if (task == null)
                return NotFound(ApiResponse<bool>.ErrorResult("Task not found"));

            if (task.AssignedUserId != userId)
                return Forbid();

            var subtaskRemoved = task.Subtasks.RemoveAll(s => s.Id == subtaskId) > 0;
            if (!subtaskRemoved)
                return NotFound(ApiResponse<bool>.ErrorResult("Subtask not found"));

            task.UpdatedAt = DateTime.UtcNow;
            await _taskRepository.UpdateAsync(taskId, task);

            return Ok(ApiResponse<bool>.SuccessResult(true, "Subtask deleted successfully"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting subtask {SubtaskId} from task {TaskId}", subtaskId, taskId);
            return StatusCode(500, ApiResponse<bool>.ErrorResult("An error occurred while deleting the subtask"));
        }
    }

    [HttpPatch("{taskId}/subtasks/{subtaskId}/toggle")]
    public async Task<ActionResult<ApiResponse<SubTaskDto>>> ToggleSubtask(string taskId, string subtaskId)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized(ApiResponse<SubTaskDto>.ErrorResult("User not authenticated"));

            var task = await _taskRepository.GetByIdAsync(taskId);
            if (task == null)
                return NotFound(ApiResponse<SubTaskDto>.ErrorResult("Task not found"));

            if (task.AssignedUserId != userId)
                return Forbid();

            var subtask = task.Subtasks.FirstOrDefault(s => s.Id == subtaskId);
            if (subtask == null)
                return NotFound(ApiResponse<SubTaskDto>.ErrorResult("Subtask not found"));

            subtask.Completed = !subtask.Completed;
            task.UpdatedAt = DateTime.UtcNow;

            await _taskRepository.UpdateAsync(taskId, task);
            var subtaskDto = _mapper.Map<SubTaskDto>(subtask);

            return Ok(ApiResponse<SubTaskDto>.SuccessResult(subtaskDto, "Subtask toggled successfully"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error toggling subtask {SubtaskId} in task {TaskId}", subtaskId, taskId);
            return StatusCode(500, ApiResponse<SubTaskDto>.ErrorResult("An error occurred while toggling the subtask"));
        }
    }

    // Comment Management Endpoints
    [HttpPost("{taskId}/comments")]
    public async Task<ActionResult<ApiResponse<CommentDto>>> AddComment(string taskId, CreateCommentRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized(ApiResponse<CommentDto>.ErrorResult("User not authenticated"));

            var task = await _taskRepository.GetByIdAsync(taskId);
            if (task == null)
                return NotFound(ApiResponse<CommentDto>.ErrorResult("Task not found"));

            if (task.AssignedUserId != userId)
                return Forbid();

            var user = await _userRepository.GetByIdAsync(userId);
            var authorName = user?.Name ?? "Unknown User";

            var comment = new Comment
            {
                Id = ObjectId.GenerateNewId().ToString(),
                Content = request.Content,
                AuthorId = userId,
                AuthorName = authorName,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            task.Comments.Add(comment);
            task.UpdatedAt = DateTime.UtcNow;

            await _taskRepository.UpdateAsync(taskId, task);
            var commentDto = _mapper.Map<CommentDto>(comment);

            return Ok(ApiResponse<CommentDto>.SuccessResult(commentDto, "Comment added successfully"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding comment to task {TaskId}", taskId);
            return StatusCode(500, ApiResponse<CommentDto>.ErrorResult("An error occurred while adding the comment"));
        }
    }

    [HttpPut("{taskId}/comments/{commentId}")]
    public async Task<ActionResult<ApiResponse<CommentDto>>> UpdateComment(string taskId, string commentId, UpdateCommentRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized(ApiResponse<CommentDto>.ErrorResult("User not authenticated"));

            var task = await _taskRepository.GetByIdAsync(taskId);
            if (task == null)
                return NotFound(ApiResponse<CommentDto>.ErrorResult("Task not found"));

            if (task.AssignedUserId != userId)
                return Forbid();

            var comment = task.Comments.FirstOrDefault(c => c.Id == commentId);
            if (comment == null)
                return NotFound(ApiResponse<CommentDto>.ErrorResult("Comment not found"));

            if (comment.AuthorId != userId)
                return Forbid();

            comment.Content = request.Content;
            comment.UpdatedAt = DateTime.UtcNow;
            task.UpdatedAt = DateTime.UtcNow;

            await _taskRepository.UpdateAsync(taskId, task);
            var commentDto = _mapper.Map<CommentDto>(comment);

            return Ok(ApiResponse<CommentDto>.SuccessResult(commentDto, "Comment updated successfully"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating comment {CommentId} in task {TaskId}", commentId, taskId);
            return StatusCode(500, ApiResponse<CommentDto>.ErrorResult("An error occurred while updating the comment"));
        }
    }

    [HttpDelete("{taskId}/comments/{commentId}")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteComment(string taskId, string commentId)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized(ApiResponse<bool>.ErrorResult("User not authenticated"));

            var task = await _taskRepository.GetByIdAsync(taskId);
            if (task == null)
                return NotFound(ApiResponse<bool>.ErrorResult("Task not found"));

            if (task.AssignedUserId != userId)
                return Forbid();

            var comment = task.Comments.FirstOrDefault(c => c.Id == commentId);
            if (comment == null)
                return NotFound(ApiResponse<bool>.ErrorResult("Comment not found"));

            if (comment.AuthorId != userId)
                return Forbid();

            var commentRemoved = task.Comments.RemoveAll(c => c.Id == commentId) > 0;
            if (!commentRemoved)
                return NotFound(ApiResponse<bool>.ErrorResult("Comment not found"));

            task.UpdatedAt = DateTime.UtcNow;
            await _taskRepository.UpdateAsync(taskId, task);

            return Ok(ApiResponse<bool>.SuccessResult(true, "Comment deleted successfully"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting comment {CommentId} from task {TaskId}", commentId, taskId);
            return StatusCode(500, ApiResponse<bool>.ErrorResult("An error occurred while deleting the comment"));
        }
    }
}