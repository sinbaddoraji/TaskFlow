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
            .ForMember(dest => dest.Subtasks, opt => opt.MapFrom(src => src.Subtasks));

        CreateMap<SubTask, SubTaskDto>();
        CreateMap<TaskRecurrence, TaskRecurrenceDto>()
            .ForMember(dest => dest.Type, opt => opt.MapFrom(src => src.Type.ToString()))
            .ForMember(dest => dest.DaysOfWeek, opt => opt.MapFrom(src => src.DaysOfWeek != null ? src.DaysOfWeek.Select(d => d.ToString()).ToList() : null));
        
        CreateMap<GitInfo, GitInfoDto>();

        // Request to Entity mappings
        CreateMap<CreateTaskRequest, TaskItem>()
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.Priority, opt => opt.MapFrom(src => Enum.Parse<TaskPriority>(src.Priority, true)))
            .ForMember(dest => dest.Status, opt => opt.MapFrom(src => Models.Entities.TaskStatus.Pending))
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

        // Project mappings
        CreateMap<Project, ProjectDto>()
            .ForMember(dest => dest.Members, opt => opt.MapFrom(src => src.Members));

        CreateMap<ProjectMember, ProjectMemberDto>()
            .ForMember(dest => dest.Role, opt => opt.MapFrom(src => src.Role.ToString()));

        CreateMap<ProjectSettings, ProjectSettingsDto>()
            .ForMember(dest => dest.DefaultTaskPriority, opt => opt.MapFrom(src => src.DefaultTaskPriority.ToString()));

        CreateMap<CreateProjectRequest, Project>()
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(src => DateTime.UtcNow))
            .ForMember(dest => dest.UpdatedAt, opt => opt.MapFrom(src => DateTime.UtcNow));

        CreateMap<ProjectSettingsRequest, ProjectSettings>()
            .ForMember(dest => dest.DefaultTaskPriority, opt => opt.MapFrom(src => Enum.Parse<TaskPriority>(src.DefaultTaskPriority, true)));
    }
}