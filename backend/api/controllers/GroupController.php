<?php

declare(strict_types=1);

namespace api\controllers;

use api\components\JwtBearerAuth;
use common\models\Course;
use common\models\Group;
use common\models\GroupStudent;
use common\models\Room;
use common\models\User;
use Yii;
use yii\data\ActiveDataProvider;
use yii\rest\Controller;
use yii\web\BadRequestHttpException;
use yii\web\NotFoundHttpException;

/**
 * GroupController — Guruhlar boshqaruvi
 */
class GroupController extends Controller
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
     * GET /api/groups
     */
    public function actionIndex(): array
    {
        $request = Yii::$app->request;
        $search = $request->get('search');
        $courseId = $request->get('course_id');
        $teacherId = $request->get('teacher_id');
        $status = $request->get('status');
        $query = Group::find()->with(['course', 'teacher', 'room']);

        $currentUser = Yii::$app->user->identity;
        if ($currentUser && $currentUser->role === User::ROLE_STUDENT) {
            $query->innerJoin('{{%group_students}} gs', 'gs.group_id = {{%groups}}.id')
                  ->andWhere(['gs.student_id' => $currentUser->id, 'gs.status' => GroupStudent::STATUS_ACTIVE]);
        } elseif ($currentUser && $currentUser->role === User::ROLE_TEACHER) {
            $query->andWhere(['{{%groups}}.teacher_id' => $currentUser->id]);
        }

        if ($search) {
            $query->andWhere(['like', '{{%groups}}.name', $search]);
        }

        if ($courseId) {
            $query->andWhere(['{{%groups}}.course_id' => (int) $courseId]);
        }

        if ($teacherId) {
            $query->andWhere(['{{%groups}}.teacher_id' => (int) $teacherId]);
        }

        if ($status) {
            $query->andWhere(['{{%groups}}.status' => $status]);
        }

        $query->orderBy(['{{%groups}}.id' => SORT_DESC]);

        $provider = new ActiveDataProvider([
            'query' => $query,
            'pagination' => [
                'pageSize' => (int) $request->get('per_page', 50),
            ],
        ]);

        return [
            'items' => $provider->getModels(),
            'total' => $provider->getTotalCount(),
        ];
    }

    /**
     * GET /api/groups/{id} — Group Details + Students
     */
    public function actionView(int $id): array
    {
        $group = Group::find()
            ->with(['course', 'teacher', 'room'])
            ->where(['id' => $id])
            ->one();

        if (!$group) {
            throw new NotFoundHttpException("Guruh topilmadi.");
        }

        // Guruh o'quvchilari
        $memberships = GroupStudent::find()
            ->with('student')
            ->where(['group_id' => $id])
            ->orderBy(['id' => SORT_DESC])
            ->all();

        $students = [];
        foreach ($memberships as $m) {
            if ($m->student) {
                $students[] = [
                    'membership_id' => $m->id,
                    'student_id'    => $m->student_id,
                    'name'          => $m->student->name,
                    'phone'         => $m->student->phone,
                    'email'         => $m->student->email,
                    'enrolled_at'   => $m->enrolled_at,
                    'left_at'       => $m->left_at,
                    'status'        => $m->status,
                ];
            }
        }

        return [
            'group' => $group,
            'students' => $students,
            'total_students' => count($students),
        ];
    }

    /**
     * POST /api/groups
     */
    public function actionCreate(): array
    {
        $body = Yii::$app->request->bodyParams;

        $group = new Group();
        $group->name = $body['name'] ?? '';
        $group->course_id = (int) ($body['course_id'] ?? 0);
        $group->teacher_id = (int) ($body['teacher_id'] ?? 0);
        $group->room_id = !empty($body['room_id']) ? (int) $body['room_id'] : null;
        $group->start_date = $body['start_date'] ?? date('Y-m-d');
        $group->end_date = $body['end_date'] ?? null;
        $group->max_students = (int) ($body['max_students'] ?? 15);
        $group->status = $body['status'] ?? Group::STATUS_ACTIVE;

        if (!empty($body['schedule'])) {
            $group->schedule_json = is_array($body['schedule']) ? json_encode($body['schedule'], JSON_UNESCAPED_UNICODE) : (string) $body['schedule'];
        }

        if (!$group->save()) {
            Yii::$app->response->statusCode = 422;
            return ['errors' => $group->getErrors()];
        }

        Yii::$app->response->statusCode = 201;
        return [
            'message' => "Guruh muvaffaqiyatli yaratildi",
            'group' => $group,
        ];
    }

    /**
     * PUT/PATCH /api/groups/{id}
     */
    public function actionUpdate(int $id): array
    {
        $group = Group::findOne($id);
        if (!$group) {
            throw new NotFoundHttpException("Guruh topilmadi.");
        }

        $body = Yii::$app->request->bodyParams;
        if (isset($body['name'])) $group->name = $body['name'];
        if (isset($body['course_id'])) $group->course_id = (int) $body['course_id'];
        if (isset($body['teacher_id'])) $group->teacher_id = (int) $body['teacher_id'];
        if (array_key_exists('room_id', $body)) $group->room_id = $body['room_id'] ? (int) $body['room_id'] : null;
        if (isset($body['start_date'])) $group->start_date = $body['start_date'];
        if (isset($body['end_date'])) $group->end_date = $body['end_date'];
        if (isset($body['max_students'])) $group->max_students = (int) $body['max_students'];
        if (isset($body['status'])) $group->status = $body['status'];

        if (isset($body['schedule'])) {
            $group->schedule_json = is_array($body['schedule']) ? json_encode($body['schedule'], JSON_UNESCAPED_UNICODE) : (string) $body['schedule'];
        }

        if (!$group->save()) {
            Yii::$app->response->statusCode = 422;
            return ['errors' => $group->getErrors()];
        }

        return [
            'message' => "Guruh muvaffaqiyatli yangilandi",
            'group' => $group,
        ];
    }

    /**
     * DELETE /api/groups/{id}
     */
    public function actionDelete(int $id): array
    {
        $group = Group::findOne($id);
        if (!$group) {
            throw new NotFoundHttpException("Guruh topilmadi.");
        }

        $group->status = Group::STATUS_COMPLETED;
        $group->save(false);

        return ['message' => "Guruh yakunlandi/arxivlandi"];
    }

    /**
     * POST /api/groups/{id}/add-student
     */
    public function actionAddStudent(int $id): array
    {
        $group = Group::findOne($id);
        if (!$group) {
            throw new NotFoundHttpException("Guruh topilmadi.");
        }

        $studentId = (int) Yii::$app->request->getBodyParam('student_id');
        $student = User::findOne(['id' => $studentId, 'role' => User::ROLE_STUDENT]);
        if (!$student) {
            throw new NotFoundHttpException("O'quvchi topilmadi.");
        }

        $gs = GroupStudent::findOne(['group_id' => $id, 'student_id' => $studentId]);
        if ($gs) {
            $gs->status = GroupStudent::STATUS_ACTIVE;
            $gs->left_at = null;
        } else {
            $gs = new GroupStudent();
            $gs->group_id = $id;
            $gs->student_id = $studentId;
            $gs->enrolled_at = date('Y-m-d');
            $gs->status = GroupStudent::STATUS_ACTIVE;
        }

        if (!$gs->save()) {
            Yii::$app->response->statusCode = 422;
            return ['errors' => $gs->getErrors()];
        }

        return [
            'message' => "O'quvchi guruhga qo'shildi",
            'membership' => $gs,
        ];
    }

    /**
     * POST /api/groups/{id}/remove-student
     */
    public function actionRemoveStudent(int $id): array
    {
        $studentId = (int) Yii::$app->request->getBodyParam('student_id');
        $gs = GroupStudent::findOne(['group_id' => $id, 'student_id' => $studentId]);

        if (!$gs) {
            throw new NotFoundHttpException("O'quvchi bu guruhda mavjud emas.");
        }

        $gs->status = GroupStudent::STATUS_LEFT;
        $gs->left_at = date('Y-m-d');
        $gs->save(false);

        return ['message' => "O'quvchi guruhdan chiqarildi"];
    }
}
