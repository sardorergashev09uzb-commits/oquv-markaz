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
        $groupId = Yii::$app->request->get('group_id');
        $query = Assessment::find()->with('group');

        if ($groupId) {
            $query->andWhere(['group_id' => (int) $groupId]);
        }

        $query->orderBy(['date' => SORT_DESC, 'id' => SORT_DESC]);

        return [
            'items' => $query->all(),
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

        // Guruh o'quvchilari
        $students = User::find()
            ->innerJoin('{{%group_students}} gs', 'gs.student_id = {{%users}}.id')
            ->where(['gs.group_id' => $assessment->group_id, 'gs.status' => GroupStudent::STATUS_ACTIVE])
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
        $body = Yii::$app->request->bodyParams;
        $user = Yii::$app->user->identity;

        $assessment = new Assessment();
        $assessment->group_id = (int) ($body['group_id'] ?? 0);
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
        $assessment = Assessment::findOne($id);
        if (!$assessment) {
            throw new NotFoundHttpException("Baholash topilmadi.");
        }

        $body = Yii::$app->request->bodyParams;
        $scoresData = $body['scores'] ?? []; // [{student_id: 1, score: 85, feedback: ''}]
        $user = Yii::$app->user->identity;

        $savedCount = 0;
        foreach ($scoresData as $item) {
            $studentId = (int) ($item['student_id'] ?? 0);
            if (!$studentId) continue;

            $scoreValue = isset($item['score']) && $item['score'] !== '' ? (float) $item['score'] : null;
            $feedback = $item['feedback'] ?? null;

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
        }

        return [
            'message' => "Baholar saqlandi",
            'saved_count' => $savedCount,
        ];
    }
}
