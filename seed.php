<?php
define('YII_DEBUG', true);
define('YII_ENV', 'prod');
require __DIR__ . '/vendor/autoload.php';
require __DIR__ . '/vendor/yiisoft/yii2/Yii.php';
require __DIR__ . '/common/config/bootstrap.php';
require __DIR__ . '/console/config/bootstrap.php';

$config = yii\helpers\ArrayHelper::merge(
    require __DIR__ . '/common/config/main.php',
    require __DIR__ . '/common/config/main-local.php',
    require __DIR__ . '/console/config/main.php',
    require __DIR__ . '/console/config/main-local.php'
);

$_SERVER['argv'] = ['yii', 'migrate/up', '--interactive=0'];
$_SERVER['argc'] = 3;

try {
    $application = new yii\console\Application($config);
    ob_start();
    echo "MIGRATSIYALAR:\n";
    $application->runAction('migrate/up', ['interactive' => false]);
    
    echo "\nSEEDERLAR:\n";
    $_SERVER['argv'] = ['yii', 'seed/index'];
    $application->runAction('seed/index');
    
    $output = ob_get_clean();
    echo "<h1 style='color:green;'>Baza muvaffaqiyatli to'ldirildi!</h1><pre>$output</pre>";
} catch (\Exception $e) {
    echo "<h1 style='color:red;'>Xatolik yuz berdi:</h1><pre>" . $e->getMessage() . "</pre>";
}
