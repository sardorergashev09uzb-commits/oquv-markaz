<?php
defined('YII_DEBUG') or define('YII_DEBUG', true);
defined('YII_ENV') or define('YII_ENV', 'dev');

require __DIR__ . '/vendor/autoload.php';
require __DIR__ . '/vendor/yiisoft/yii2/Yii.php';
require __DIR__ . '/common/config/bootstrap.php';
require __DIR__ . '/api/config/bootstrap.php';

$config = yii\helpers\ArrayHelper::merge(
    require __DIR__ . '/common/config/main.php',
    require __DIR__ . '/common/config/main-local.php',
    require __DIR__ . '/api/config/main.php',
    require __DIR__ . '/api/config/main-local.php'
);

$application = new yii\web\Application($config);

$admin = \common\models\User::findOne(['role' => 'super_admin']);
if ($admin) {
    Yii::$app->user->login($admin);
} else {
    $admin = \common\models\User::findOne(['role' => 'manager']);
    if ($admin) Yii::$app->user->login($admin);
}

try {
    $controller = new \api\controllers\StudentController('student', Yii::$app);
    $response = $controller->runAction('index');
    print_r($response);
} catch (\Exception $e) {
    echo $e->getMessage() . "\n";
    echo $e->getTraceAsString();
}
