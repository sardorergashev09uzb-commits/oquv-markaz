<?php
$files = scandir(__DIR__);
$count = 0;
foreach ($files as $file) {
    if ($file !== '.' && $file !== '..' && $file !== 'clean.php' && $file !== 'unzip.php') {
        if (is_file($file)) {
            unlink($file);
            $count++;
        }
    }
}
echo "Tozalandi! $count ta xato fayl o'chirildi. Endi yangi ZIP qismlarini yuklashingiz mumkin.";
?>
