<?php
$data = file_get_contents('backend.zip');
$chunks = str_split($data, 9 * 1024 * 1024); // 9 MB chunks
foreach($chunks as $i => $chunk) {
    file_put_contents('backend_part' . $i . '.zip', $chunk);
    echo "Created part $i\n";
}
