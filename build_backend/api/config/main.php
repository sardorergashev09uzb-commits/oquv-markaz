<?php
/**
 * API application konfiguratsiya (api/config/main.php ni o'rniga)
 * common/config/main-local.php da DB sozlanadi
 */

$params = array_merge(
    require __DIR__ . '/../../common/config/params.php',
    require __DIR__ . '/../../common/config/params-local.php',
    require __DIR__ . '/params.php',
    require __DIR__ . '/params-local.php'
);

return [
    'id' => 'app-api',
    'basePath' => dirname(__DIR__),
    'bootstrap' => ['log'],
    'language' => 'uz',
    'controllerNamespace' => 'api\controllers',
    'aliases' => [
        '@bower' => '@vendor/bower-asset',
        '@npm'   => '@vendor/npm-asset',
    ],
    'components' => [
        'request' => [
            'csrfParam' => '_csrf-api',
            'parsers' => [
                'application/json' => 'yii\web\JsonParser',
            ],
        ],
        'response' => [
            'format' => yii\web\Response::FORMAT_JSON,
            'charset' => 'UTF-8',
        ],
        'user' => [
            'identityClass' => 'common\models\User',
            'enableSession' => false,
            'loginUrl' => null,
        ],
        'log' => [
            'traceLevel' => YII_DEBUG ? 3 : 0,
            'targets' => [
                [
                    'class' => 'yii\log\FileTarget',
                    'levels' => ['error', 'warning'],
                    'logFile' => '@runtime/logs/api.log',
                ],
            ],
        ],
        'urlManager' => [
            'enablePrettyUrl' => true,
            'enableStrictParsing' => false,
            'showScriptName' => false,
            'rules' => [
                // Auth (both with and without 'api/' prefix)
                'POST api/auth/login'   => 'auth/login',
                'POST auth/login'       => 'auth/login',
                'POST api/auth/refresh' => 'auth/refresh',
                'POST auth/refresh'     => 'auth/refresh',
                'POST api/auth/logout'  => 'auth/logout',
                'POST auth/logout'      => 'auth/logout',
                'GET  api/auth/me'              => 'auth/me',
                'GET  auth/me'                  => 'auth/me',
                'POST api/auth/update-profile'  => 'auth/update-profile',
                'POST auth/update-profile'      => 'auth/update-profile',
                'POST api/auth/change-password' => 'auth/change-password',
                'POST auth/change-password'     => 'auth/change-password',

                // Dashboard
                'GET dashboard/manager'       => 'dashboard/manager',
                'GET dashboard/risk-students' => 'dashboard/risk-students',

                // Students
                'POST api/students/<id:\d+>/assign-group' => 'student/assign-group',
                'GET  api/students/<id:\d+>/attendance'   => 'student/attendance',
                'GET  api/students/<id:\d+>/grades'       => 'student/grades',
                'GET  api/students/<id:\d+>/payments'     => 'student/payments',
                'GET    api/students'          => 'student/index',
                'POST   api/students'          => 'student/create',
                'GET    api/students/<id:\d+>' => 'student/view',
                'PUT    api/students/<id:\d+>' => 'student/update',
                'DELETE api/students/<id:\d+>' => 'student/delete',

                // Teachers
                'GET    api/teachers'          => 'teacher/index',
                'POST   api/teachers'          => 'teacher/create',
                'GET    api/teachers/<id:\d+>' => 'teacher/view',
                'PUT    api/teachers/<id:\d+>' => 'teacher/update',
                'DELETE api/teachers/<id:\d+>' => 'teacher/delete',

                // Courses
                'GET    api/courses'          => 'course/index',
                'POST   api/courses'          => 'course/create',
                'GET    api/courses/<id:\d+>' => 'course/view',
                'PUT    api/courses/<id:\d+>' => 'course/update',
                'DELETE api/courses/<id:\d+>' => 'course/delete',

                // Groups
                'POST   api/groups/<id:\d+>/add-student'    => 'group/add-student',
                'POST   api/groups/<id:\d+>/remove-student' => 'group/remove-student',
                'GET    api/groups/<id:\d+>/dashboard'      => 'group/dashboard',
                'GET    api/groups'          => 'group/index',
                'POST   api/groups'          => 'group/create',
                'GET    api/groups/<id:\d+>' => 'group/view',
                'PUT    api/groups/<id:\d+>' => 'group/update',
                'DELETE api/groups/<id:\d+>' => 'group/delete',

                // Rooms
                'GET    api/rooms'          => 'room/index',
                'POST   api/rooms'          => 'room/create',
                'PUT    api/rooms/<id:\d+>' => 'room/update',
                'DELETE api/rooms/<id:\d+>' => 'room/delete',

                // Attendance
                'POST   api/attendance/create-lesson'           => 'attendance/create-lesson',
                'POST   api/attendance/bulk-save'               => 'attendance/bulk-save',
                'GET    api/attendance/lesson/<lid:\d+>'        => 'attendance/lesson',
                'GET    api/attendance'                         => 'attendance/index',

                // Assessments & Exams
                'GET    api/assessments/my-scores'              => 'assessment/my-scores',
                'POST   api/assessments/<id:\d+>/save-scores'   => 'assessment/save-scores',
                'GET    api/assessments/<id:\d+>'               => 'assessment/view',
                'GET    api/assessments'                        => 'assessment/index',
                'POST   api/assessments'                        => 'assessment/create',

                // Homework
                'GET    api/homework/<id:\d+>'                  => 'homework/view',
                'GET    api/homework'                           => 'homework/index',
                'POST   api/homework'                           => 'homework/create',

                // Finance & Payments
                'GET    api/payments/history'                   => 'payment/history',
                'POST   api/payments/create-plan'               => 'payment/create-plan',
                'GET    api/payments'                           => 'payment/index',
                'POST   api/payments'                           => 'payment/create',
                'GET    api/finance/summary'                    => 'finance/summary',
                'GET    api/finance/expenses'                   => 'finance/expenses',
                'POST   api/finance/expenses'                   => 'finance/create-expense',
                // CRM & Leads
                'PATCH  api/leads/<id:\d+>/status'              => 'lead/update-status',
                'POST   api/leads/<id:\d+>/convert'             => 'lead/convert-to-student',
                'POST   api/leads/<id:\d+>/activity'            => 'lead/add-activity',
                'GET    api/leads/<id:\d+>'                     => 'lead/view',
                'POST   api/leads/public'                       => 'lead/public-form',
                'GET    api/leads'                              => 'lead/index',
                'POST   api/leads'                              => 'lead/create',

                // Announcements
                'GET    api/announcements'                      => 'announcement/index',
                'POST   api/announcements'                      => 'announcement/create',
                'DELETE api/announcements/<id:\d+>'             => 'announcement/delete',

                // Notifications
                'GET    api/notifications'                      => 'notification/index',
                'POST   api/notifications/<id:\d+>/read'        => 'notification/mark-read',
                'POST   api/notifications/read-all'             => 'notification/read-all',

                // Certificates
                'GET    api/certificates/verify/<number>'       => 'certificate/verify',
                'GET    api/certificates/<id:\d+>'              => 'certificate/view',
                'GET    api/certificates'                       => 'certificate/index',
                'POST   api/certificates/generate'              => 'certificate/generate',

                // Reports
                'GET    api/reports/overview'       => 'report/overview',
                'GET    api/reports/finance'        => 'report/finance',
                'GET    api/reports/attendance'     => 'report/attendance',
                'GET    api/reports/risk-students'  => 'report/risk-students',
                'GET    api/reports/teachers'       => 'report/teachers',

                // Catch-all for OPTIONS requests (CORS preflight)
                'OPTIONS <path:.*>' => 'auth/options',

                // Generic fallbacks for both 'api/...' and regular routes
                '<prefix:(api/)?><controller:[\w\-]+>/<action:[\w\-]+>/<id:\d+>' => '<controller>/<action>',
                '<prefix:(api/)?><controller:[\w\-]+>/<action:[\w\-]+>'          => '<controller>/<action>',
                '<prefix:(api/)?><controller:[\w\-]+>'                           => '<controller>/index',
            ],
        ],
    ],
    'as corsFilter' => [
        'class' => 'yii\filters\Cors',
        'cors' => [
            'Origin' => [$_SERVER['HTTP_ORIGIN'] ?? '*'],
            'Access-Control-Request-Method'    => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
            'Access-Control-Request-Headers'   => ['*'],
            'Access-Control-Allow-Credentials' => true,
            'Access-Control-Max-Age'           => 86400,
        ],
    ],
    'modules' => [],
    'params' => $params,
];
