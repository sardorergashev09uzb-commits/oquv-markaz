<?php
define('YII_DEBUG', true);
define('YII_ENV', 'prod');

require __DIR__ . '/../../vendor/autoload.php';
require __DIR__ . '/../../vendor/yiisoft/yii2/Yii.php';
require __DIR__ . '/../../common/config/bootstrap.php';
require __DIR__ . '/../config/bootstrap.php';

$config = yii\helpers\ArrayHelper::merge(
    require __DIR__ . '/../../common/config/main.php',
    require __DIR__ . '/../../common/config/main-local.php',
    require __DIR__ . '/../../console/config/main.php',
    require __DIR__ . '/../../console/config/main-local.php'
);

$application = new \yii\console\Application($config);
$application->runAction('migrate/up', ['interactive' => false]);
$application->runAction('seed', ['interactive' => false]);

echo "Database migrations and seeding completed successfully!";
