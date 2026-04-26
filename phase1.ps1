$pagePath = "D:\crypto-projects\satoshilock-frontend\app\page.js"
$content = [System.IO.File]::ReadAllText($pagePath)

$oldBlock = "          {/* HERO */}`r`n          <motion.section`r`n            variants={staggerContainer}`r`n            initial=`"hidden`"`r`n            animate=`"show`"`r`n            style={styles.hero}`r`n          >"

$newBlock = "          {/* BRUTALIST HERO */}`r`n          <motion.section`r`n            variants={staggerContainer}`r`n            initial=`"hidden`"`r`n            animate=`"show`"`r`n            style={styles.brutalistHero}`r`n          >"

$content = $content.Replace($oldBlock, $newBlock)

$mojibake1 = [char]0xC3 + [char]0xA2 + [char]0xC2 + [char]0x80 + [char]0xC2 + [char]0xA2
$mojibake2 = [char]0xC3 + [char]0xA2 + [char]0xC2 + [char]0x80 + [char]0xC2 + [char]0x99

$content = $content -replace 'styles\.hero(?=[^a-zA-Z])', 'styles.brutalistHero'
$content = $content -replace 'styles\.h1(?=[^a-zA-Z])', 'styles.brutalistTitle'
$content = $content -replace 'styles\.subtitle', 'styles.brutalistTagline'
$content = $content -replace 'styles\.ctaPrimary', 'styles.brutalistCta'
$content = $content -replace 'styles\.ctaSecondary', 'styles.brutalistCtaGhost'

[System.IO.File]::WriteAllText($pagePath, $content, (New-Object System.Text.UTF8Encoding $false))
Write-Host "Phase 1 done: replaced style refs"
