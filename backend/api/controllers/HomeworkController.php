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
 * HomeworkController — Uy vazifalari boshqaruvi, topshirish va baholash
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

        $items = $query->all();
        $result = [];

        foreach ($items as $hw) {
            $item = $hw->toArray();
            $item['group_name'] = ($hw->lesson && $hw->lesson->group) ? $hw->lesson->group->name : null;
            $item['group_id'] = ($hw->lesson && $hw->lesson->group) ? $hw->lesson->group->id : null;
            $item['lesson_topic'] = $hw->lesson ? $hw->lesson->topic : null;
            $item['lesson_date'] = $hw->lesson ? substr((string) $hw->lesson->started_at, 0, 10) : null;

            if ($currentUser && $currentUser->role === User::ROLE_STUDENT) {
                $sub = HomeworkSubmission::find()
                    ->where(['homework_id' => $hw->id, 'student_id' => $currentUser->id])
                    ->one();
                $item['my_submission'] = $sub ? [
                    'id'           => $sub->id,
                    'status'       => $sub->status,
                    'file_url'     => $sub->file_url,
                    'comment'      => $sub->comment,
                    'score'        => $sub->score,
                    'feedback'     => $sub->feedback,
                    'submitted_at' => $sub->submitted_at,
                    'graded_at'    => $sub->graded_at,
                ] : null;
            } else {
                $groupId = ($hw->lesson && $hw->lesson->group) ? $hw->lesson->group->id : null;
                $studentsCount = 0;
                if ($groupId) {
                    $studentsCount = (int) GroupStudent::find()
                        ->where(['group_id' => $groupId, 'status' => GroupStudent::STATUS_ACTIVE])
                        ->count();
                }
                $item['students_count'] = $studentsCount;
                $item['submissions_count'] = (int) HomeworkSubmission::find()
                    ->where(['homework_id' => $hw->id])
                    ->count();
                $item['graded_count'] = (int) HomeworkSubmission::find()
                    ->where(['homework_id' => $hw->id, 'status' => HomeworkSubmission::STATUS_GRADED])
                    ->count();
            }

            $result[] = $item;
        }

        return [
            'items' => $result,
        ];
    }

    /**
     * GET /api/homework/{id}/submissions
     * O'qituvchi va rahbarlar uchun o'quvchilar topshiriqlari ro'yxati
     */
    public function actionSubmissions(int $id): array
    {
        $currentUser = Yii::$app->user->identity;
        if ($currentUser && $currentUser->role === User::ROLE_STUDENT) {
            throw new ForbiddenHttpException("Ruxsat berilmagan.");
        }

        $hw = Homework::find()->with(['lesson', 'lesson.group'])->where(['id' => $id])->one();
        if (!$hw) {
            throw new NotFoundHttpException("Uy vazifasi topilmadi.");
        }

        $group = $hw->lesson ? $hw->lesson->group : null;
        if (!$group) {
            return [
                'homework' => [
                    'id'          => $hw->id,
                    'title'       => $hw->title,
                    'description' => $hw->description,
                    'deadline'    => $hw->deadline,
                    'max_score'   => $hw->max_score,
                    'group_name'  => '',
                    'lesson_topic'=> '',
                ],
                'items' => [],
            ];
        }

        $groupStudents = GroupStudent::find()
            ->where(['group_id' => $group->id, 'status' => GroupStudent::STATUS_ACTIVE])
            ->with(['student'])
            ->all();

        $existingSubmissions = HomeworkSubmission::find()
            ->where(['homework_id' => $id])
            ->indexBy('student_id')
            ->all();

        $items = [];
        foreach ($groupStudents as $gs) {
            $st = $gs->student;
            if (!$st) {
                continue;
            }

            $sub = $existingSubmissions[$st->id] ?? null;

            $items[] = [
                'student_id'    => $st->id,
                'student_name'  => $st->name,
                'student_phone' => $st->phone,
                'submission_id' => $sub ? $sub->id : null,
                'status'        => $sub ? $sub->status : HomeworkSubmission::STATUS_NOT_SUBMITTED,
                'file_url'      => $sub ? $sub->file_url : null,
                'comment'       => $sub ? $sub->comment : null,
                'score'         => $sub ? $sub->score : null,
                'feedback'      => $sub ? $sub->feedback : null,
                'submitted_at'  => $sub ? $sub->submitted_at : null,
                'graded_at'     => $sub ? $sub->graded_at : null,
            ];
        }

        // Tartiblash: topshirilgan va tekshirilmaganlar birinchi
        usort($items, function ($a, $b) {
            $priority = ['submitted' => 1, 'graded' => 2, 'not_submitted' => 3];
            $pA = $priority[$a['status']] ?? 4;
            $pB = $priority[$b['status']] ?? 4;
            return $pA <=> $pB;
        });

        return [
            'homework' => [
                'id'          => $hw->id,
                'title'       => $hw->title,
                'description' => $hw->description,
                'deadline'    => $hw->deadline,
                'max_score'   => $hw->max_score,
                'group_name'  => $group->name,
                'lesson_topic'=> $hw->lesson ? $hw->lesson->topic : '',
            ],
            'items' => $items,
        ];
    }

    /**
     * POST /api/homework/{id}/submit
     * O'quvchi uy vazifasini topshirishi yoki yangilashi
     */
    public function actionSubmit(int $id): array
    {
        $currentUser = Yii::$app->user->identity;
        if (!$currentUser) {
            throw new ForbiddenHttpException("Avtorizatsiyadan o'tilmagan.");
        }

        $hw = Homework::findOne($id);
        if (!$hw) {
            throw new NotFoundHttpException("Uy vazifasi topilmadi.");
        }

        $body = Yii::$app->request->bodyParams;
        $sub = HomeworkSubmission::findOne(['homework_id' => $id, 'student_id' => $currentUser->id]);
        if (!$sub) {
            $sub = new HomeworkSubmission();
            $sub->homework_id = $id;
            $sub->student_id = $currentUser->id;
        }

        $sub->file_url = trim((string)($body['file_url'] ?? $sub->file_url));
        $sub->comment = trim((string)($body['comment'] ?? $sub->comment));
        $sub->status = HomeworkSubmission::STATUS_SUBMITTED;
        $sub->submitted_at = time();

        if (!$sub->save()) {
            Yii::$app->response->statusCode = 422;
            return [
                'success' => false,
                'errors' => $sub->getErrors(),
            ];
        }

        return [
            'success' => true,
            'message' => "Uy vazifasi muvaffaqiyatli topshirildi!",
            'submission' => $sub,
        ];
    }

    /**
     * POST /api/homework/{id}/grade
     * O'qituvchi / Admin o'quvchi topshirig'ini baholashi
     */
    public function actionGrade(int $id): array
    {
        $currentUser = Yii::$app->user->identity;
        if ($currentUser && $currentUser->role === User::ROLE_STUDENT) {
            throw new ForbiddenHttpException("Faqat o'qituvchi va rahbarlar baholay oladi.");
        }

        $hw = Homework::findOne($id);
        if (!$hw) {
            throw new NotFoundHttpException("Uy vazifasi topilmadi.");
        }

        $body = Yii::$app->request->bodyParams;
        $submissionId = $body['submission_id'] ?? null;
        $studentId = $body['student_id'] ?? null;

        $sub = null;
        if ($submissionId) {
            $sub = HomeworkSubmission::findOne((int) $submissionId);
        } elseif ($studentId) {
            $sub = HomeworkSubmission::findOne(['homework_id' => $id, 'student_id' => (int) $studentId]);
            if (!$sub) {
                $sub = new HomeworkSubmission();
                $sub->homework_id = $id;
                $sub->student_id = (int) $studentId;
                $sub->submitted_at = time();
            }
        }

        if (!$sub) {
            throw new NotFoundHttpException("Topshiriq topilmadi.");
        }

        $score = isset($body['score']) ? (float) $body['score'] : null;
        if ($score !== null && ($score < 0 || $score > $hw->max_score)) {
            Yii::$app->response->statusCode = 422;
            return [
                'success' => false,
                'message' => "Baho 0 dan {$hw->max_score} gacha bo'lishi kerak.",
            ];
        }

        $sub->score = $score;
        $sub->feedback = trim((string)($body['feedback'] ?? ''));
        $sub->status = HomeworkSubmission::STATUS_GRADED;
        $sub->graded_at = time();

        if (!$sub->save()) {
            Yii::$app->response->statusCode = 422;
            return [
                'success' => false,
                'errors' => $sub->getErrors(),
            ];
        }

        return [
            'success' => true,
            'message' => "Vazifa muvaffaqiyatli baholandi!",
            'submission' => $sub,
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
