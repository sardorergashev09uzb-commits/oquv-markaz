<?php

declare(strict_types=1);

namespace api\controllers;

use api\components\JwtBearerAuth;
use common\models\GroupStudent;
use common\models\Homework;
use common\models\HomeworkSubmission;
use common\models\Lesson;
use common\models\User;
use Yii;
use yii\rest\Controller;
use yii\web\ForbiddenHttpException;
use yii\web\NotFoundHttpException;

/**
 * HomeworkController — Uy vazifalari boshqaruvi
 */
class HomeworkController extends Controller
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
     * GET /api/homework
     */
    public function actionIndex(): array
    {
        $lessonId = Yii::$app->request->get('lesson_id');
        $query = Homework::find()->with(['lesson', 'lesson.group']);

        $currentUser = Yii::$app->user->identity;
        if ($currentUser && $currentUser->role === User::ROLE_STUDENT) {
            $groupIds = GroupStudent::find()
                ->select('group_id')
                ->where(['student_id' => $currentUser->id, 'status' => GroupStudent::STATUS_ACTIVE])
                ->column();

            $query->innerJoin('{{%lessons}} l', 'l.id = {{%homework}}.lesson_id')
                  ->andWhere(['l.group_id' => $groupIds]);
        } elseif ($currentUser && $currentUser->role === User::ROLE_TEACHER) {
            $query->innerJoin('{{%lessons}} l', 'l.id = {{%homework}}.lesson_id')
                  ->innerJoin('{{%groups}} g', 'g.id = l.group_id')
                  ->andWhere(['g.teacher_id' => $currentUser->id]);
        }

        if ($lessonId) {
            $query->andWhere(['{{%homework}}.lesson_id' => (int) $lessonId]);
        }

        $query->orderBy(['{{%homework}}.id' => SORT_DESC]);

        return [
            'items' => $query->all(),
        ];
    }

    /**
     * POST /api/homework
     */
    public function actionCreate(): array
    {
        $currentUser = Yii::$app->user->identity;
        if ($currentUser && $currentUser->role === User::ROLE_STUDENT) {
            throw new ForbiddenHttpException("O'quvchilar uy vazifasi yarata olmaydi.");
        }
        $body = Yii::$app->request->bodyParams;

        $hw = new Homework();
        $hw->lesson_id = (int) ($body['lesson_id'] ?? 0);
        $hw->title = $body['title'] ?? 'Uy vazifasi';
        $hw->description = $body['description'] ?? null;
        $hw->deadline = $body['deadline'] ?? null;
        $hw->max_score = (int) ($body['max_score'] ?? 10);

        if (!$hw->save()) {
            Yii::$app->response->statusCode = 422;
            return ['errors' => $hw->getErrors()];
        }

        Yii::$app->response->statusCode = 201;
        return [
            'message' => "Uy vazifasi yaratildi",
            'homework' => $hw,
        ];
    }

    /**
     * GET /api/homework/{id}
     */
    public function actionView(int $id): array
    {
        $hw = Homework::find()->with(['lesson', 'lesson.group', 'submissions', 'submissions.student'])->where(['id' => $id])->one();
        if (!$hw) {
            throw new NotFoundHttpException("Uy vazifasi topilmadi.");
        }

        return [
            'homework' => $hw,
            'submissions' => $hw->submissions,
        ];
    }
}
