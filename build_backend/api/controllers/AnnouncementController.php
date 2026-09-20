<?php

declare(strict_types=1);

namespace api\controllers;

use api\components\JwtBearerAuth;
use common\models\Announcement;
use common\models\Notification;
use common\models\User;
use Yii;
use yii\rest\Controller;
use yii\web\NotFoundHttpException;

/**
 * AnnouncementController — E'lonlar tizimi
 */
class AnnouncementController extends Controller
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
     * GET /api/announcements
     */
    public function actionIndex(): array
    {
        $announcements = Announcement::find()
            ->with('author')
            ->orderBy(['published_at' => SORT_DESC, 'id' => SORT_DESC])
            ->all();

        return [
            'items' => $announcements,
            'total' => count($announcements),
        ];
    }

    /**
     * POST /api/announcements
     */
    public function actionCreate(): array
    {
        $body = Yii::$app->request->bodyParams;
        $user = Yii::$app->user->identity;

        $announcement = new Announcement();
        $announcement->title = $body['title'] ?? '';
        $announcement->content = $body['content'] ?? '';
        $announcement->target_type = $body['target_type'] ?? Announcement::TARGET_ALL;
        $announcement->target_id = !empty($body['target_id']) ? (int) $body['target_id'] : null;
        $announcement->author_id = $user ? $user->id : 1;
        $announcement->published_at = time();

        if (!$announcement->save()) {
            Yii::$app->response->statusCode = 422;
            return ['errors' => $announcement->getErrors()];
        }

        // Barcha foydalanuvchilarga bildirishnoma yuborish
        $allUsers = User::find()->where(['status' => User::STATUS_ACTIVE])->limit(50)->all();
        foreach ($allUsers as $u) {
            $notif = new Notification();
            $notif->user_id = $u->id;
            $notif->title = "Yangi e'lon: " . $announcement->title;
            $notif->body = mb_substr($announcement->content, 0, 100) . '...';
            $notif->type = Notification::TYPE_ANNOUNCEMENT;
            $notif->is_read = false;
            $notif->save(false);
        }

        Yii::$app->response->statusCode = 201;
        return [
            'message' => "E'lon muvaffaqiyatli chop etildi",
            'announcement' => $announcement,
        ];
    }

    /**
     * DELETE /api/announcements/{id}
     */
    public function actionDelete(int $id): array
    {
        $announcement = Announcement::findOne($id);
        if (!$announcement) {
            throw new NotFoundHttpException("E'lon topilmadi.");
        }

        $announcement->delete();
        return ['message' => "E'lon o'chirildi"];
    }
}
