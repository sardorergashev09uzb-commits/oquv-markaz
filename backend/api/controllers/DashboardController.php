<?php

declare(strict_types=1);

namespace api\controllers;

use api\components\JwtBearerAuth;
use common\models\Announcement;
use common\models\Attendance;
use common\models\Course;
use common\models\Group;
use common\models\GroupStudent;
use common\models\Lesson;
use common\models\Payment;
use common\models\PaymentPlan;
use common\models\Room;
use common\models\User;
use Yii;
use yii\rest\Controller;

/**
 * DashboardController — Markaz, Ustoz va O'quvchi statistikasi (Barchasi to'liq DB dan)
 */
class DashboardController extends Controller
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
     * GET /api/dashboard/manager — Ma'muriyat uchun umumiy statistika
     */
    public function actionManager(): array
    {
        $studentsCount = User::find()->where(['role' => User::ROLE_STUDENT, 'status' => User::STATUS_ACTIVE])->count();
        $teachersCount = User::find()->where(['role' => User::ROLE_TEACHER, 'status' => User::STATUS_ACTIVE])->count();
        $groupsCount = Group::find()->where(['status' => Group::STATUS_ACTIVE])->count();
        $coursesCount = Course::find()->where(['status' => Course::STATUS_ACTIVE])->count();
        $roomsCount = Room::find()->where(['status' => Room::STATUS_ACTIVE])->count();

        // Bugungi tushum (DB dagi to'lovlar jadvalidan)
        $today = date('Y-m-d');
        $todayIncome = (int) Payment::find()
            ->where(['>=', 'paid_at', $today . ' 00:00:00'])
            ->andWhere(['<=', 'paid_at', $today . ' 23:59:59'])
            ->sum('amount');

        // Qarzdorliklar soni (muddati o'tgan rejalashtirilgan to'lovlar)
        $overdueCount = (int) PaymentPlan::find()
            ->where(['status' => PaymentPlan::STATUS_OVERDUE])
            ->orWhere(['and', ['<', 'due_date', $today], ['in', 'status', [PaymentPlan::STATUS_PENDING, PaymentPlan::STATUS_PARTIAL]]])
            ->count();

        // O'rtacha davomat foizi (DB attendance jadvalidan)
        $totalAttendance = Attendance::find()->count();
        $presentAttendance = Attendance::find()->where(['status' => Attendance::STATUS_PRESENT])->count();
        $attendanceRate = $totalAttendance > 0 ? (int) round(($presentAttendance / $totalAttendance) * 100) : 100;

        // Bugungi darslar soni
        $todayLessons = (int) Lesson::find()
            ->where(['>=', 'started_at', $today . ' 00:00:00'])
            ->andWhere(['<=', 'started_at', $today . ' 23:59:59'])
            ->count();

        // So'nggi o'quvchilar
        $recentStudents = User::find()
            ->where(['role' => User::ROLE_STUDENT])
            ->orderBy(['id' => SORT_DESC])
            ->limit(5)
            ->all();

        // Faol guruhlar
        $activeGroups = Group::find()
            ->with(['course', 'teacher'])
            ->where(['status' => Group::STATUS_ACTIVE])
            ->limit(5)
            ->all();

        return [
            'stats' => [
                'students'      => (int) $studentsCount,
                'teachers'      => (int) $teachersCount,
                'groups'        => (int) $groupsCount,
                'courses'       => (int) $coursesCount,
                'rooms'         => (int) $roomsCount,
                'todayIncome'   => number_format($todayIncome, 0, '', ' '),
                'overdue'       => $overdueCount,
                'attendance'    => $attendanceRate,
                'todayLessons'  => $todayLessons,
            ],
            'recentStudents' => $recentStudents,
            'activeGroups'   => $activeGroups,
        ];
    }

    /**
     * GET /api/dashboard/student — O'quvchining shaxsiy ko'rsatkichlari (DB dan)
     */
    public function actionStudent(): array
    {
        $user = Yii::$app->user->identity;
        $studentId = $user ? $user->id : 0;

        // O'quvchining a'zo bo'lgan guruhlari
        $groups = Group::find()
            ->innerJoin('{{%group_students}} gs', 'gs.group_id = {{%groups}}.id')
            ->where(['gs.student_id' => $studentId, 'gs.status' => GroupStudent::STATUS_ACTIVE])
            ->with(['course', 'teacher', 'room'])
            ->all();

        // O'quvchining shaxsiy davomati (DB dan)
        $totalAtt = Attendance::find()->where(['student_id' => $studentId])->count();
        $presentAtt = Attendance::find()->where(['student_id' => $studentId, 'status' => Attendance::STATUS_PRESENT])->count();
        $attRate = $totalAtt > 0 ? (int) round(($presentAtt / $totalAtt) * 100) : 100;

        // O'quvchining to'lov holati
        $currentMonth = date('Y-m');
        $currentPlan = PaymentPlan::findOne(['student_id' => $studentId, 'month' => $currentMonth]);
        $unpaidPlans = PaymentPlan::find()
            ->where(['student_id' => $studentId])
            ->andWhere(['in', 'status', [PaymentPlan::STATUS_PENDING, PaymentPlan::STATUS_PARTIAL, PaymentPlan::STATUS_OVERDUE]])
            ->count();

        // Markaz e'lonlari
        $announcements = Announcement::find()
            ->orderBy(['published_at' => SORT_DESC, 'id' => SORT_DESC])
            ->limit(5)
            ->all();

        return [
            'groups_count' => count($groups),
            'attendance_rate' => $attRate,
            'has_unpaid' => $unpaidPlans > 0,
            'payment_status' => $currentPlan ? $currentPlan->status : ($unpaidPlans > 0 ? 'overdue' : 'paid'),
            'announcements_count' => count($announcements),
            'groups' => $groups,
            'announcements' => $announcements,
        ];
    }

    /**
     * GET /api/dashboard/teacher — O'qituvchining ko'rsatkichlari (DB dan)
     */
    public function actionTeacher(): array
    {
        $user = Yii::$app->user->identity;
        $teacherId = $user ? $user->id : 0;

        $groups = Group::find()
            ->where(['teacher_id' => $teacherId, 'status' => Group::STATUS_ACTIVE])
            ->with(['course', 'room'])
            ->all();

        $groupIds = array_map(fn($g) => $g->id, $groups);

        $totalStudents = count($groupIds) > 0 ? GroupStudent::find()
            ->where(['group_id' => $groupIds, 'status' => GroupStudent::STATUS_ACTIVE])
            ->count() : 0;

        $today = date('Y-m-d');
        $todayLessons = count($groupIds) > 0 ? Lesson::find()
            ->where(['group_id' => $groupIds])
            ->andWhere(['>=', 'started_at', $today . ' 00:00:00'])
            ->andWhere(['<=', 'started_at', $today . ' 23:59:59'])
            ->count() : 0;

        return [
            'groups_count' => count($groups),
            'students_count' => (int) $totalStudents,
            'today_lessons' => (int) $todayLessons,
            'groups' => $groups,
        ];
    }
}
