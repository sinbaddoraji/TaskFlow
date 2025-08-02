namespace TaskFlow.Api.Models.Requests;

public class CreateSubtaskRequest
{
    public string Title { get; set; } = string.Empty;
}

public class UpdateSubtaskRequest
{
    public string Title { get; set; } = string.Empty;
    public bool Completed { get; set; }
}