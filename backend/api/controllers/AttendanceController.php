<?php

declare(strict_types=1);

namespace api\controllers;

use api\components\JwtBearerAuth;
use common\models\Attendance;
use common\models\Group;
use common\models\GroupStudent;
use common\models\Lesson;
use common\models\User;
use Yii;
use yii\rest\Controller;
use yii\web\BadRequestHttpException;
use yii\web\NotFoundHttpException;

/**
 * AttendanceController — Davomat tizimi
 */
class AttendanceController extends Controller
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
     * GET /api/attendance
     * Guruh bo'yicha darslar ro'yxati
     */
    public function actionIndex(): array
    {
        $groupId = (int) Yii::$app->request->get('group_id');
        if (!$groupId) {
            // Agar guruh ko'rsatilmagan bo'lsa, birinchi faol guruhni olamiz
            $firstGroup = Group::findOne(['status' => Group::STATUS_ACTIVE]);
            $groupId = $firstGroup ? $firstGroup->id : 0;
        }

        $group = Group::findOne($groupId);
        if (!$group) {
            return ['lessons' => [], 'group' => null];
        }

        $lessons = Lesson::find()
            ->where(['group_id' => $groupId])
            ->orderBy(['started_at' => SORT_DESC])
            ->limit(30)
            ->all();

        return [
            'group' => $group,
            'lessons' => $lessons,
        ];
    }

    /**
     * GET /api/attendance/lesson/<lid:\d+>
     * Darsdagi barcha o'quvchilar ro'yxati va ularning davomati
     */
    public function actionLesson(int $lid): array
    {
        $lesson = Lesson::find()->with('group')->where(['id' => $lid])->one();
        if (!$lesson) {
            throw new NotFoundHttpException("Dars topilmadi.");
        }

        // Guruhdagi faol o'quvchilar
        $students = User::find()
            ->innerJoin('{{%group_students}} gs', 'gs.student_id = {{%users}}.id')
            ->where(['gs.group_id' => $lesson->group_id, 'gs.status' => GroupStudent::STATUS_ACTIVE])
            ->orderBy(['name' => SORT_ASC])
            ->all();

        // Mavjud davomatlar
        $attendances = Attendance::find()
            ->where(['lesson_id' => $lid])
            ->indexBy('student_id')
            ->all();

        $list = [];
        foreach ($students as $student) {
            $att = $attendances[$student->id] ?? null;
            $list[] = [
                'student_id'   => $student->id,
                'student_name' => $student->name,
                'phone'        => $student->phone,
                'status'       => $att ? $att->status : Attendance::STATUS_PRESENT, // default present
                'note'         => $att ? $att->note : '',
            ];
        }

        return [
            'lesson' => $lesson,
            'students' => $list,
            'total' => count($list),
        ];
    }

    /**
     * POST /api/attendance/create-lesson
     * Yangi dars yaratish
     */
    public function actionCreateLesson(): array
    {
        $body = Yii::$app->request->bodyParams;
        $groupId = (int) ($body['group_id'] ?? 0);
        $group = Group::findOne($groupId);
        if (!$group) {
            throw new NotFoundHttpException("Guruh topilmadi.");
        }

        $lesson = new Lesson();
        $lesson->group_id = $groupId;
        $lesson->topic = $body['topic'] ?? 'Mavzu belgilanmagan';
        $lesson->started_at = $body['date'] ? $body['date'] . ' ' . date('H:i:s') : date('Y-m-d H:i:s');
        $lesson->status = Lesson::STATUS_ACTIVE;

        if (!$lesson->save()) {
            Yii::$app->response->statusCode = 422;
            return ['errors' => $lesson->getErrors()];
        }

        return [
            'message' => "Dars muvaffaqiyatli ochildi",
            'lesson' => $lesson,
        ];
    }

    /**
     * POST /api/attendance/bulk-save
     * O'qituvchi barcha o'quvchilar davomatini bitta so'rovda saqlaydi
     */
    public function actionBulkSave(): array
    {
        $body = Yii::$app->request->bodyParams;
        $lessonId = (int) ($body['lesson_id'] ?? 0);
        $records = $body['attendance'] ?? []; // [{student_id: 1, status: 'present', note: ''}]

        $lesson = Lesson::findOne($lessonId);
        if (!$lesson) {
            throw new NotFoundHttpException("Dars topilmadi.");
        }

        $user = Yii::$app->user->identity;
        $markedBy = $user ? $user->id : null;

        $savedCount = 0;
        foreach ($records as $item) {
            $studentId = (int) ($item['student_id'] ?? 0);
            if (!$studentId) continue;

            $status = $item['status'] ?? Attendance::STATUS_PRESENT;
            $note = $item['note'] ?? null;

            $att = Attendance::findOne(['lesson_id' => $lessonId, 'student_id' => $studentId]) ?? new Attendance();
            $att->lesson_id = $lessonId;
            $att->student_id = $studentId;
            $att->status = $status;
            $att->note = $note;
            $att->marked_by = $markedBy;

            if ($att->save(false)) {
                $savedCount++;
            }
        }

        $lesson->status = Lesson::STATUS_COMPLETED;
        $lesson->save(false);

        return [
            'message' => "Davomat saqlandi",
            'saved_count' => $savedCount,
        ];
    }
}
