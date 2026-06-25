param(
  [int]$Port = 3000
)

$ErrorActionPreference = "Stop"
$BundledNode = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"

if (Test-Path $BundledNode) {
  & $BundledNode "$PSScriptRoot\server.js" "--port=$Port"
  exit $LASTEXITCODE
}

$NodeCommand = Get-Command node -ErrorAction SilentlyContinue
if ($NodeCommand) {
  & $NodeCommand.Source "$PSScriptRoot\server.js" "--port=$Port"
  exit $LASTEXITCODE
}

throw "Node.js was not found. Install Node.js or open this project inside Codex."
