<?php

declare(strict_types=1);

namespace api\controllers;

use api\components\JwtBearerAuth;
use common\models\User;
use Yii;
use yii\rest\Controller;
use yii\web\ForbiddenHttpException;

/**
 * SettingController — Tizim sozlamalari (Markaz profili, SMS, limitlar)
 */
class SettingController extends Controller
{
    public $enableCsrfValidation = false;

    public function behaviors(): array
    {
        $behaviors = parent::behaviors();
        $behaviors['authenticator'] = [
            'class' => JwtBearerAuth::class,
            'optional' => ['index'],
        ];
        return $behaviors;
    }

    /**
     * Jadval mavjudligini ta'minlash
     */
    protected function ensureTable(): void
    {
        try {
            Yii::$app->db->createCommand("
                CREATE TABLE IF NOT EXISTS {{%settings}} (
                    `key` VARCHAR(64) NOT NULL PRIMARY KEY,
                    `value` LONGTEXT NOT NULL,
                    `updated_at` INT NULL
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            ")->execute();
        } catch (\Throwable $e) {
            Yii::error("Setting table creation error: " . $e->getMessage());
        }
    }

    /**
     * Standart boshlang'ich sozlamalar
     */
    protected function getDefaultSettings(): array
    {
        return [
            'profile' => [
                'name' => "O'quv Markaz N1 (Bosh Filial)",
                'phone' => '+998 71 200 00 00',
                'email' => 'info@oquvmarkaz.uz',
                'address' => "Toshkent sh., Yunusobod tumani, Amir Temur shoh ko'chasi 107-uy",
                'workingHours' => '08:00 - 21:00 (Dush - Shan)',
                'contractPrefix' => 'OM-2026',
                'currency' => "UZS (so'm)",
            ],
            'smsConfig' => [
                'provider' => 'eskiz',
                'email' => 'admin@oquvmarkaz.uz',
                'token' => 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                'senderName' => '4546',
                'autoPaymentAlert' => true,
                'autoAttendanceAlert' => true,
                'testPhone' => '+998901234567',
            ],
            'limits' => [
                'maxStudentsPerGroup' => 16,
                'defaultTuitionFee' => 300000,
                'minTeacherSalary' => 2000000,
                'discountLimit' => 20,
            ],
        ];
    }

    /**
     * GET /api/settings — Barcha sozlamalarni olish
     */
    public function actionIndex(): array
    {
        $this->ensureTable();
        $defaults = $this->getDefaultSettings();

        try {
            $rows = Yii::$app->db->createCommand("SELECT `key`, `value` FROM {{%settings}}")->queryAll();
            $saved = [];
            foreach ($rows as $row) {
                $decoded = json_decode($row['value'], true);
                $saved[$row['key']] = ($decoded !== null) ? $decoded : $row['value'];
            }

            return array_merge($defaults, $saved);
        } catch (\Throwable $e) {
            return $defaults;
        }
    }

    /**
     * POST /api/settings — Sozlamalarni saqlash
     */
    public function actionSave(): array
    {
        $this->ensureTable();

        $currentUser = Yii::$app->user->identity;
        if ($currentUser && !in_array($currentUser->role, [User::ROLE_SUPER_ADMIN, User::ROLE_ADMIN, User::ROLE_MANAGER], true)) {
            throw new ForbiddenHttpException("Faqat administrator yoki menejer sozlamalarni o'zgartira oladi.");
        }

        $body = Yii::$app->request->getBodyParams();
        $now = time();

        $allowedKeys = ['profile', 'smsConfig', 'limits', 'system'];
        foreach ($body as $key => $value) {
            if (in_array($key, $allowedKeys, true)) {
                $jsonValue = is_string($value) ? $value : json_encode($value, JSON_UNESCAPED_UNICODE);
                try {
                    Yii::$app->db->createCommand("
                        INSERT INTO {{%settings}} (`key`, `value`, `updated_at`)
                        VALUES (:key, :value, :updated_at)
                        ON DUPLICATE KEY UPDATE `value` = :value, `updated_at` = :updated_at
                    ", [
                        ':key' => $key,
                        ':value' => $jsonValue,
                        ':updated_at' => $now,
                    ])->execute();
                } catch (\Throwable $e) {
                    Yii::error("Failed to save setting $key: " . $e->getMessage());
                }
            }
        }

        return [
            'success' => true,
            'message' => "Sozlamalar muvaffaqiyatli saqlandi!",
            'settings' => $this->actionIndex(),
        ];
    }
}
