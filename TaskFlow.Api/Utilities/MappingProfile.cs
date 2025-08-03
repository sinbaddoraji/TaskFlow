using AutoMapper;
using TaskFlow.Api.Models.Entities;
using TaskFlow.Api.Models.DTOs;
using TaskFlow.Api.Models.Requests;

namespace TaskFlow.Api.Utilities;

public class MappingProfile : Profile
{
    public MappingProfile()
    {
        // User mappings
        CreateMap<User, UserDto>()
            .ForMember(dest => dest.Id, opt => opt.MapFrom(src => src.Id));
        
        CreateMap<UserPreferences, UserPreferencesDto>();
        CreateMap<NotificationSettings, NotificationSettingsDto>();

        // Task mappings
        CreateMap<TaskItem, TaskDto>()
            .ForMember(dest => dest.Priority, opt => opt.MapFrom(src => src.Priority.ToString()))
            .ForMember(dest => dest.Status, opt => opt.MapFrom(src => src.Status.ToString()))
            .ForMember(dest => dest.Subtasks, opt => opt.MapFrom(src => src.Subtasks))
            .ForMember(dest => dest.Comments, opt => opt.MapFrom(src => src.Comments));

        CreateMap<SubTask, SubTaskDto>();
        CreateMap<Comment, CommentDto>();
        CreateMap<TaskRecurrence, TaskRecurrenceDto>()
            .ForMember(dest => dest.Type, opt => opt.MapFrom(src => src.Type.ToString()))
            .ForMember(dest => dest.DaysOfWeek, opt => opt.MapFrom(src => src.DaysOfWeek != null ? src.DaysOfWeek.Select(d => d.ToString()).ToList() : null));
        
        CreateMap<GitInfo, GitInfoDto>();

        // Request to Entity mappings
        CreateMap<CreateTaskRequest, TaskItem>()
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.Priority, opt => opt.MapFrom(src => Enum.Parse<TaskPriority>(src.Priority, true)))
            .ForMember(dest => dest.Status, opt => opt.MapFrom(src => Enum.Parse<Models.Entities.TaskStatus>(src.Status, true)))
            .ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(src => DateTime.UtcNow))
            .ForMember(dest => dest.UpdatedAt, opt => opt.MapFrom(src => DateTime.UtcNow))
            .ForMember(dest => dest.Subtasks, opt => opt.MapFrom(src => src.Subtasks));

        CreateMap<CreateSubTaskRequest, SubTask>()
            .ForMember(dest => dest.Id, opt => opt.MapFrom(src => MongoDB.Bson.ObjectId.GenerateNewId().ToString()))
            .ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(src => DateTime.UtcNow))
            .ForMember(dest => dest.Completed, opt => opt.MapFrom(src => false));

        CreateMap<TaskRecurrenceRequest, TaskRecurrence>()
            .ForMember(dest => dest.Type, opt => opt.MapFrom(src => Enum.Parse<RecurrenceType>(src.Type, true)))
            .ForMember(dest => dest.DaysOfWeek, opt => opt.MapFrom(src => src.DaysOfWeek != null ? src.DaysOfWeek.Select(d => Enum.Parse<DayOfWeek>(d, true)).ToList() : null));

        CreateMap<GitInfoRequest, GitInfo>();

        // Update Task mappings - selective field updates only
        CreateMap<UpdateTaskRequest, TaskItem>()
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
            .ForMember(dest => dest.CreatedById, opt => opt.Ignore())
            .ForMember(dest => dest.Comments, opt => opt.Ignore())
            .ForMember(dest => dest.UpdatedAt, opt => opt.MapFrom(src => DateTime.UtcNow))
            .ForMember(dest => dest.Priority, opt => opt.MapFrom(src => src.Priority != null ? Enum.Parse<TaskPriority>(src.Priority, true) : TaskPriority.Medium))
            .ForMember(dest => dest.Status, opt => opt.MapFrom(src => src.Status != null ? Enum.Parse<Models.Entities.TaskStatus>(src.Status, true) : Models.Entities.TaskStatus.Pending))
            .ForAllMembers(opt => opt.Condition((src, dest, srcMember) => srcMember != null));

        CreateMap<UpdateSubTaskRequest, SubTask>()
            .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
            .ForAllMembers(opt => opt.Condition((src, dest, srcMember) => srcMember != null));

        // Project mappings
        CreateMap<Project, ProjectDto>()
            .ForMember(dest => dest.TaskCount, opt => opt.Ignore()) // Will be calculated separately
            .ForMember(dest => dest.OwnerName, opt => opt.Ignore()); // Will be populated separately

        CreateMap<ProjectMember, ProjectMemberDto>()
            .ForMember(dest => dest.UserName, opt => opt.Ignore())
            .ForMember(dest => dest.UserEmail, opt => opt.Ignore());

        CreateMap<ProjectSettings, ProjectSettingsDto>();

        CreateMap<CreateProjectRequest, Project>()
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.OwnerId, opt => opt.Ignore())
            .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
            .ForMember(dest => dest.UpdatedAt, opt => opt.Ignore())
            .ForMember(dest => dest.Members, opt => opt.MapFrom(src => new List<ProjectMember>()));

        CreateMap<UpdateProjectRequest, Project>()
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.OwnerId, opt => opt.Ignore())
            .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
            .ForMember(dest => dest.UpdatedAt, opt => opt.Ignore())
            .ForMember(dest => dest.Members, opt => opt.Ignore())
            .ForAllMembers(opt => opt.Condition((src, dest, srcMember) => srcMember != null));

        CreateMap<ProjectSettingsRequest, ProjectSettings>();

  }
}