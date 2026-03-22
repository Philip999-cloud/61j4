# Run AFTER: gh auth login (GitHub account 9cji4wj)
# Creates https://github.com/9cji4wj/61j4 if missing, then pushes master.

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
    Write-Host "Use HTTPS; sign in as 9cji4wj."
    exit 1
}

Set-Location $ProjectRoot
Write-Host "Project: $ProjectRoot"

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
    Write-Host "Created https://github.com/9cji4wj/61j4"
}

git remote set-url origin https://github.com/9cji4wj/61j4.git
git push -u origin master
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "Done: pushed master to origin."
