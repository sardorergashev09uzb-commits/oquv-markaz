<?php

/**
 * api/config/main-local.php
 */
return [
    'components' => [
        'request' => [
            'cookieValidationKey' => 'test-cookie-validation-key',
        ],
        'user' => [
            'identityClass' => 'common\models\User',
            'enableSession' => false,
            'loginUrl'      => null,
        ],
        'authManager' => [
            'class' => 'yii\rbac\DbManager',
        ],
    ],
];
