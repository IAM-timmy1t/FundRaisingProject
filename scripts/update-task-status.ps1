# Task Status Update Script
# Updates completed tasks in the FundRaisingProject

$tasksFile = "Z:\.CodingProjects\GitHub_Repos\FundRaisingProject\.taskmaster\tasks\tasks.json"
$content = Get-Content $tasksFile -Raw | ConvertFrom-Json

# Update completed tasks
$completedTasks = @(4, 10, 13, 14, 15, 17)

foreach ($taskId in $completedTasks) {
    $task = $content.master.tasks | Where-Object { $_.id -eq $taskId }
    if ($task) {
        $task.status = "done"
        Write-Host "Updated Task #$taskId to done: $($task.title)" -ForegroundColor Green
    }
}

# Update metadata
$content.master.metadata.updated = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")

# Save updated file
$content | ConvertTo-Json -Depth 10 | Set-Content $tasksFile -Encoding UTF8

Write-Host "`nTask status update complete!" -ForegroundColor Green
Write-Host "Total completed tasks: $(($content.master.tasks | Where-Object { $_.status -eq 'done' }).Count) / $($content.master.tasks.Count)" -ForegroundColor Cyan
