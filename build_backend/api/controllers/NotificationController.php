<?php

declare(strict_types=1);

namespace api\controllers;

use api\components\JwtBearerAuth;
use common\models\Notification;
use Yii;
use yii\rest\Controller;

/**
 * NotificationController — Foydalanuvchi bildirishnomalari
 */
class NotificationController extends Controller
{
    public $enableCsrfValidation = false;

    public function behaviors(): array
    {
        $behaviors = parent::behaviors();
        $behaviors['authenticator'] = [
            'class' => JwtBearerAuth::class,
        ];
        return $behaviors;
    }

    /**
     * GET /api/notifications
     */
    public function actionIndex(): array
    {
        $user = Yii::$app->user->identity;
        $userId = $user ? $user->id : 1;

        $notifications = Notification::find()
            ->where(['user_id' => $userId])
            ->orderBy(['id' => SORT_DESC])
            ->limit(30)
            ->all();

        $unreadCount = Notification::find()
            ->where(['user_id' => $userId, 'is_read' => false])
            ->count();

        return [
            'items' => $notifications,
            'unread_count' => (int) $unreadCount,
        ];
    }

    /**
     * POST /api/notifications/{id}/read
     */
    public function actionMarkRead(int $id): array
    {
        $user = Yii::$app->user->identity;
        $userId = $user ? $user->id : 1;

        $notif = Notification::findOne(['id' => $id, 'user_id' => $userId]);
        if ($notif) {
            $notif->is_read = true;
            $notif->save(false);
        }

        return ['message' => "O'qilgan deb belgilandi"];
    }

    /**
     * POST /api/notifications/read-all
     */
    public function actionReadAll(): array
    {
        $user = Yii::$app->user->identity;
        $userId = $user ? $user->id : 1;

        Notification::updateAll(['is_read' => true], ['user_id' => $userId]);

        return ['message' => "Barcha bildirishnomalar o'qilgan deb belgilandi"];
    }
}
