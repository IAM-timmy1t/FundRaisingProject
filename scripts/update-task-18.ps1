# Quick task status update
$tasksFile = "Z:\.CodingProjects\GitHub_Repos\FundRaisingProject\.taskmaster\tasks\tasks.json"
$content = Get-Content $tasksFile -Raw | ConvertFrom-Json

# Update task 18 (Update Creation UI) to done
$task = $content.master.tasks | Where-Object { $_.id -eq 18 }
if ($task) {
    $task.status = "done"
    Write-Host "Updated Task #18 to done: $($task.title)" -ForegroundColor Green
}

# Update metadata
$content.master.metadata.updated = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")

# Save updated file
$content | ConvertTo-Json -Depth 10 | Set-Content $tasksFile -Encoding UTF8

Write-Host "`nTotal completed tasks: $(($content.master.tasks | Where-Object { $_.status -eq 'done' }).Count) / $($content.master.tasks.Count)" -ForegroundColor Cyan
