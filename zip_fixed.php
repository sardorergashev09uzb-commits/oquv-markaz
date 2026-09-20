<?php
$rootPath = realpath(__DIR__ . '/build_backend');
$zip = new ZipArchive();
$zip->open('backend_fixed.zip', ZipArchive::CREATE | ZipArchive::OVERWRITE);

$files = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator($rootPath),
    RecursiveIteratorIterator::LEAVES_ONLY
);

foreach ($files as $name => $file) {
    if (!$file->isDir()) {
        $filePath = $file->getRealPath();
        // Convert backslashes to forward slashes for Linux compatibility
        $relativePath = str_replace('\\', '/', substr($filePath, strlen($rootPath) + 1));
        $zip->addFile($filePath, $relativePath);
    }
}
$zip->close();
echo "Zip created properly.\n";

$data = file_get_contents('backend_fixed.zip');
$chunks = str_split($data, 9 * 1024 * 1024); // 9 MB chunks
foreach($chunks as $i => $chunk) {
    file_put_contents('backend_part' . $i . '.zip', $chunk);
    echo "Created part $i\n";
}
@unlink('backend_fixed.zip');
