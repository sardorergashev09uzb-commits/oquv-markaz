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

        $force = (int) Yii::$app->request->get('force', 0);
        if ($force === 1) {
            return $this->actionForceDelete($id);
        }

        $room->status = Room::STATUS_INACTIVE;
        $room->save(false);

        return ['message' => "Xona arxivlandi"];
    }

    /**
     * POST /api/rooms/{id}/restore — Arxivdan chiqarish
     */
    public function actionRestore(int $id): array
    {
        $room = Room::findOne($id);
        if (!$room) {
            throw new NotFoundHttpException("Xona topilmadi.");
        }

        $room->status = Room::STATUS_ACTIVE;
        $room->save(false);

        return [
            'message' => "Xona arxivdan chiqarildi va qayta faollashtirildi",
            'room' => $room,
        ];
    }

    /**
     * DELETE /api/rooms/{id}/force — Bazadan butunlay o'chirish
     */
    public function actionForceDelete(int $id): array
    {
        $room = Room::findOne($id);
        if (!$room) {
            throw new NotFoundHttpException("Xona topilmadi.");
        }

        $groupsCount = $room->getGroups()->count();
        if ($groupsCount > 0) {
            throw new \yii\web\BadRequestHttpException("Bu xonaga biriktirilgan {$groupsCount} ta guruh mavjud. Avval guruhlarning dars xonasini o'zgartiring.");
        }

        $room->delete();

        return ['message' => "Xona bazadan butunlay o'chirildi"];
    }
}
