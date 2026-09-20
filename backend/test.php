<?php
require __DIR__ . '/vendor/autoload.php';
require __DIR__ . '/vendor/yiisoft/yii2/Yii.php';
require __DIR__ . '/common/config/bootstrap.php';

$config = yii\helpers\ArrayHelper::merge(
    require __DIR__ . '/common/config/main.php',
    require __DIR__ . '/common/config/main-local.php',
    require __DIR__ . '/console/config/main.php',
    require __DIR__ . '/console/config/main-local.php'
);

$application = new yii\console\Application($config);

use common\models\User;

$students = User::find()->where(['role' => 'student'])->all();
echo count($students) . " students found.\n";

$teachers = User::find()->where(['role' => 'teacher'])->all();
echo count($teachers) . " teachers found.\n";

$groups = \common\models\Group::find()->all();
echo count($groups) . " groups found.\n";
