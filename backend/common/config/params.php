<?php

/**
 * common/config/params.php
 */
return [
    'adminEmail' => 'admin@oquvmarkaz.uz',
    'supportEmail' => 'support@oquvmarkaz.uz',
    'senderEmail' => 'noreply@oquvmarkaz.uz',
    'senderName' => "O'quv Markaz",
    'storageBaseUrl' => 'http://localhost:8000/uploads',
    'user.passwordResetTokenExpire' => 3600,

    // JWT sozlamalari
    'jwt' => [
        'secret'             => 'REPLACE_WITH_STRONG_SECRET_32CHARS',   // .env dan o'qish yaxshiroq
        'accessTokenExpire'  => 3600,         // 1 soat
        'refreshTokenExpire' => 2592000,      // 30 kun
    ],

    // App versiyasi
    'appVersion' => '1.0.0',
];
