<?php

declare(strict_types=1);

namespace api\controllers;

use api\components\JwtBearerAuth;
use common\models\Room;
use Yii;
use yii\rest\Controller;
use yii\web\NotFoundHttpException;

/**
 * RoomController — Xonalar boshqaruvi
 */
class RoomController extends Controller
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
     * GET /api/rooms
     */
    public function actionIndex(): array
    {
        $request = Yii::$app->request;
        $search = $request->get('search');
        $status = $request->get('status');

        $query = Room::find();

        if ($search) {
            $query->andWhere(['like', 'name', $search]);
        }

        if ($status !== null && $status !== '') {
            $query->andWhere(['status' => (int) $status]);
        }

        $rooms = $query->orderBy(['id' => SORT_ASC])->all();

        return [
            'items' => $rooms,
            'total' => count($rooms),
        ];
    }

    /**
     * POST /api/rooms
     */
    public function actionCreate(): array
    {
        $room = new Room();
        $room->attributes = Yii::$app->request->bodyParams;

        if (!$room->save()) {
            Yii::$app->response->statusCode = 422;
            return ['errors' => $room->getErrors()];
        }

        Yii::$app->response->statusCode = 201;
        return [
            'message' => "Xona muvaffaqiyatli qo'shildi",
            'room' => $room,
        ];
    }

    /**
     * PUT/PATCH /api/rooms/{id}
     */
    public function actionUpdate(int $id): array
    {
        $room = Room::findOne($id);
        if (!$room) {
            throw new NotFoundHttpException("Xona topilmadi.");
        }

        $room->attributes = Yii::$app->request->bodyParams;

        if (!$room->save()) {
            Yii::$app->response->statusCode = 422;
            return ['errors' => $room->getErrors()];
        }

        return [
            'message' => "Xona yangilandi",
            'room' => $room,
        ];
    }

    /**
     * DELETE /api/rooms/{id}
     */
    public function actionDelete(int $id): array
    {
        $room = Room::findOne($id);
        if (!$room) {
            throw new NotFoundHttpException("Xona topilmadi.");
        }

        $room->status = Room::STATUS_INACTIVE;
        $room->save(false);

        return ['message' => "Xona arxivlandi"];
    }
}
