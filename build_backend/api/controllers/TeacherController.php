<?php

declare(strict_types=1);

namespace api\controllers;

use api\components\JwtBearerAuth;
use common\models\Group;
use common\models\User;
use Yii;
use yii\data\ActiveDataProvider;
use yii\rest\Controller;
use yii\web\NotFoundHttpException;

/**
 * TeacherController — O'qituvchilar boshqaruvi
 */
class TeacherController extends Controller
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
     * GET /api/teachers
     */
    public function actionIndex(): array
    {
        $request = Yii::$app->request;
        $search = $request->get('search');
        $status = $request->get('status');

        $query = User::find()->where(['role' => User::ROLE_TEACHER]);

        if ($search) {
            $query->andWhere([
                'or',
                ['like', 'name', $search],
                ['like', 'phone', $search],
                ['like', 'email', $search],
            ]);
        }

        if ($status !== null && $status !== '') {
            $query->andWhere(['status' => (int) $status]);
        }

        $query->orderBy(['name' => SORT_ASC]);

        $pageSize = (int) $request->get('per_page', 20);
        $provider = new ActiveDataProvider([
            'query' => $query,
            'pagination' => [
                'pageSize' => $pageSize,
            ],
        ]);

        return [
            'items' => $provider->getModels(),
            'pagination' => [
                'total' => $provider->getTotalCount(),
                'page' => $provider->getPagination()->getPage() + 1,
                'pageSize' => $pageSize,
                'pageCount' => $provider->getPagination()->getPageCount(),
            ],
        ];
    }

    /**
     * GET /api/teachers/{id}
     */
    public function actionView(int $id): array
    {
        $teacher = User::findOne(['id' => $id, 'role' => User::ROLE_TEACHER]);
        if (!$teacher) {
            throw new NotFoundHttpException("O'qituvchi topilmadi.");
        }

        $groups = Group::find()
            ->with(['course', 'room'])
            ->where(['teacher_id' => $id])
            ->all();

        return [
            'teacher' => $teacher,
            'groups' => $groups,
        ];
    }

    /**
     * POST /api/teachers
     */
    public function actionCreate(): array
    {
        $body = Yii::$app->request->bodyParams;

        $teacher = new User();
        $teacher->name = $body['name'] ?? null;
        $teacher->phone = $body['phone'] ?? null;
        $teacher->email = $body['email'] ?? null;
        $teacher->role = User::ROLE_TEACHER;
        $teacher->status = isset($body['status']) ? (int) $body['status'] : User::STATUS_ACTIVE;

        $rawPassword = $body['password'] ?? 'Teacher123!';
        $teacher->setPassword($rawPassword);
        $teacher->generateAuthKey();

        if (!$teacher->save()) {
            Yii::$app->response->statusCode = 422;
            return ['errors' => $teacher->getErrors()];
        }

        Yii::$app->response->statusCode = 201;
        return [
            'message' => "O'qituvchi muvaffaqiyatli qo'shildi",
            'teacher' => $teacher,
        ];
    }

    /**
     * PUT/PATCH /api/teachers/{id}
     */
    public function actionUpdate(int $id): array
    {
        $teacher = User::findOne(['id' => $id, 'role' => User::ROLE_TEACHER]);
        if (!$teacher) {
            throw new NotFoundHttpException("O'qituvchi topilmadi.");
        }

        $body = Yii::$app->request->bodyParams;
        if (isset($body['name'])) $teacher->name = $body['name'];
        if (isset($body['phone'])) $teacher->phone = $body['phone'];
        if (isset($body['email'])) $teacher->email = $body['email'];
        if (isset($body['status'])) $teacher->status = (int) $body['status'];
        if (!empty($body['password'])) {
            $teacher->setPassword($body['password']);
        }

        if (!$teacher->save()) {
            Yii::$app->response->statusCode = 422;
            return ['errors' => $teacher->getErrors()];
        }

        return [
            'message' => "O'qituvchi ma'lumotlari yangilandi",
            'teacher' => $teacher,
        ];
    }

    /**
     * DELETE /api/teachers/{id}
     */
    public function actionDelete(int $id): array
    {
        $teacher = User::findOne(['id' => $id, 'role' => User::ROLE_TEACHER]);
        if (!$teacher) {
            throw new NotFoundHttpException("O'qituvchi topilmadi.");
        }

        $teacher->status = User::STATUS_INACTIVE;
        $teacher->save(false);

        return ['message' => "O'qituvchi arxivlandi"];
    }
}
