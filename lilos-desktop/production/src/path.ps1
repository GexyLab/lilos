# The folder of the lilos command (lilos.cmd) in the PATH of the Windows user (HKCU\Environment),
# for the program (src/command.js, through -EncodedCommand: this file is inside app.asar) and for
# its uninstaller (build/installer.nsh, which carries a copy and runs it with -File remove).
#   LILOS_PATH_OP   add | remove | check (or the first argument)
#   LILOS_CLI_DIR   the folder; empty for remove: the one written at add in HKCU\Software\GexyLab\lilOS
# The rest of the PATH stays as it is, with its kind (REG_EXPAND_SZ keeps its %VARIABLES%).
# Then Explorer is told the environment changed, so terminals opened from now on see it.
#   LILOS_PATH_KEY  (tests) another key of HKCU in place of Environment, and of the note
$ErrorActionPreference = 'Stop'
$op = if ($env:LILOS_PATH_OP) { $env:LILOS_PATH_OP } elseif ($args.Count) { $args[0] } else { 'check' }
$envKey = if ($env:LILOS_PATH_KEY) { $env:LILOS_PATH_KEY } else { 'Environment' }
$mark = if ($env:LILOS_PATH_KEY) { "$env:LILOS_PATH_KEY\note" } else { 'Software\GexyLab\lilOS' }
$dir = "$env:LILOS_CLI_DIR"
if (-not $dir -and $op -eq 'remove') {
  $m = [Microsoft.Win32.Registry]::CurrentUser.OpenSubKey($mark)
  if ($m) { $dir = [string]$m.GetValue('CommandPath', ''); $m.Close() }
}
$dir = $dir.TrimEnd('\')
if (-not $dir) { exit 0 }

$k = [Microsoft.Win32.Registry]::CurrentUser.CreateSubKey($envKey)
$has = $k.GetValueNames() -contains 'Path'
$kind = if ($has) { $k.GetValueKind('Path') } else { [Microsoft.Win32.RegistryValueKind]::ExpandString }
$old = if ($has) { [string]$k.GetValue('Path', '', [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames) } else { '' }
$same = { param($p) [Environment]::ExpandEnvironmentVariables($p).Trim().TrimEnd('\') -ieq $dir }
$found = @($old -split ';' | Where-Object { $_ -and (& $same $_) }).Count -gt 0

if ($op -eq 'check') { if ($found) { 'yes' } else { 'no' }; exit 0 }
if ($op -eq 'add') {
  if (-not $found) {
    $new = if (-not $old) { $dir } elseif ($old.EndsWith(';')) { $old + $dir } else { "$old;$dir" }
    $k.SetValue('Path', $new, $kind)
  }
  $m = [Microsoft.Win32.Registry]::CurrentUser.CreateSubKey($mark)
  $m.SetValue('CommandPath', $dir)
  $m.Close()
} elseif ($op -eq 'remove') {
  if ($found) {
    $new = (@($old -split ';' | Where-Object { -not ($_ -and (& $same $_)) })) -join ';'
    $k.SetValue('Path', $new, $kind)
  }
  $m = [Microsoft.Win32.Registry]::CurrentUser.OpenSubKey($mark, $true)
  if ($m) { $m.DeleteValue('CommandPath', $false); $m.Close() }
} else {
  throw "Operazione sconosciuta: $op"
}
$k.Close()
# Deleting a variable that is not there changes nothing but sends WM_SETTINGCHANGE "Environment"
if (-not $env:LILOS_PATH_KEY) { [Environment]::SetEnvironmentVariable('LILOS_PATH_REFRESH', $null, 'User') }
