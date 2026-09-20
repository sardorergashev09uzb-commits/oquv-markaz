<?php
// Qismlarni birlashtirish
$mergedFile = 'backend.zip';
if (!file_exists($mergedFile)) {
    $out = fopen($mergedFile, 'w');
    for ($i = 0; $i < 4; $i++) {
        $part = 'backend_part' . $i . '.zip';
        if (file_exists($part)) {
            $in = fopen($part, 'r');
            while ($data = fread($in, 1024 * 1024)) {
                fwrite($out, $data);
            }
            fclose($in);
        } else {
            die("Xatolik: $part fayli topilmadi! Hamma qismlarni yukladingizmi?");
        }
    }
    fclose($out);
}

// ZIPlarni ochish
$zip = new ZipArchive;
$res = $zip->open($mergedFile);
if ($res === TRUE) {
  $zip->extractTo('./');
  $zip->close();
  echo 'Yaxshi! Barcha kodlar serverga muvaffaqiyatli ochildi.';
} else {
  echo 'Xatolik! ZIP faylni ochib bo\'lmadi.';
}
?>
