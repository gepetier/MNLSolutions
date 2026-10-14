param(
  [Parameter(Mandatory = $true)]
  [string]$Path,
  [int]$Rows = 35,
  [int]$Cols = 12
)

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
try {
  $excel.AutomationSecurity = 3
  $xlExtractData = 2
  $workbook = $excel.Workbooks.Open($Path, $null, $true, $null, $null, $null, $true, $null, $null, $false, $false, $null, $false, $true, $xlExtractData)
  try {
    foreach ($sheet in $workbook.Worksheets) {
      Write-Output "SHEET`t$($sheet.Name)"
      for ($r = 1; $r -le $Rows; $r++) {
        $values = @()
        $hasAny = $false
        for ($c = 1; $c -le $Cols; $c++) {
          $value = $sheet.Cells.Item($r, $c).Text
          if ($value -ne $null -and [string]$value -ne "") {
            $hasAny = $true
          }
          $values += ([string]$value).Replace("`t", " ").Replace("`r", " ").Replace("`n", " ")
        }
        if ($hasAny) {
          Write-Output ("R{0}`t{1}" -f $r, ($values -join "`t"))
        }
      }
    }
  } finally {
    $workbook.Close($false)
  }
} finally {
  $excel.Quit()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
}
