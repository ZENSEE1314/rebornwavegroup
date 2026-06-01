$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$dir = Join-Path $PSScriptRoot "..\attached_assets\level-concepts"
New-Item -ItemType Directory -Force -Path $dir | Out-Null

function B($hex) { [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml($hex)) }
function P($hex, $w = 2) {
  $pen = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml($hex), $w)
  $pen.StartCap = "Round"; $pen.EndCap = "Round"; $pen
}
function F($size, $style = 0) { [System.Drawing.Font]::new("Segoe UI", $size, [System.Drawing.FontStyle]$style, [System.Drawing.GraphicsUnit]::Pixel) }
function Poly($g, [array]$points, $brush) { $g.FillPolygon($brush, [System.Drawing.PointF[]]$points) }
function RoundRect($g, $brush, $pen, $x, $y, $w, $h, $r) {
  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $path.AddArc($x, $y, $r, $r, 180, 90)
  $path.AddArc($x + $w - $r, $y, $r, $r, 270, 90)
  $path.AddArc($x + $w - $r, $y + $h - $r, $r, $r, 0, 90)
  $path.AddArc($x, $y + $h - $r, $r, $r, 90, 90)
  $path.CloseFigure()
  if ($brush) { $g.FillPath($brush, $path) }
  if ($pen) { $g.DrawPath($pen, $path) }
  $path.Dispose()
}
function Spot($g, $x, $y, $color) {
  $b = B $color; $g.FillEllipse($b, $x - 20, $y - 20, 40, 40); $b.Dispose()
  $p = P "#ffffff" 3; $g.DrawLine($p, $x, $y, $x + 45, $y + 120); $p.Dispose()
}
function People($g, $x, $y, $cols, $rows) {
  $colors = @("#f8d477", "#22d3ee", "#f472b6", "#f8fafc", "#34d399")
  for ($row = 0; $row -lt $rows; $row++) {
    for ($col = 0; $col -lt $cols; $col++) {
      $cx = $x + $col * 54 + $row * 10; $cy = $y + $row * 58
      $b = B $colors[($col + $row) % $colors.Length]
      $g.FillEllipse($b, $cx, $cy, 24, 24)
      $g.FillRectangle($b, $cx - 4, $cy + 24, 32, 28)
      $b.Dispose()
    }
  }
}
function DrawConcept($file, $level, $title, $subtitle, $accent, $kind) {
  $bmp = [System.Drawing.Bitmap]::new(1600, 1000)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = "AntiAlias"; $g.TextRenderingHint = "AntiAliasGridFit"

  $bg = [System.Drawing.Drawing2D.LinearGradientBrush]::new([System.Drawing.Rectangle]::new(0, 0, 1600, 1000), [System.Drawing.ColorTranslator]::FromHtml("#04161b"), [System.Drawing.ColorTranslator]::FromHtml("#071426"), 45)
  $g.FillRectangle($bg, 0, 0, 1600, 1000); $bg.Dispose()
  for ($i = 0; $i -lt 70; $i++) { $p = P "#12343b" 1; $x = $i * 30; $g.DrawLine($p, $x, 0, $x + 520, 1000); $p.Dispose() }

  Poly $g @([System.Drawing.PointF]::new(190, 810), [System.Drawing.PointF]::new(520, 430), [System.Drawing.PointF]::new(1325, 455), [System.Drawing.PointF]::new(1450, 810)) (B "#0d2d35")
  Poly $g @([System.Drawing.PointF]::new(520, 430), [System.Drawing.PointF]::new(520, 165), [System.Drawing.PointF]::new(1325, 205), [System.Drawing.PointF]::new(1325, 455)) (B "#09252d")
  Poly $g @([System.Drawing.PointF]::new(190, 810), [System.Drawing.PointF]::new(190, 350), [System.Drawing.PointF]::new(520, 165), [System.Drawing.PointF]::new(520, 430)) (B "#071f26")
  Poly $g @([System.Drawing.PointF]::new(1325, 205), [System.Drawing.PointF]::new(1460, 355), [System.Drawing.PointF]::new(1450, 810), [System.Drawing.PointF]::new(1325, 455)) (B "#061c23")
  $edge = P $accent 5; $g.DrawPolygon($edge, [System.Drawing.PointF[]]@([System.Drawing.PointF]::new(190, 810), [System.Drawing.PointF]::new(520, 430), [System.Drawing.PointF]::new(1325, 455), [System.Drawing.PointF]::new(1450, 810))); $edge.Dispose()

  $white = B "#f8fafc"; $muted = B "#b8c7cb"; $ab = B $accent
  $g.DrawString($level, (F 56 1), $ab, 80, 60)
  $g.DrawString($title, (F 42 1), $white, 80, 130)
  $g.DrawString($subtitle, (F 22), $muted, 84, 190)

  if ($kind -eq "ktv") {
    RoundRect $g (B "#0f172a") (P "#22d3ee" 3) 600 555 410 115 34
    RoundRect $g (B "#101827") (P "#f8d477" 2) 1080 555 190 95 28
    RoundRect $g (B "#101827") (P "#f472b6" 2) 360 590 170 86 26
    RoundRect $g (B "#22d3ee") $null 620 575 90 55 20
    RoundRect $g (B "#22d3ee") $null 730 575 90 55 20
    RoundRect $g (B "#22d3ee") $null 840 575 90 55 20
    $screen = B "#111827"; $g.FillRectangle($screen, 690, 310, 430, 120); $screen.Dispose()
    $gold = B "#f8d477"; $g.DrawString("KTV COMPETITION SCREEN", (F 24 1), $gold, 735, 355); $gold.Dispose()
    Spot $g 560 260 "#22d3ee"; Spot $g 1220 280 "#f8d477"; Spot $g 920 240 "#f472b6"
  } elseif ($kind -eq "salon") {
    for ($i = 0; $i -lt 4; $i++) {
      $x = 450 + $i * 190
      RoundRect $g (B "#142b35") (P "#22d3ee" 2) $x 540 120 150 32
      $g.FillEllipse((B "#f472b6"), $x + 28, 490, 64, 64)
      $g.FillRectangle((B "#c7f9d2"), $x + 50, 350, 20, 135)
    }
    RoundRect $g (B "#f472b6") (P "#ffffff" 2) 1040 470 280 155 28
    $dark = B "#1b0612"; $g.DrawString("BEAUTY SALON", (F 26 1), $dark, 1085, 520); $dark.Dispose()
    RoundRect $g (B "#0f172a") (P "#22d3ee" 2) 330 690 850 64 20
  } elseif ($kind -eq "vip") {
    RoundRect $g (B "#281640") (P "#a78bfa" 4) 420 455 360 205 36
    RoundRect $g (B "#33200c") (P "#f8d477" 4) 860 455 360 205 36
    RoundRect $g (B "#a78bfa") $null 455 505 270 70 24
    RoundRect $g (B "#f8d477") $null 895 505 270 70 24
    $g.FillEllipse((B "#f8fafc"), 575, 595, 70, 36)
    $g.FillEllipse((B "#f8fafc"), 1015, 595, 70, 36)
    $g.DrawString("VIP KTV SUITE", (F 30 1), $white, 508, 345)
    $g.DrawString("BEAUTY LOUNGE", (F 30 1), $white, 915, 345)
    Spot $g 470 250 "#a78bfa"; Spot $g 1180 250 "#f8d477"
  } elseif ($kind -eq "pet") {
    for ($i = 0; $i -lt 6; $i++) {
      $x = 390 + ($i % 3) * 230; $y = 525 + [math]::Floor($i / 3) * 135
      $g.FillEllipse((B "#f8d477"), $x, $y, 100, 60)
      $g.FillEllipse((B "#34d399"), $x + 35, $y - 45, 36, 36)
      $g.FillRectangle((B "#34d399"), $x + 42, $y - 10, 24, 46)
    }
    RoundRect $g (B "#064e3b") (P "#34d399" 4) 1030 435 260 245 34
    $mint = B "#c7f9d2"; $g.DrawString("PET PLAY AREA", (F 28 1), $mint, 1065, 535); $mint.Dispose()
    RoundRect $g (B "#f472b6") (P "#ffffff" 2) 310 380 220 90 26
    $dark = B "#190310"; $g.DrawString("BLINDBOX", (F 24 1), $dark, 350, 410); $dark.Dispose()
  } elseif ($kind -eq "live") {
    RoundRect $g (B "#24124b") (P "#a78bfa" 5) 555 325 520 170 34
    $g.DrawString("LIVE BAND STAGE", (F 34 1), $white, 660, 385)
    Spot $g 600 250 "#22d3ee"; Spot $g 810 235 "#f8d477"; Spot $g 1030 250 "#f472b6"
    People $g 410 560 8 4
    RoundRect $g (B "#f8d477") (P "#ffffff" 2) 980 620 270 150 30
    $dark = B "#1b1300"; $g.DrawString("DANCE FLOOR", (F 27 1), $dark, 1030, 675); $dark.Dispose()
    RoundRect $g (B "#0f766e") (P "#67e8f9" 3) 1120 365 230 80 26
    $sea = B "#ecfeff"; $g.DrawString("SEA VIEW BAR", (F 24 1), $sea, 1155, 390); $sea.Dispose()
  }

  $g.DrawString("RENOVATED CONCEPT IMAGE", (F 18 1), $muted, 80, 910)
  $g.DrawString("Reborn Wave Group Batam", (F 18 1), $muted, 1280, 910)
  $bmp.Save((Join-Path $dir $file), [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose(); $white.Dispose(); $muted.Dispose(); $ab.Dispose()
}

DrawConcept "level-1-ktv-game.png" "1F" "KTV Lounge + Kids Game House" "Two KTV lounge units, singing competition energy, kids game zone." "#22d3ee" "ktv"
DrawConcept "level-2-private-ktv-salon.png" "2F" "Private KTV + Beauty Salon" "Four private karaoke rooms beside a beauty service zone." "#f472b6" "salon"
DrawConcept "level-3-vip-salon.png" "3F" "VIP KTV + Beauty Salon" "Premium VIP rooms with lounge seating and salon treatment area." "#a78bfa" "vip"
DrawConcept "level-4-pet-cafe.png" "4F" "Pet Cafe + Blindbox Corner" "Pet cafe seating, play zone, daily token and blindbox experience." "#34d399" "pet"
DrawConcept "level-5-live-house.png" "5F" "Sea-View Live House" "Live band stage, audience seating, dance floor and sea-view bar." "#f8d477" "live"
