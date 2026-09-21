param([switch]$Demo, [switch]$Doctor, [switch]$Full)
$ErrorActionPreference = 'Stop'
$daiCandidates = @(
    $env:DAI_PYTHON,
    'C:\AI-Companion\venv\Scripts\python.exe',
    (Join-Path $PSScriptRoot 'desktop\venv\Scripts\python.exe'),
    (Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe')
)
$daiPython = $daiCandidates | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -First 1
if (-not $daiPython) { throw 'Set DAI_PYTHON to the Python executable in your existing DAI environment.' }
$daiOldLibraries = $env:DAI_PYLIBS
try {
    # Reuse the already-installed laptop preview dependencies only for the bundled runtime.
    if ($daiPython -like '*codex-primary-runtime*' -and (Test-Path -LiteralPath 'D:\dai_animation_work\work\pylibs')) {
        $env:DAI_PYLIBS = 'D:\dai_animation_work\work\pylibs'
    }
    $daiArguments = @('-B', (Join-Path $PSScriptRoot 'desktop\launch.py'))
    if ($Demo) { $daiArguments += '--demo' }
    if ($Doctor) { $daiArguments += '--doctor' }
    if ($Full) { $daiArguments += '--full' }
    & $daiPython @daiArguments
    if ($LASTEXITCODE -ne 0) { throw "DAI exited with code $LASTEXITCODE" }
} finally {
    $env:DAI_PYLIBS = $daiOldLibraries
}
