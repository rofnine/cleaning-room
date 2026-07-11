$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
$node = if ($nodeCommand) {
    $nodeCommand.Source
} else {
    'C:\Users\eocks\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
}

if (-not (Test-Path -LiteralPath $node)) {
    throw 'Node.js runtime not found'
}

& $node --test tests/*.test.mjs
exit $LASTEXITCODE
