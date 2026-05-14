$path = "f:\5 star\src\lib\campaign-utils.ts"
$content = Get-Content $path -Raw

# Replace the REFERRALS and PROGRAM_LEADS fallback lines with Protected versions
$newContent = $content -replace '\.replace\(/{programLink}\|{ProgramLink}/gi, programLink\)', 
"`r`n        // 🛡️ PROTECT: Preserve specific program selections`r`n        if (!resolvedText.includes('/offer/')) {`r`n            resolvedText = resolvedText.replace(/{programLink}|{ProgramLink}/gi, programLink)`r`n        }"

$newContent | Set-Content $path -NoNewline
Write-Output "File Patched Successfully"
