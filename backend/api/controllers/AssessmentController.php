<?php

declare(strict_types=1);

namespace api\controllers;

use api\components\JwtBearerAuth;
use common\models\Assessment;
use common\models\AssessmentScore;
use common\models\Group;
use common\models\GroupStudent;
use common\models\User;
use Yii;
use yii\rest\Controller;
use yii\web\NotFoundHttpException;

/**
 * AssessmentController — Baholar va Imtihonlar boshqaruvi
 */
class AssessmentController extends Controller
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
     * GET /api/assessments
     */
    public function actionIndex(): array
    {
        $user = Yii::$app->user->identity;
        $groupId = Yii::$app->request->get('group_id');
        $query = Assessment::find()->with('group');

        if ($user && $user->role === User::ROLE_TEACHER) {
            $query->innerJoin('{{%groups}} g', 'g.id = {{%assessments}}.group_id')
                  ->andWhere(['g.teacher_id' => $user->id]);
        }

        if ($groupId) {
            $query->andWhere(['{{%assessments}}.group_id' => (int) $groupId]);
        }

        $query->orderBy(['date' => SORT_DESC, 'id' => SORT_DESC]);

        return [
            'items' => $query->all(),
        ];
    }

    /**
     * GET /api/assessments/my-scores — O'quvchining o'z imtihon va test natijalari
     */
    public function actionMyScores(): array
    {
        $user = Yii::$app->user->identity;
        if (!$user) {
            throw new NotFoundHttpException("Foydalanuvchi topilmadi.");
        }

        $groupIds = GroupStudent::find()
            ->select('group_id')
            ->where(['student_id' => $user->id, 'status' => GroupStudent::STATUS_ACTIVE])
            ->column();

        if (empty($groupIds)) {
            return [
                'scores' => [],
                'stats' => ['total' => 0, 'average' => 0, 'highest' => 0],
            ];
        }

        $assessments = Assessment::find()
            ->with('group')
            ->where(['group_id' => $groupIds])
            ->orderBy(['date' => SORT_DESC, 'id' => SORT_DESC])
            ->all();

        $assessmentIds = array_column($assessments, 'id');
        $myScores = empty($assessmentIds) ? [] : AssessmentScore::find()
            ->where(['assessment_id' => $assessmentIds, 'student_id' => $user->id])
            ->indexBy('assessment_id')
            ->all();

        $items = [];
        $totalScores = 0;
        $countGraded = 0;
        $highest = 0;

        foreach ($assessments as $a) {
            $sc = $myScores[$a->id] ?? null;
            $scoreVal = $sc && $sc->score !== null ? (float) $sc->score : null;
            if ($scoreVal !== null) {
                $totalScores += $scoreVal;
                $countGraded++;
                if ($scoreVal > $highest) {
                    $highest = $scoreVal;
                }
            }
            $items[] = [
                'id'            => $a->id,
                'title'         => $a->title,
                'type'          => $a->type,
                'max_score'     => $a->max_score,
                'date'          => $a->date,
                'group_name'    => $a->group ? $a->group->name : '',
                'score'         => $scoreVal,
                'feedback'      => $sc ? $sc->feedback : null,
                'status'        => $sc ? $sc->status : 'pending',
            ];
        }

        $avg = $countGraded > 0 ? round($totalScores / $countGraded, 1) : 0;

        return [
            'scores' => $items,
            'stats' => [
                'total' => count($items),
                'average' => $avg,
                'highest' => $highest,
            ],
        ];
    }

    /**
     * GET /api/assessments/{id}
     */
    public function actionView(int $id): array
    {
        $assessment = Assessment::find()->with('group')->where(['id' => $id])->one();
        if (!$assessment) {
            throw new NotFoundHttpException("Baholash topilmadi.");
        }

        $user = Yii::$app->user->identity;
        if ($user && $user->role === User::ROLE_STUDENT) {
            $sc = AssessmentScore::find()
                ->where(['assessment_id' => $id, 'student_id' => $user->id])
                ->one();
            return [
                'assessment' => $assessment,
                'scores' => [
                    [
                        'student_id'   => $user->id,
                        'student_name' => $user->name,
                        'score'        => $sc ? $sc->score : null,
                        'feedback'     => $sc ? $sc->feedback : '',
                        'status'       => $sc ? $sc->status : 'pending',
                    ]
                ],
            ];
        }

        if ($user && $user->role === User::ROLE_TEACHER && $assessment->group && $assessment->group->teacher_id !== $user->id) {
            throw new \yii\web\ForbiddenHttpException("Siz faqat o'z guruhingiz imtihonini ko'rishingiz mumkin.");
        }

        // Guruh o'quvchilari (faqat faol o'quvchilar)
        $students = User::find()
            ->innerJoin('{{%group_students}} gs', 'gs.student_id = {{%users}}.id')
            ->where([
                'gs.group_id' => $assessment->group_id,
                'gs.status' => GroupStudent::STATUS_ACTIVE,
                '{{%users}}.status' => User::STATUS_ACTIVE,
                '{{%users}}.role' => User::ROLE_STUDENT,
            ])
            ->orderBy(['name' => SORT_ASC])
            ->all();

        // Baholar
        $scores = AssessmentScore::find()
            ->where(['assessment_id' => $id])
            ->indexBy('student_id')
            ->all();

        $list = [];
        foreach ($students as $student) {
            $sc = $scores[$student->id] ?? null;
            $list[] = [
                'student_id'   => $student->id,
                'student_name' => $student->name,
                'score'        => $sc ? $sc->score : null,
                'feedback'     => $sc ? $sc->feedback : '',
                'status'       => $sc ? $sc->status : 'pending',
            ];
        }

        return [
            'assessment' => $assessment,
            'scores'     => $list,
        ];
    }

    /**
     * POST /api/assessments
     */
    public function actionCreate(): array
    {
        $user = Yii::$app->user->identity;
        if ($user && $user->role === User::ROLE_STUDENT) {
            throw new \yii\web\ForbiddenHttpException("O'quvchilarga imtihon yoki baholash yaratish taqiqlangan.");
        }

        $body = Yii::$app->request->bodyParams;
        $groupId = (int) ($body['group_id'] ?? 0);
        $group = Group::findOne($groupId);
        if (!$group) {
            throw new NotFoundHttpException("Guruh topilmadi.");
        }

        if ($user && $user->role === User::ROLE_TEACHER && $group->teacher_id !== $user->id) {
            throw new \yii\web\ForbiddenHttpException("Siz faqat o'z guruhingizga imtihon yaratishingiz mumkin.");
        }

        $assessment = new Assessment();
        $assessment->group_id = $groupId;
        $assessment->title = $body['title'] ?? 'Test';
        $assessment->type = $body['type'] ?? Assessment::TYPE_TEST;
        $assessment->max_score = (int) ($body['max_score'] ?? 100);
        $assessment->date = $body['date'] ?? date('Y-m-d');
        $assessment->deadline = $body['deadline'] ?? null;
        $assessment->description = $body['description'] ?? null;
        $assessment->created_by = $user ? $user->id : 1;

        if (!$assessment->save()) {
            Yii::$app->response->statusCode = 422;
            return ['errors' => $assessment->getErrors()];
        }

        Yii::$app->response->statusCode = 201;
        return [
            'message' => "Imtihon/Baholash yaratildi",
            'assessment' => $assessment,
        ];
    }

    /**
     * POST /api/assessments/{id}/save-scores
     * Barcha o'quvchilar ballarini saqlash
     */
    public function actionSaveScores(int $id): array
    {
        $user = Yii::$app->user->identity;
        if ($user && $user->role === User::ROLE_STUDENT) {
            throw new \yii\web\ForbiddenHttpException("O'quvchilarga baho qo'yish taqiqlangan.");
        }

        $assessment = Assessment::findOne($id);
        if (!$assessment) {
            throw new NotFoundHttpException("Baholash topilmadi.");
        }

        if ($user && $user->role === User::ROLE_TEACHER && $assessment->group && $assessment->group->teacher_id !== $user->id) {
            throw new \yii\web\ForbiddenHttpException("Siz faqat o'z guruhingiz o'quvchilarini baholashingiz mumkin.");
        }

        $body = Yii::$app->request->bodyParams;
        $scoresData = $body['scores'] ?? []; // [{student_id: 1, score: 85, feedback: ''}]

        $savedCount = 0;
        foreach ($scoresData as $item) {
            $studentId = (int) ($item['student_id'] ?? 0);
            if (!$studentId) continue;

            $scoreValue = isset($item['score']) && $item['score'] !== '' ? (float) $item['score'] : null;
            $feedback = $item['feedback'] ?? null;

            if ($scoreValue !== null) {
                $score = AssessmentScore::findOne(['assessment_id' => $id, 'student_id' => $studentId]) ?? new AssessmentScore();
                $score->assessment_id = $id;
                $score->student_id = $studentId;
                $score->score = $scoreValue;
                $score->feedback = $feedback;
                $score->status = AssessmentScore::STATUS_GRADED;
                $score->graded_by = $user ? $user->id : null;
                $score->graded_at = time();

                if ($score->save(false)) {
                    $savedCount++;
                }
            } else {
                $sc = AssessmentScore::findOne(['assessment_id' => $id, 'student_id' => $studentId]);
                if ($sc) {
                    $sc->delete();
                }
            }
        }

        return [
            'message' => "Baholar saqlandi",
            'saved_count' => $savedCount,
        ];
    }
}
