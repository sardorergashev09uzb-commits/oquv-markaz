<?php

declare(strict_types=1);

namespace api\controllers;

use api\components\JwtBearerAuth;
use common\models\Course;
use Yii;
use yii\data\ActiveDataProvider;
use yii\rest\Controller;
use yii\web\NotFoundHttpException;

/**
 * CourseController — Kurslar boshqaruvi
 */
class CourseController extends Controller
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
     * GET /api/courses
     */
    public function actionIndex(): array
    {
        $search = Yii::$app->request->get('search');
        $status = Yii::$app->request->get('status');

        $query = Course::find();

        if ($search) {
            $query->andWhere([
                'or',
                ['like', 'name', $search],
                ['like', 'level', $search],
                ['like', 'description', $search],
            ]);
        }

        if ($status !== null && $status !== '') {
            $query->andWhere(['status' => (int) $status]);
        }

        $query->orderBy(['id' => SORT_DESC]);

        $provider = new ActiveDataProvider([
            'query' => $query,
            'pagination' => [
                'pageSize' => (int) Yii::$app->request->get('per_page', 50),
            ],
        ]);

        return [
            'items' => $provider->getModels(),
            'total' => $provider->getTotalCount(),
        ];
    }

    /**
     * GET /api/courses/{id}
     */
    public function actionView(int $id): array
    {
        $course = Course::find()->with(['groups', 'groups.teacher'])->where(['id' => $id])->one();
        if (!$course) {
            throw new NotFoundHttpException("Kurs topilmadi.");
        }

        return [
            'course' => $course,
            'groups' => $course->groups,
        ];
    }

    /**
     * POST /api/courses
     */
    public function actionCreate(): array
    {
        $course = new Course();
        $course->attributes = Yii::$app->request->bodyParams;

        if (!$course->save()) {
            Yii::$app->response->statusCode = 422;
            return ['errors' => $course->getErrors()];
        }

        Yii::$app->response->statusCode = 201;
        return [
            'message' => "Kurs muvaffaqiyatli yaratildi",
            'course' => $course,
        ];
    }

    /**
     * PUT/PATCH /api/courses/{id}
     */
    public function actionUpdate(int $id): array
    {
        $course = Course::findOne($id);
        if (!$course) {
            throw new NotFoundHttpException("Kurs topilmadi.");
        }

        $course->attributes = Yii::$app->request->bodyParams;

        if (!$course->save()) {
            Yii::$app->response->statusCode = 422;
            return ['errors' => $course->getErrors()];
        }

        return [
            'message' => "Kurs yangilandi",
            'course' => $course,
        ];
    }

    /**
     * DELETE /api/courses/{id}
     */
    public function actionDelete(int $id): array
    {
        $course = Course::findOne($id);
        if (!$course) {
            throw new NotFoundHttpException("Kurs topilmadi.");
        }

        $force = (int) Yii::$app->request->get('force', 0);
        if ($force === 1) {
            return $this->actionForceDelete($id);
        }

        $course->status = Course::STATUS_INACTIVE;
        $course->save(false);

        return ['message' => "Kurs arxivlandi"];
    }

    /**
     * POST /api/courses/{id}/restore — Arxivdan chiqarish
     */
    public function actionRestore(int $id): array
    {
        $course = Course::findOne($id);
        if (!$course) {
            throw new NotFoundHttpException("Kurs topilmadi.");
        }

        $course->status = Course::STATUS_ACTIVE;
        $course->save(false);

        return [
            'message' => "Kurs arxivdan chiqarildi va qayta faollashtirildi",
            'course' => $course,
        ];
    }

    /**
     * DELETE /api/courses/{id}/force — Bazadan butunlay o'chirish
     */
    public function actionForceDelete(int $id): array
    {
        $course = Course::findOne($id);
        if (!$course) {
            throw new NotFoundHttpException("Kurs topilmadi.");
        }

        $groupsCount = $course->getGroups()->count();
        if ($groupsCount > 0) {
            throw new \yii\web\BadRequestHttpException("Ushbu kursga biriktirilgan {$groupsCount} ta guruh mavjud. Avval guruhlarni o'chiring yoki kursini almashtiring.");
        }

        $course->delete();

        return ['message' => "Kurs bazadan butunlay o'chirildi"];
    }
}
