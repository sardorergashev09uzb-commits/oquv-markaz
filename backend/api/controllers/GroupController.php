<?php

declare(strict_types=1);

namespace api\controllers;

use api\components\JwtBearerAuth;
use common\models\Course;
use common\models\Group;
use common\models\GroupStudent;
use common\models\Lesson;
use common\models\Room;
use common\models\User;
use Yii;
use yii\data\ActiveDataProvider;
use yii\rest\Controller;
use yii\web\BadRequestHttpException;
use yii\web\ForbiddenHttpException;
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

        if ($status !== null && $status !== '') {
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
     * GET /api/groups/{id} — Group Details + Students + Lessons
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

        $currentUser = Yii::$app->user->identity;
        if ($currentUser && $currentUser->role === User::ROLE_TEACHER) {
            if ($group->teacher_id !== $currentUser->id) {
                throw new ForbiddenHttpException("Siz faqat o'zingizga biriktirilgan guruh ma'lumotlarini ko'rishingiz mumkin.");
            }
        } elseif ($currentUser && $currentUser->role === User::ROLE_STUDENT) {
            $isEnrolled = GroupStudent::find()
                ->where(['group_id' => $id, 'student_id' => $currentUser->id, 'status' => GroupStudent::STATUS_ACTIVE])
                ->exists();
            if (!$isEnrolled) {
                throw new ForbiddenHttpException("Siz bu guruh a'zosi emassiz.");
            }
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

        // Guruh darslar ro'yxati
        $lessons = Lesson::find()
            ->where(['group_id' => $id])
            ->orderBy(['started_at' => SORT_ASC])
            ->all();

        return [
            'group' => $group,
            'students' => $students,
            'total_students' => count($students),
            'lessons' => $lessons,
            'total_lessons' => count($lessons),
        ];
    }

    /**
     * POST /api/groups
     */
    public function actionCreate(): array
    {
        $currentUser = Yii::$app->user->identity;
        $body = Yii::$app->request->bodyParams;

        $group = new Group();
        $group->name = trim((string)($body['name'] ?? ''));
        $group->course_id = (int) ($body['course_id'] ?? 0);

        // O'qituvchi bo'lsa yoki tanlangan bo'lsa
        $teacherId = (int) ($body['teacher_id'] ?? 0);
        if ($currentUser && $currentUser->role === User::ROLE_TEACHER && $teacherId <= 0) {
            $teacherId = $currentUser->id;
        }
        $group->teacher_id = $teacherId;

        // Xona tekshiruvi: 0 yoki bo'sh bo'lsa null bo'lsin
        $group->room_id = (!empty($body['room_id']) && (int) $body['room_id'] > 0) ? (int) $body['room_id'] : null;

        // Sana tekshiruvi: bo'sh satr kelganda null yoki bugungi sana qo'yiladi
        $startDate = !empty($body['start_date']) ? trim((string)$body['start_date']) : date('Y-m-d');
        $group->start_date = $startDate;
        $group->end_date = !empty($body['end_date']) ? trim((string)$body['end_date']) : null;
        $group->max_students = !empty($body['max_students']) ? (int) $body['max_students'] : 15;
        $group->status = !empty($body['status']) ? (string)$body['status'] : Group::STATUS_ACTIVE;

        if ($currentUser && !empty($currentUser->center_id)) {
            $group->center_id = (int) $currentUser->center_id;
        }

        // Schedule parsing
        $scheduleArray = null;
        if (!empty($body['schedule'])) {
            $scheduleArray = $body['schedule'];
            $group->schedule_json = is_array($body['schedule']) ? json_encode($body['schedule'], JSON_UNESCAPED_UNICODE) : (string) $body['schedule'];
        }

        if (!$group->save()) {
            Yii::$app->response->statusCode = 422;
            $allErrors = [];
            foreach ($group->getErrors() as $field => $errList) {
                $allErrors[] = implode(', ', $errList);
            }
            return [
                'message' => "Guruh ma'lumotlarida xatolik: " . implode('; ', $allErrors),
                'errors' => $group->getErrors(),
            ];
        }

        // ─── Avtomatik dars jadvalini yaratish (Auto Lesson Generator) ───
        $durationMonths = !empty($body['duration_months']) ? (int)$body['duration_months'] : 3;
        $daysStr = !empty($body['days']) ? (string)$body['days'] : 'Dush-Chor-Jum';
        $timeStr = !empty($body['time']) ? (string)$body['time'] : '14:00 - 16:00';

        if (is_array($scheduleArray) && !empty($scheduleArray) && empty($body['days'])) {
            $days = array_filter(array_column($scheduleArray, 'day'));
            if (!empty($days)) {
                $daysStr = implode('-', $days);
            }
            if (!empty($scheduleArray[0]['time'])) {
                $timeStr = $scheduleArray[0]['time'];
            }
        }

        $generatedCount = self::generateLessonsForGroup($group, $daysStr, $timeStr, $durationMonths, $startDate);

        Yii::$app->response->statusCode = 201;
        return [
            'message' => "Guruh muvaffaqiyatli yaratildi va {$generatedCount} ta dars rejasi avtomatik shakllantirildi",
            'group' => $group,
            'generated_lessons' => $generatedCount,
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

        $currentUser = Yii::$app->user->identity;
        if ($currentUser && $currentUser->role === User::ROLE_TEACHER) {
            if ($group->teacher_id !== $currentUser->id) {
                throw new ForbiddenHttpException("Siz faqat o'zingizga biriktirilgan guruhni tahrirlashingiz mumkin.");
            }
        }

        $body = Yii::$app->request->bodyParams;
        if (isset($body['name'])) $group->name = trim((string)$body['name']);
        if (isset($body['course_id'])) $group->course_id = (int) $body['course_id'];
        if (isset($body['teacher_id'])) $group->teacher_id = (int) $body['teacher_id'];
        if (array_key_exists('room_id', $body)) {
            $group->room_id = (!empty($body['room_id']) && (int) $body['room_id'] > 0) ? (int) $body['room_id'] : null;
        }
        if (isset($body['start_date'])) {
            $group->start_date = !empty($body['start_date']) ? trim((string)$body['start_date']) : null;
        }
        if (isset($body['end_date'])) {
            $group->end_date = !empty($body['end_date']) ? trim((string)$body['end_date']) : null;
        }
        if (isset($body['max_students'])) $group->max_students = (int) $body['max_students'];
        if (isset($body['status'])) $group->status = (string)$body['status'];

        if (isset($body['schedule'])) {
            $group->schedule_json = is_array($body['schedule']) ? json_encode($body['schedule'], JSON_UNESCAPED_UNICODE) : (string) $body['schedule'];
        }

        if (!$group->save()) {
            Yii::$app->response->statusCode = 422;
            $allErrors = [];
            foreach ($group->getErrors() as $field => $errList) {
                $allErrors[] = implode(', ', $errList);
            }
            return [
                'message' => "Guruh ma'lumotlarida xatolik: " . implode('; ', $allErrors),
                'errors' => $group->getErrors(),
            ];
        }

        return [
            'message' => "Guruh muvaffaqiyatli yangilandi",
            'group' => $group,
        ];
    }

    /**
     * POST /api/groups/{id}/generate-lessons
     * Guruh uchun darslar jadvalini avtomatik shakllantirish
     */
    public function actionGenerateLessons(int $id): array
    {
        $group = Group::findOne($id);
        if (!$group) {
            throw new NotFoundHttpException("Guruh topilmadi.");
        }

        $currentUser = Yii::$app->user->identity;
        if ($currentUser && $currentUser->role === User::ROLE_TEACHER) {
            if ($group->teacher_id !== $currentUser->id) {
                throw new ForbiddenHttpException("Siz faqat o'zingizga biriktirilgan guruh darslarini shakllantirishingiz mumkin.");
            }
        }

        $body = Yii::$app->request->bodyParams;
        $durationMonths = !empty($body['duration_months']) ? (int)$body['duration_months'] : 3;
        $daysStr = !empty($body['days']) ? (string)$body['days'] : 'Dush-Chor-Jum';
        $timeStr = !empty($body['time']) ? (string)$body['time'] : '14:00 - 16:00';
        $startDate = !empty($body['start_date']) ? (string)$body['start_date'] : ($group->start_date ?: date('Y-m-d'));

        if (!empty($group->schedule_json) && empty($body['days'])) {
            $decoded = json_decode($group->schedule_json, true);
            if (is_array($decoded) && !empty($decoded)) {
                $days = array_filter(array_column($decoded, 'day'));
                if (!empty($days)) $daysStr = implode('-', $days);
                if (!empty($decoded[0]['time'])) $timeStr = $decoded[0]['time'];
            }
        }

        if (!empty($body['force']) && $body['force'] === true) {
            Lesson::deleteAll(['group_id' => $group->id]);
        }

        $count = self::generateLessonsForGroup($group, $daysStr, $timeStr, $durationMonths, $startDate);

        return [
            'message' => "Guruh uchun {$count} ta dars jadvali shakllantirildi",
            'lessons_count' => $count,
        ];
    }

    /**
     * Guruh uchun avtomatik darslar rejasini shakllantirish (Standart o'quv markazi tizimi)
     */
    public static function generateLessonsForGroup(
        Group $group,
        string $daysStr,
        string $timeStr,
        int $durationMonths = 3,
        ?string $startDate = null
    ): int {
        $existingCount = Lesson::find()->where(['group_id' => $group->id])->count();
        if ($existingCount > 0) {
            return (int) $existingCount;
        }

        if (empty($startDate)) {
            $startDate = !empty($group->start_date) ? $group->start_date : date('Y-m-d');
        }

        if ($durationMonths <= 0) {
            $durationMonths = 3;
        }

        // Kunlarni aniqlash: Dush (1), Sesh (2), Chor (3), Pay (4), Jum (5), Shan (6), Yak (7)
        $dayMap = [
            'dush' => 1, 'mon' => 1, 'monday' => 1, '1' => 1,
            'sesh' => 2, 'tue' => 2, 'tuesday' => 2, '2' => 2,
            'chor' => 3, 'wed' => 3, 'wednesday' => 3, '3' => 3,
            'pay'  => 4, 'thu' => 4, 'thursday' => 4, '4' => 4,
            'jum'  => 5, 'fri' => 5, 'friday' => 5, '5' => 5,
            'shan' => 6, 'sat' => 6, 'saturday' => 6, '6' => 6,
            'yak'  => 7, 'sun' => 7, 'sunday' => 7, '7' => 7,
        ];

        $parts = preg_split('/[\s,\-_|]+/', mb_strtolower($daysStr));
        $targetDays = [];
        foreach ($parts as $p) {
            $pTrim = trim($p);
            if (isset($dayMap[$pTrim])) {
                $targetDays[] = $dayMap[$pTrim];
            }
        }
        $targetDays = array_values(array_unique(array_filter($targetDays)));

        if (empty($targetDays)) {
            $targetDays = [1, 3, 5];
        }
        sort($targetDays);

        $startTime = '14:00:00';
        $endTime = '16:00:00';
        if (preg_match_all('/(\d{1,2}:\d{2})/', $timeStr, $matches)) {
            if (!empty($matches[1][0])) {
                $startTime = strlen($matches[1][0]) === 5 ? $matches[1][0] . ':00' : $matches[1][0];
            }
            if (!empty($matches[1][1])) {
                $endTime = strlen($matches[1][1]) === 5 ? $matches[1][1] . ':00' : $matches[1][1];
            } else {
                $timeObj = \DateTime::createFromFormat('H:i:s', $startTime);
                if ($timeObj) {
                    $timeObj->modify('+2 hours');
                    $endTime = $timeObj->format('H:i:s');
                }
            }
        }

        $daysPerWeek = count($targetDays);
        $totalLessons = $durationMonths * 4 * $daysPerWeek;
        if ($totalLessons < 4) {
            $totalLessons = 12;
        }

        $currentDate = new \DateTime($startDate);
        $generatedCount = 0;
        $lastLessonDate = null;

        for ($lessonNum = 1; $lessonNum <= $totalLessons; $lessonNum++) {
            while (!in_array((int)$currentDate->format('N'), $targetDays, true)) {
                $currentDate->modify('+1 day');
            }

            $dateStr = $currentDate->format('Y-m-d');
            $startedAt = $dateStr . ' ' . $startTime;
            $endedAt = $dateStr . ' ' . $endTime;

            if ($lessonNum === 1) {
                $topic = "1-Dars: Kirish, guruh bilan tanishuv va kurs dasturi";
            } elseif ($lessonNum === (int)round($totalLessons / 2)) {
                $topic = "{$lessonNum}-Dars: Oraliq nazorat (Midterm imtihon) va bilimlarni baholash";
            } elseif ($lessonNum === $totalLessons - 1) {
                $topic = "{$lessonNum}-Dars: Kursni umumiy takrorlash va yakuniy imtihonga tayyorgarlik";
            } elseif ($lessonNum === $totalLessons) {
                $topic = "{$lessonNum}-Dars: Yakuniy imtihon va bitiruv loyihasi taqdimoti (Final exam)";
            } else {
                $topic = "{$lessonNum}-Dars: Nazariy tushunchalar va amaliy topshiriqlar";
            }

            $lesson = new Lesson();
            $lesson->group_id = $group->id;
            $lesson->topic = $topic;
            $lesson->started_at = $startedAt;
            $lesson->ended_at = $endedAt;
            $lesson->status = Lesson::STATUS_SCHEDULED;
            $lesson->note = "O'quv rejasidagi {$lessonNum}-dars";
            if ($lesson->save()) {
                $generatedCount++;
                $lastLessonDate = $dateStr;
            }

            $currentDate->modify('+1 day');
        }

        if ($lastLessonDate && empty($group->end_date)) {
            $group->end_date = $lastLessonDate;
            $group->save(false, ['end_date']);
        }

        return $generatedCount;
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

        $currentUser = Yii::$app->user->identity;
        if ($currentUser && $currentUser->role === User::ROLE_TEACHER) {
            if ($group->teacher_id !== $currentUser->id) {
                throw new ForbiddenHttpException("Siz faqat o'zingizga biriktirilgan guruhni o'chirishingiz mumkin.");
            }
        }

        $force = (int) Yii::$app->request->get('force', 0);
        if ($force === 1) {
            return $this->actionForceDelete($id);
        }

        $group->status = Group::STATUS_COMPLETED;
        $group->save(false);

        return ['message' => "Guruh yakunlandi/arxivlandi"];
    }

    /**
     * POST /api/groups/{id}/restore — Arxivdan chiqarish
     */
    public function actionRestore(int $id): array
    {
        $group = Group::findOne($id);
        if (!$group) {
            throw new NotFoundHttpException("Guruh topilmadi.");
        }

        $group->status = Group::STATUS_ACTIVE;
        $group->save(false);

        return [
            'message' => "Guruh arxivdan chiqarildi va qayta faollashtirildi",
            'group' => $group,
        ];
    }

    /**
     * DELETE /api/groups/{id}/force — Bazadan butunlay o'chirish
     */
    public function actionForceDelete(int $id): array
    {
        $group = Group::findOne($id);
        if (!$group) {
            throw new NotFoundHttpException("Guruh topilmadi.");
        }

        $currentUser = Yii::$app->user->identity;
        if ($currentUser && $currentUser->role !== User::ROLE_ADMIN) {
            throw new ForbiddenHttpException("Faqat administrator guruhni bazadan butunlay o'chira oladi.");
        }

        // Bog'liq darslar va jadvallarni tozalash
        Lesson::deleteAll(['group_id' => $id]);
        PaymentPlan::deleteAll(['group_id' => $id]);
        GroupStudent::deleteAll(['group_id' => $id]);

        $group->delete();

        return ['message' => "Guruh va unga tegishli jadvallar bazadan butunlay o'chirildi"];
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
