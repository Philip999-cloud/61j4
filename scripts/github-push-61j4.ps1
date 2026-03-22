# Run AFTER: gh auth login
# Creates <your-login>/61j4 on GitHub, sets origin, pushes master.

$ProjectRoot = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $ProjectRoot ".git"))) {
    $ProjectRoot = "C:\Users\DELL\Downloads\0315 project"
}

$gh = "C:\Program Files\GitHub CLI\gh.exe"
if (-not (Test-Path $gh)) { $gh = "gh" }

$authErr = & $gh auth status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Not logged in to GitHub. Run first (browser or token prompt):"
    Write-Host "  & `"$gh`" auth login"
    Write-Host "Use HTTPS."
    exit 1
}

$login = (& $gh api user -q .login 2>&1 | Out-String).Trim()
if (-not $login) {
    Write-Host "Could not read GitHub login from gh api user."
    exit 1
}

$repoUrl = "https://github.com/$login/61j4.git"
Set-Location $ProjectRoot
Write-Host "Project: $ProjectRoot"
Write-Host "GitHub user: $login"

$createOut = & $gh repo create 61j4 --public -d "ASEA - AI-Powered Smart Education Assistant" 2>&1
$createText = if ($createOut) { $createOut | Out-String } else { "" }
if ($LASTEXITCODE -ne 0) {
    if ($createText -match "already exists|Name already exists|name already exists") {
        Write-Host "Remote repo already exists; skipping create."
    } else {
        Write-Host $createText
        exit $LASTEXITCODE
    }
} else {
    Write-Host "Created $repoUrl"
}

git remote set-url origin $repoUrl
git push -u origin master
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "Done: pushed master to $repoUrl"
