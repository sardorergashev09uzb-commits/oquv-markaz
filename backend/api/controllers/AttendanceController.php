<?php

declare(strict_types=1);

namespace api\controllers;

use api\components\JwtBearerAuth;
use common\models\Assessment;
use common\models\AssessmentScore;
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
     * Guruh bo'yicha darslar ro'yxati (Kunlik, Haftalik, Oylik filtrlar bilan)
     */
    public function actionIndex(): array
    {
        $user = Yii::$app->user->identity;
        $groupId = (int) Yii::$app->request->get('group_id');
        if (!$groupId) {
            if ($user && $user->role === User::ROLE_TEACHER) {
                $firstGroup = Group::findOne(['teacher_id' => $user->id, 'status' => Group::STATUS_ACTIVE]);
            } else {
                $firstGroup = Group::findOne(['status' => Group::STATUS_ACTIVE]);
            }
            $groupId = $firstGroup ? $firstGroup->id : 0;
        }

        $group = Group::findOne($groupId);
        if (!$group) {
            return [
                'lessons' => [],
                'group' => null,
                'available_months' => [],
                'period' => 'month',
                'month' => date('Y-m'),
            ];
        }

        if ($user && $user->role === User::ROLE_TEACHER && $group->teacher_id !== $user->id) {
            throw new \yii\web\ForbiddenHttpException("Siz faqat o'z guruhingiz davomatini ko'rishingiz mumkin.");
        }

        $period = trim((string) Yii::$app->request->get('period', 'month')); // 'today' | 'week' | 'month' | 'all'
        $selectedMonth = trim((string) Yii::$app->request->get('month', date('Y-m')));

        // Guruhdagi barcha darslar oylari ro'yxati (navigatsiya uchun)
        $allLessonsDates = Lesson::find()
            ->select('started_at')
            ->where(['group_id' => $groupId])
            ->asArray()
            ->all();

        $monthMap = [];
        foreach ($allLessonsDates as $ld) {
            if (!empty($ld['started_at'])) {
                $ym = substr($ld['started_at'], 0, 7);
                $monthMap[$ym] = true;
            }
        }
        $availableMonths = array_keys($monthMap);
        sort($availableMonths);

        $today = date('Y-m-d');
        $query = Lesson::find()->where(['group_id' => $groupId]);

        if ($period === 'today') {
            $query->andWhere(['like', 'started_at', $today . '%', false]);
        } elseif ($period === 'week') {
            $monday = date('Y-m-d 00:00:00', strtotime('monday this week'));
            $sunday = date('Y-m-d 23:59:59', strtotime('sunday this week'));
            $query->andWhere(['between', 'started_at', $monday, $sunday]);
        } elseif ($period === 'month') {
            $targetMonth = !empty($selectedMonth) ? $selectedMonth : date('Y-m');
            $startOfMonth = $targetMonth . '-01 00:00:00';
            $endOfMonth = date('Y-m-t 23:59:59', strtotime($startOfMonth));
            $query->andWhere(['between', 'started_at', $startOfMonth, $endOfMonth]);
        }

        // Xronologik tartibda (ASC) saralaymiz
        $lessons = $query->orderBy(['started_at' => SORT_ASC])->all();

        return [
            'group' => $group,
            'lessons' => $lessons,
            'period' => $period,
            'month' => $selectedMonth,
            'available_months' => $availableMonths,
            'today' => $today,
            'total_lessons' => count($lessons),
        ];
    }

    /**
     * GET /api/attendance/group-stats
     * Admin va Manager uchun guruhning umumiy o'quvchilar davomati tahlili
     */
    public function actionGroupStats(): array
    {
        $groupId = (int) Yii::$app->request->get('group_id');
        $month = trim((string) Yii::$app->request->get('month', ''));

        $group = Group::findOne($groupId);
        if (!$group) {
            throw new NotFoundHttpException("Guruh topilmadi.");
        }

        // Darslar filtri
        $lessonQuery = Lesson::find()->where(['group_id' => $groupId]);
        if (!empty($month)) {
            $startOfMonth = $month . '-01 00:00:00';
            $endOfMonth = date('Y-m-t 23:59:59', strtotime($startOfMonth));
            $lessonQuery->andWhere(['between', 'started_at', $startOfMonth, $endOfMonth]);
        }
        $lessons = $lessonQuery->all();
        $lessonIds = array_column($lessons, 'id');
        $totalLessons = count($lessons);

        // Faol o'quvchilar
        $students = User::find()
            ->innerJoin('{{%group_students}} gs', 'gs.student_id = {{%users}}.id')
            ->where([
                'gs.group_id' => $groupId,
                'gs.status' => GroupStudent::STATUS_ACTIVE,
                '{{%users}}.status' => User::STATUS_ACTIVE,
                '{{%users}}.role' => User::ROLE_STUDENT,
            ])
            ->orderBy(['name' => SORT_ASC])
            ->all();

        $stats = [];
        if (!empty($lessonIds) && !empty($students)) {
            $attendances = Attendance::find()
                ->where(['lesson_id' => $lessonIds])
                ->asArray()
                ->all();

            $scores = AssessmentScore::find()
                ->innerJoin('{{%assessments}} a', 'a.id = {{%assessment_scores}}.assessment_id')
                ->where(['a.lesson_id' => $lessonIds])
                ->asArray()
                ->all();

            $studentAttMap = [];
            foreach ($attendances as $att) {
                $sid = (int) $att['student_id'];
                if (!isset($studentAttMap[$sid])) {
                    $studentAttMap[$sid] = ['present' => 0, 'absent' => 0, 'late' => 0, 'excused' => 0];
                }
                $st = $att['status'];
                if (isset($studentAttMap[$sid][$st])) {
                    $studentAttMap[$sid][$st]++;
                }
            }

            $studentScoreMap = [];
            foreach ($scores as $sc) {
                $sid = (int) $sc['student_id'];
                if ($sc['score'] !== null) {
                    if (!isset($studentScoreMap[$sid])) {
                        $studentScoreMap[$sid] = [];
                    }
                    $studentScoreMap[$sid][] = (float) $sc['score'];
                }
            }

            foreach ($students as $stu) {
                $counts = $studentAttMap[$stu->id] ?? ['present' => 0, 'absent' => 0, 'late' => 0, 'excused' => 0];
                $scList = $studentScoreMap[$stu->id] ?? [];
                $avgSc = !empty($scList) ? round(array_sum($scList) / count($scList), 1) : null;
                $effectiveAtt = $counts['present'] + $counts['late'];
                $attRate = $totalLessons > 0 ? round(($effectiveAtt / $totalLessons) * 100) : 100;

                $stats[] = [
                    'student_id' => $stu->id,
                    'student_name' => $stu->name,
                    'phone' => $stu->phone,
                    'present_count' => $counts['present'],
                    'absent_count' => $counts['absent'],
                    'late_count' => $counts['late'],
                    'excused_count' => $counts['excused'],
                    'attendance_rate' => $attRate,
                    'average_score' => $avgSc,
                ];
            }
        }

        return [
            'group' => $group,
            'total_lessons' => $totalLessons,
            'month' => $month,
            'students' => $stats,
        ];
    }

    /**
     * GET /api/attendance/my — O'quvchining o'z shaxsiy davomat tarixi (DB dan)
     */
     public function actionMy(): array
     {
         $user = Yii::$app->user->identity;
         if (!$user) {
             throw new NotFoundHttpException("Foydalanuvchi topilmadi.");
         }

         $records = Attendance::find()
             ->with(['lesson.group'])
             ->where(['student_id' => $user->id])
             ->orderBy(['id' => SORT_DESC])
             ->limit(50)
             ->all();

         $total = count($records);
         $present = 0;
         $excused = 0;
         $items = [];
         foreach ($records as $r) {
             if ($r->status === Attendance::STATUS_PRESENT || $r->status === Attendance::STATUS_LATE) {
                 $present++;
             } elseif ($r->status === Attendance::STATUS_EXCUSED) {
                 $excused++;
             }
             $items[] = [
                 'id' => $r->id,
                 'lesson_id' => $r->lesson_id,
                 'topic' => $r->lesson->topic ?? 'Mavzu belgilanmagan',
                 'group_name' => $r->lesson->group->name ?? 'Guruh',
                 'date' => $r->lesson->started_at ?? date('Y-m-d'),
                 'status' => $r->status,
                 'note' => $r->note,
             ];
         }

         $effectiveTotal = max(0, $total - $excused);
         $rate = $effectiveTotal > 0 ? (int) round(($present / $effectiveTotal) * 100) : ($total > 0 ? 100 : 0);

         return [
             'rate' => $rate,
             'total' => $total,
             'present' => $present,
             'excused' => $excused,
             'items' => $items,
         ];
     }

    /**
     * GET /api/attendance/lesson/<lid:\d+>
     * Darsdagi barcha o'quvchilar ro'yxati va ularning davomati
     */
    public function actionLesson(int $lid): array
    {
        $user = Yii::$app->user->identity;
        if ($user && $user->role === User::ROLE_STUDENT) {
            throw new \yii\web\ForbiddenHttpException("O'quvchilarga guruh davomatini ko'rish taqiqlangan.");
        }

        $lesson = Lesson::find()->with(['group.teacher', 'group.course'])->where(['id' => $lid])->one();
        if (!$lesson) {
            throw new NotFoundHttpException("Dars topilmadi.");
        }

        if ($user && $user->role === User::ROLE_TEACHER && $lesson->group && $lesson->group->teacher_id !== $user->id) {
            throw new \yii\web\ForbiddenHttpException("Siz faqat o'z guruhingiz davomatini ko'rishingiz mumkin.");
        }

        // Guruhdagi faol o'quvchilar (faqat o'quvchi roli va aktiv bo'lganlar)
        $students = User::find()
            ->innerJoin('{{%group_students}} gs', 'gs.student_id = {{%users}}.id')
            ->where([
                'gs.group_id' => $lesson->group_id,
                'gs.status' => GroupStudent::STATUS_ACTIVE,
                '{{%users}}.status' => User::STATUS_ACTIVE,
                '{{%users}}.role' => User::ROLE_STUDENT,
            ])
            ->orderBy(['name' => SORT_ASC])
            ->all();

        // Mavjud davomatlar
        $attendances = Attendance::find()
            ->where(['lesson_id' => $lid])
            ->indexBy('student_id')
            ->all();

        // Mavjud baholar (Assessment & AssessmentScore)
        $assessment = Assessment::findOne(['lesson_id' => $lid]);
        $scores = [];
        if ($assessment) {
            $scores = AssessmentScore::find()
                ->where(['assessment_id' => $assessment->id])
                ->indexBy('student_id')
                ->all();
        }

        $list = [];
        foreach ($students as $student) {
            $att = $attendances[$student->id] ?? null;
            $sc = $scores[$student->id] ?? null;
            $list[] = [
                'student_id'   => $student->id,
                'student_name' => $student->name,
                'phone'        => $student->phone,
                'status'       => $att ? $att->status : Attendance::STATUS_PRESENT, // default present
                'note'         => $att ? $att->note : '',
                'score'        => $sc && $sc->score !== null ? (float) $sc->score : null,
                'feedback'     => $sc ? $sc->feedback : '',
            ];
        }

        return [
            'lesson' => $lesson,
            'group' => $lesson->group,
            'teacher_name' => $lesson->group && $lesson->group->teacher ? $lesson->group->teacher->name : null,
            'assessment' => $assessment,
            'students' => $list,
            'total' => count($list),
        ];
    }

    /**
     * POST /api/attendance/create-lesson
     * Yangi dars yaratish (Mavzu, Dars turi va Rejasi bilan)
     */
    public function actionCreateLesson(): array
    {
        $user = Yii::$app->user->identity;
        if ($user && $user->role === User::ROLE_STUDENT) {
            throw new \yii\web\ForbiddenHttpException("O'quvchilarga dars ochish taqiqlangan.");
        }

        $body = Yii::$app->request->bodyParams;
        $groupId = (int) ($body['group_id'] ?? 0);
        $group = Group::findOne($groupId);
        if (!$group) {
            throw new NotFoundHttpException("Guruh topilmadi.");
        }

        if ($user && $user->role === User::ROLE_TEACHER && $group->teacher_id !== $user->id) {
            throw new \yii\web\ForbiddenHttpException("Siz faqat o'z guruhingizga dars ochishingiz mumkin.");
        }

        $date = !empty($body['date']) ? $body['date'] : date('Y-m-d');
        $rawTopic = trim((string)($body['topic'] ?? ''));
        $lessonType = trim((string)($body['lesson_type'] ?? 'standard'));

        $typePrefixes = [
            'exam' => '[Imtihon] ',
            'revision' => '[Takrorlash] ',
            'practice' => '[Amaliyot] ',
            'standard' => '',
        ];
        $prefix = $typePrefixes[$lessonType] ?? '';

        if (empty($rawTopic)) {
            $topic = $prefix . "Bugungi dars (" . date('d.m.Y', strtotime($date)) . ")";
        } else {
            if ($prefix && !str_starts_with($rawTopic, '[')) {
                $topic = $prefix . $rawTopic;
            } else {
                $topic = $rawTopic;
            }
        }

        $lesson = new Lesson();
        $lesson->group_id = $groupId;
        $lesson->topic = $topic;
        $lesson->note = !empty($body['note']) ? trim((string)$body['note']) : null;
        $lesson->started_at = $date . ' ' . date('H:i:s');
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
     * Davomat va kunlik baholarni ommaviy saqlash
     */
    public function actionBulkSave(): array
    {
        $user = Yii::$app->user->identity;
        if ($user && $user->role === User::ROLE_STUDENT) {
            throw new \yii\web\ForbiddenHttpException("O'quvchilarga davomat belgilash taqiqlangan.");
        }

        $body = Yii::$app->request->bodyParams;
        $lessonId = (int) ($body['lesson_id'] ?? 0);
        $records = $body['attendance'] ?? []; // [{student_id: 1, status: 'present', note: '', score: 95, feedback: ''}]

        $lesson = Lesson::find()->with('group')->where(['id' => $lessonId])->one();
        if (!$lesson) {
            throw new NotFoundHttpException("Dars topilmadi.");
        }

        if ($user && $user->role === User::ROLE_TEACHER && $lesson->group && $lesson->group->teacher_id !== $user->id) {
            throw new \yii\web\ForbiddenHttpException("Siz faqat o'z guruhingiz davomatini belgilashingiz mumkin.");
        }

        if (!empty($body['topic'])) {
            $lesson->topic = trim((string)$body['topic']);
        }
        if (array_key_exists('note', $body)) {
            $lesson->note = trim((string)$body['note']);
        }

        $markedBy = $user ? $user->id : null;

        // Baholar mavjudligini tekshiramiz
        $hasAnyScore = false;
        foreach ($records as $item) {
            if (isset($item['score']) && $item['score'] !== null && $item['score'] !== '') {
                $hasAnyScore = true;
                break;
            }
        }

        $maxScore = !empty($body['max_score']) ? (int)$body['max_score'] : 100;
        $assessment = null;
        if ($hasAnyScore) {
            $assessment = Assessment::findOne(['lesson_id' => $lessonId]);
            if (!$assessment) {
                $assessment = new Assessment();
                $assessment->group_id = $lesson->group_id;
                $assessment->lesson_id = $lessonId;
                $assessment->title = "Dars bahosi: " . ($lesson->topic ?: "Dars #" . $lessonId);
                $assessment->type = Assessment::TYPE_QUIZ;
                $assessment->max_score = $maxScore;
                $assessment->date = $lesson->started_at ? substr($lesson->started_at, 0, 10) : date('Y-m-d');
                $assessment->created_by = $markedBy ?: 1;
                $assessment->save(false);
            } else {
                if ($maxScore > 0) {
                    $assessment->max_score = $maxScore;
                    $assessment->save(false);
                }
            }
        }

        $savedCount = 0;
        $savedScoresCount = 0;
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

            // Agar baho kiritilgan bo'lsa
            if ($assessment && isset($item['score']) && $item['score'] !== null && $item['score'] !== '') {
                $scoreVal = (float) $item['score'];
                $sc = AssessmentScore::findOne(['assessment_id' => $assessment->id, 'student_id' => $studentId]) ?? new AssessmentScore();
                $sc->assessment_id = $assessment->id;
                $sc->student_id = $studentId;
                $sc->score = $scoreVal;
                $sc->feedback = !empty($item['feedback']) ? (string)$item['feedback'] : ($note ?: null);
                $sc->status = AssessmentScore::STATUS_GRADED;
                $sc->graded_by = $markedBy;
                $sc->graded_at = time();
                if ($sc->save(false)) {
                    $savedScoresCount++;
                }
            } elseif ($assessment && isset($item['score']) && ($item['score'] === '' || $item['score'] === null)) {
                $sc = AssessmentScore::findOne(['assessment_id' => $assessment->id, 'student_id' => $studentId]);
                if ($sc) {
                    $sc->delete();
                }
            }
        }

        $lesson->status = Lesson::STATUS_COMPLETED;
        $lesson->save(false);

        return [
            'message' => "Davomat va baholar muvaffaqiyatli saqlandi",
            'saved_count' => $savedCount,
            'saved_scores_count' => $savedScoresCount,
        ];
    }
}
