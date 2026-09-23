<?php

declare(strict_types=1);

namespace api\controllers;

use api\components\JwtBearerAuth;
use common\models\Assessment;
use common\models\AssessmentScore;
use common\models\Attendance;
use common\models\Expense;
use common\models\Group;
use common\models\GroupStudent;
use common\models\Lesson;
use common\models\Payment;
use common\models\PaymentPlan;
use common\models\TeacherSalary;
use common\models\User;
use Yii;
use yii\db\Expression;
use yii\rest\Controller;

/**
 * ReportController — Analitika, hisobotlar va xavf ostidagi o'quvchilar
 */
class ReportController extends Controller
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
     * GET /api/reports/overview
     */
    public function actionOverview(): array
    {
        $currentMonth = date('Y-m');

        $totalStudents = User::find()->where(['role' => User::ROLE_STUDENT, 'status' => User::STATUS_ACTIVE])->count();
        $totalTeachers = User::find()->where(['role' => User::ROLE_TEACHER, 'status' => User::STATUS_ACTIVE])->count();
        $totalGroups = Group::find()->where(['status' => Group::STATUS_ACTIVE])->count();

        // Moliya — joriy oy
        $monthRevenue = (int) Payment::find()
            ->where(['like', 'paid_at', $currentMonth])
            ->sum('amount');

        $monthExpense = (int) Expense::find()
            ->where(['like', 'date', $currentMonth])
            ->sum('amount');

        // Davomat ko'rsatkichi
        $totalAttendance = Attendance::find()->count();
        $presentAttendance = Attendance::find()->where(['status' => [Attendance::STATUS_PRESENT, Attendance::STATUS_LATE]])->count();
        $avgAttendanceRate = $totalAttendance > 0 ? round(($presentAttendance / $totalAttendance) * 100, 1) : 100;

        // Xavf ostidagi o'quvchilar soni
        $riskCount = $this->calculateRiskStudentsCount();

        return [
            'total_students'      => (int) $totalStudents,
            'total_teachers'      => (int) $totalTeachers,
            'total_groups'        => (int) $totalGroups,
            'month_revenue'       => $monthRevenue,
            'month_expense'       => $monthExpense,
            'month_net_profit'    => $monthRevenue - $monthExpense,
            'avg_attendance_rate' => $avgAttendanceRate,
            'risk_students_count' => $riskCount,
        ];
    }

    /**
     * GET /api/reports/finance
     */
    public function actionFinance(): array
    {
        $user = Yii::$app->user->identity;
        if ($user && in_array($user->role, [User::ROLE_TEACHER, User::ROLE_STUDENT])) {
            throw new \yii\web\ForbiddenHttpException("Moliya hisoboti faqat rahbar va menejerlar uchun.");
        }

        // 1. Oxirgi 6 oylik trend
        $monthlyTrend = [];
        for ($i = 5; $i >= 0; $i--) {
            $month = date('Y-m', strtotime("-{$i} months"));
            $revenue = (int) Payment::find()->where(['like', 'paid_at', $month])->sum('amount');
            $expense = (int) Expense::find()->where(['like', 'date', $month])->sum('amount');
            $monthlyTrend[] = [
                'month'   => $month,
                'revenue' => $revenue,
                'expense' => $expense,
                'profit'  => $revenue - $expense,
            ];
        }

        // 2. To'lov usullari bo'yicha taqsimot
        $methodsRaw = Payment::find()
            ->select(['method', new Expression('SUM(amount) as total'), new Expression('COUNT(*) as count')])
            ->groupBy('method')
            ->asArray()
            ->all();

        $totalPaidSum = (int) Payment::find()->sum('amount');
        $paymentMethods = [];
        foreach ($methodsRaw as $m) {
            $sum = (int) $m['total'];
            $pct = $totalPaidSum > 0 ? round(($sum / $totalPaidSum) * 100, 1) : 0;
            $paymentMethods[] = [
                'method'     => $m['method'],
                'total'      => $sum,
                'count'      => (int) $m['count'],
                'percentage' => $pct,
            ];
        }

        // 3. Kutilayotgan vs undirilgan tushum
        $totalPlanAmount = (int) PaymentPlan::find()->sum('amount');
        $totalCollected = (int) PaymentPlan::find()->sum('paid_amount');
        $pendingDebt = max(0, $totalPlanAmount - $totalCollected);
        $collectionRate = $totalPlanAmount > 0 ? round(($totalCollected / $totalPlanAmount) * 100, 1) : 0;

        // 4. Xarajatlar toifalari
        $expensesByCategory = Expense::find()
            ->select(['category', new Expression('SUM(amount) as total'), new Expression('COUNT(*) as count')])
            ->groupBy('category')
            ->asArray()
            ->all();

        return [
            'monthly_trend'        => $monthlyTrend,
            'payment_methods'      => $paymentMethods,
            'total_plan_amount'    => $totalPlanAmount,
            'total_collected'      => $totalCollected,
            'pending_debt'         => $pendingDebt,
            'collection_rate'      => $collectionRate,
            'expenses_by_category' => $expensesByCategory,
        ];
    }

    /**
     * GET /api/reports/attendance
     */
    public function actionAttendance(): array
    {
        // 1. Umumiy statuslar bo'yicha
        $total = (int) Attendance::find()->count();
        $present = (int) Attendance::find()->where(['status' => Attendance::STATUS_PRESENT])->count();
        $absent = (int) Attendance::find()->where(['status' => Attendance::STATUS_ABSENT])->count();
        $late = (int) Attendance::find()->where(['status' => Attendance::STATUS_LATE])->count();
        $excused = (int) Attendance::find()->where(['status' => Attendance::STATUS_EXCUSED])->count();

        $overall = [
            'total'      => $total,
            'present'    => $present,
            'absent'     => $absent,
            'late'       => $late,
            'excused'    => $excused,
            'rate'       => $total > 0 ? round((($present + $late) / $total) * 100, 1) : 100,
        ];

        // 2. Guruhlar bo'yicha davomat
        $groups = Group::find()->with(['course'])->all();
        $groupStats = [];
        foreach ($groups as $group) {
            $lessonIds = Lesson::find()->where(['group_id' => $group->id])->select('id')->column();
            if (empty($lessonIds)) {
                $groupStats[] = [
                    'group_id'   => $group->id,
                    'group_name' => $group->name,
                    'course_name'=> $group->course ? $group->course->name : '',
                    'total'      => 0,
                    'present'    => 0,
                    'rate'       => 100,
                ];
                continue;
            }

            $gTotal = (int) Attendance::find()->where(['lesson_id' => $lessonIds])->count();
            $gPresent = (int) Attendance::find()->where(['lesson_id' => $lessonIds, 'status' => [Attendance::STATUS_PRESENT, Attendance::STATUS_LATE]])->count();
            $gRate = $gTotal > 0 ? round(($gPresent / $gTotal) * 100, 1) : 100;

            $groupStats[] = [
                'group_id'   => $group->id,
                'group_name' => $group->name,
                'course_name'=> $group->course ? $group->course->name : '',
                'total'      => $gTotal,
                'present'    => $gPresent,
                'rate'       => $gRate,
            ];
        }

        // Tartiblash (reyting bo'yicha)
        usort($groupStats, fn($a, $b) => $b['rate'] <=> $a['rate']);

        // 3. So'nggi darslar davomati trendi
        $recentLessons = Lesson::find()
            ->with(['group'])
            ->orderBy(['started_at' => SORT_DESC, 'id' => SORT_DESC])
            ->limit(10)
            ->all();

        $lessonTrend = [];
        foreach ($recentLessons as $l) {
            $attTotal = (int) Attendance::find()->where(['lesson_id' => $l->id])->count();
            $attPresent = (int) Attendance::find()->where(['lesson_id' => $l->id, 'status' => [Attendance::STATUS_PRESENT, Attendance::STATUS_LATE]])->count();
            $lessonTrend[] = [
                'lesson_id'   => $l->id,
                'title'       => $l->topic ?: "Dars #{$l->id}",
                'group_name'  => $l->group ? $l->group->name : '',
                'date'        => substr((string) $l->started_at, 0, 10),
                'total'       => $attTotal,
                'present'     => $attPresent,
                'rate'        => $attTotal > 0 ? round(($attPresent / $attTotal) * 100, 1) : 100,
            ];
        }

        return [
            'overall'      => $overall,
            'group_stats'  => $groupStats,
            'lesson_trend' => $lessonTrend,
        ];
    }

    /**
     * GET /api/reports/risk-students
     * Ketib qolish (churn) xavfi yuqori bo'lgan o'quvchilar tahlili
     */
    public function actionRiskStudents(): array
    {
        $user = Yii::$app->user->identity;
        if ($user && $user->role === User::ROLE_STUDENT) {
            throw new \yii\web\ForbiddenHttpException("Ruxsat berilmagan.");
        }

        $query = User::find()->where(['role' => User::ROLE_STUDENT, 'status' => User::STATUS_ACTIVE]);
        if ($user && $user->role === User::ROLE_TEACHER) {
            $teacherGroupIds = Group::find()->where(['teacher_id' => $user->id])->select('id')->column();
            $query->innerJoin('{{%group_students}} tgs', 'tgs.student_id = {{%users}}.id')
                  ->andWhere(['tgs.group_id' => $teacherGroupIds, 'tgs.status' => GroupStudent::STATUS_ACTIVE]);
        }
        $students = $query->all();

        $riskList = [];

        foreach ($students as $student) {
            $reasons = [];
            $riskScore = 0;

            // 1. Davomat tekshiruvi
            $totalAtt = (int) Attendance::find()->where(['student_id' => $student->id])->count();
            $presentAtt = (int) Attendance::find()->where(['student_id' => $student->id, 'status' => [Attendance::STATUS_PRESENT, Attendance::STATUS_LATE]])->count();
            $attRate = $totalAtt > 0 ? round(($presentAtt / $totalAtt) * 100, 1) : 100;

            if ($totalAtt >= 3 && $attRate < 70) {
                $reasons[] = "Davomat juda past ({$attRate}%)";
                $riskScore += 40;
            } elseif ($totalAtt >= 3 && $attRate < 80) {
                $reasons[] = "Davomat pasaygan ({$attRate}%)";
                $riskScore += 20;
            }

            // Oxirgi 3 ta darsdan qatnashmaganlik tekshiruvi
            $lastAtts = Attendance::find()
                ->where(['student_id' => $student->id])
                ->orderBy(['id' => SORT_DESC])
                ->limit(3)
                ->all();
            $absentStreak = 0;
            foreach ($lastAtts as $la) {
                if ($la->status === Attendance::STATUS_ABSENT) {
                    $absentStreak++;
                }
            }
            if ($absentStreak >= 2) {
                $reasons[] = "So'nggi darslarga ketma-ket kelmagan ({$absentStreak} marta)";
                $riskScore += 30;
            }

            // 2. To'lov qarzdorligi tekshiruvi
            $debtPlans = PaymentPlan::find()
                ->where(['student_id' => $student->id])
                ->andWhere(['in', 'status', [PaymentPlan::STATUS_OVERDUE, PaymentPlan::STATUS_PARTIAL, PaymentPlan::STATUS_PENDING]])
                ->all();

            $totalDebt = 0;
            $overdueCount = 0;
            $today = date('Y-m-d');
            foreach ($debtPlans as $dp) {
                $debt = $dp->amount - $dp->paid_amount;
                if ($debt > 0) {
                    $totalDebt += $debt;
                    if ($dp->due_date < $today) {
                        $overdueCount++;
                    }
                }
            }

            if ($overdueCount > 0) {
                $reasons[] = "Muddati o'tgan to'lov qarzdorligi (" . number_format($totalDebt, 0, '', ' ') . " so'm)";
                $riskScore += 40;
            } elseif ($totalDebt > 0) {
                $reasons[] = "To'lanmagan to'lov rejasi mavjud (" . number_format($totalDebt, 0, '', ' ') . " so'm)";
                $riskScore += 15;
            }

            // Agar risk aniqlangan bo'lsa
            if ($riskScore >= 30) {
                // Guruh va o'qituvchisini topish
                $groupStudent = GroupStudent::find()->where(['student_id' => $student->id, 'status' => GroupStudent::STATUS_ACTIVE])->one();
                $group = $groupStudent ? Group::findOne($groupStudent->group_id) : null;
                $teacher = $group && $group->teacher_id ? User::findOne($group->teacher_id) : null;

                $riskList[] = [
                    'student_id'     => $student->id,
                    'student_name'   => $student->name,
                    'phone'          => $student->phone,
                    'group_name'     => $group ? $group->name : 'Biriktirilmagan',
                    'teacher_name'   => $teacher ? $teacher->name : 'Biriktirilmagan',
                    'attendance_rate'=> $attRate,
                    'total_debt'     => $totalDebt,
                    'risk_level'     => $riskScore >= 60 ? 'high' : 'medium',
                    'risk_score'     => $riskScore,
                    'reasons'        => $reasons,
                ];
            }
        }

        // Xavfi eng yuqori bo'lganlarni tepaga qo'yish
        usort($riskList, fn($a, $b) => $b['risk_score'] <=> $a['risk_score']);

        return [
            'items' => $riskList,
            'total' => count($riskList),
        ];
    }

    /**
     * GET /api/reports/teachers
     * O'qituvchilar KPI va samaradorligi
     */
    public function actionTeachers(): array
    {
        $user = Yii::$app->user->identity;
        if ($user && $user->role === User::ROLE_STUDENT) {
            throw new \yii\web\ForbiddenHttpException("Ruxsat berilmagan.");
        }

        $query = User::find()->where(['role' => User::ROLE_TEACHER, 'status' => User::STATUS_ACTIVE]);
        if ($user && $user->role === User::ROLE_TEACHER) {
            $query->andWhere(['id' => $user->id]);
        }
        $teachers = $query->all();

        $result = [];

        foreach ($teachers as $t) {
            $groups = Group::find()->where(['teacher_id' => $t->id, 'status' => Group::STATUS_ACTIVE])->all();
            $groupIds = array_map(fn($g) => $g->id, $groups);

            $studentsCount = 0;
            if (!empty($groupIds)) {
                $studentsCount = (int) GroupStudent::find()
                    ->where(['group_id' => $groupIds, 'status' => GroupStudent::STATUS_ACTIVE])
                    ->count();
            }

            // O'rtacha davomat
            $avgAttendance = 100;
            if (!empty($groupIds)) {
                $lessonIds = Lesson::find()->where(['group_id' => $groupIds])->select('id')->column();
                if (!empty($lessonIds)) {
                    $attTotal = (int) Attendance::find()->where(['lesson_id' => $lessonIds])->count();
                    $attPresent = (int) Attendance::find()->where(['lesson_id' => $lessonIds, 'status' => [Attendance::STATUS_PRESENT, Attendance::STATUS_LATE]])->count();
                    if ($attTotal > 0) {
                        $avgAttendance = round(($attPresent / $attTotal) * 100, 1);
                    }
                }
            }

            // O'rtacha baho
            $avgScore = null;
            if (!empty($groupIds)) {
                $score = AssessmentScore::find()
                    ->innerJoinWith('assessment')
                    ->where(['assessments.group_id' => $groupIds])
                    ->average('score');
                if ($score !== null) {
                    $avgScore = round((float) $score, 1);
                }
            }

            // Oxirgi to'langan oylik
            $lastSalary = (int) TeacherSalary::find()
                ->where(['teacher_id' => $t->id])
                ->orderBy(['id' => SORT_DESC])
                ->select('amount')
                ->scalar();

            $result[] = [
                'teacher_id'     => $t->id,
                'teacher_name'   => $t->name,
                'phone'          => $t->phone,
                'groups_count'   => count($groups),
                'students_count' => $studentsCount,
                'avg_attendance' => $avgAttendance,
                'avg_score'      => $avgScore,
                'last_salary'    => $lastSalary,
            ];
        }

        return [
            'items' => $result,
            'total' => count($result),
        ];
    }

    /**
     * GET /api/reports/monthly-group-summary
     * Guruh bo'yicha oylik to'liq hisobot (davomat + baho + to'lov)
     */
    public function actionMonthlyGroupSummary(): array
    {
        $user = Yii::$app->user->identity;
        $groupId = (int) Yii::$app->request->get('group_id');
        $month = Yii::$app->request->get('month') ?: date('Y-m');

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
                'group' => null,
                'month' => $month,
                'stats' => null,
                'students' => [],
            ];
        }

        if ($user && $user->role === User::ROLE_TEACHER && $group->teacher_id !== $user->id) {
            throw new \yii\web\ForbiddenHttpException("Siz faqat o'zingizning guruhlaringiz hisobotini ko'rishingiz mumkin.");
        }

        // Oy bo'yicha rejalashtirilgan va o'tkazilgan darslar
        $lessons = Lesson::find()
            ->where(['group_id' => $groupId])
            ->andWhere(['like', 'started_at', $month])
            ->orderBy(['started_at' => SORT_ASC])
            ->all();

        $lessonIds = array_map(fn($l) => $l->id, $lessons);
        $totalPlannedLessons = count($lessons);

        // O'tilgan (bajarilgan yoki davomat qilingan) darslar
        $conductedLessonsCount = 0;
        $conductedLessonIds = [];
        if (!empty($lessonIds)) {
            $attLessonIds = Attendance::find()
                ->where(['lesson_id' => $lessonIds])
                ->select('lesson_id')
                ->distinct()
                ->column();

            $completedLessonIds = Lesson::find()
                ->where(['id' => $lessonIds, 'status' => Lesson::STATUS_COMPLETED])
                ->select('id')
                ->column();

            $conductedLessonIds = array_unique(array_merge($attLessonIds, $completedLessonIds));
            $conductedLessonsCount = count($conductedLessonIds);
        }

        // Faol o'quvchilar (faqat o'quvchi roli va aktiv bo'lganlar)
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

        // Ushbu oydagi yoki ushbu darslardagi barcha baholashlar
        $assessments = Assessment::find()
            ->where(['group_id' => $groupId])
            ->andWhere(['or', ['lesson_id' => $lessonIds], ['like', 'date', $month]])
            ->all();
        $assessmentIds = array_map(fn($a) => $a->id, $assessments);

        $studentRows = [];
        $totalPresentOverall = 0;
        $totalDebtSum = 0;
        $totalCollectedSum = 0;
        $totalExpectedSum = 0;
        $allScoresSum = 0;
        $allScoresCount = 0;

        foreach ($students as $student) {
            // 1. Davomat
            $presentCount = 0;
            $lateCount = 0;
            $absentCount = 0;
            $excusedCount = 0;

            if (!empty($lessonIds)) {
                $atts = Attendance::find()
                    ->where(['student_id' => $student->id, 'lesson_id' => $lessonIds])
                    ->all();

                foreach ($atts as $att) {
                    if ($att->status === Attendance::STATUS_PRESENT) $presentCount++;
                    elseif ($att->status === Attendance::STATUS_LATE) $lateCount++;
                    elseif ($att->status === Attendance::STATUS_ABSENT) $absentCount++;
                    elseif ($att->status === Attendance::STATUS_EXCUSED) $excusedCount++;
                }
            }

            $effectivePresent = $presentCount + $lateCount;
            $attRate = $conductedLessonsCount > 0
                ? round(($effectivePresent / $conductedLessonsCount) * 100, 1)
                : ($totalPlannedLessons > 0 ? round(($effectivePresent / $totalPlannedLessons) * 100, 1) : 100);
            $totalPresentOverall += $effectivePresent;

            // 2. Baholar
            $avgScore = null;
            if (!empty($assessmentIds)) {
                $score = AssessmentScore::find()
                    ->where(['assessment_id' => $assessmentIds, 'student_id' => $student->id])
                    ->andWhere(['not', ['score' => null]])
                    ->average('score');
                if ($score !== null) {
                    $avgScore = round((float) $score, 1);
                    $allScoresSum += $avgScore;
                    $allScoresCount++;
                }
            }

            // 3. To'lov
            $plan = PaymentPlan::find()
                ->where(['student_id' => $student->id, 'group_id' => $groupId])
                ->andWhere(['like', 'month', $month])
                ->one();

            if (!$plan) {
                // Agar oylik plan topilmasa, so'nggi planini olamiz
                $plan = PaymentPlan::find()
                    ->where(['student_id' => $student->id, 'group_id' => $groupId])
                    ->orderBy(['id' => SORT_DESC])
                    ->one();
            }

            $planAmount = $plan ? (int) $plan->amount : 0;
            $paidAmount = $plan ? (int) $plan->paid_amount : 0;
            $debt = max(0, $planAmount - $paidAmount);
            $paymentStatus = $plan ? $plan->status : 'pending';

            $totalExpectedSum += $planAmount;
            $totalCollectedSum += $paidAmount;
            $totalDebtSum += $debt;

            // Xulosa / Status
            $conclusion = "A'lo";
            if ($attRate < 70 || ($avgScore !== null && $avgScore < 60) || $debt > 0) {
                if ($debt > 0 && $attRate < 70) {
                    $conclusion = "Qarzdor va past davomat";
                } elseif ($debt > 0) {
                    $conclusion = "To'lov qarzdor";
                } elseif ($attRate < 70) {
                    $conclusion = "Past davomat";
                } else {
                    $conclusion = "O'zlashtirish past";
                }
            } elseif ($attRate >= 85 && ($avgScore === null || $avgScore >= 80)) {
                $conclusion = "A'lochi";
            } else {
                $conclusion = "Yaxshi";
            }

            $studentRows[] = [
                'student_id'        => $student->id,
                'student_name'      => $student->name,
                'phone'             => $student->phone,
                'total_lessons'     => $conductedLessonsCount > 0 ? $conductedLessonsCount : $totalPlannedLessons,
                'planned_lessons'   => $totalPlannedLessons,
                'conducted_lessons' => $conductedLessonsCount,
                'present_count'     => $effectivePresent,
                'absent_count'      => $absentCount,
                'excused_count'     => $excusedCount,
                'attendance_rate'   => $attRate,
                'average_score'     => $avgScore,
                'plan_amount'       => $planAmount,
                'paid_amount'       => $paidAmount,
                'debt'              => $debt,
                'payment_status'    => $paymentStatus,
                'conclusion'        => $conclusion,
            ];
        }

        $totalPossibleOverall = ($conductedLessonsCount > 0 ? $conductedLessonsCount : ($totalPlannedLessons > 0 ? $totalPlannedLessons : 1)) * count($students);
        $overallAttendanceRate = $totalPossibleOverall > 0
            ? round(($totalPresentOverall / $totalPossibleOverall) * 100, 1)
            : 100;

        $overallAvgScore = $allScoresCount > 0
            ? round($allScoresSum / $allScoresCount, 1)
            : null;

        $teacher = $group->teacher_id ? User::findOne($group->teacher_id) : null;
        $course = $group->course ? $group->course->name : '';

        return [
            'group' => [
                'id'           => $group->id,
                'name'         => $group->name,
                'course_name'  => $course,
                'teacher_name' => $teacher ? $teacher->name : 'Biriktirilmagan',
            ],
            'month' => $month,
            'stats' => [
                'total_students'          => count($students),
                'planned_lessons'         => $totalPlannedLessons,
                'conducted_lessons'       => $conductedLessonsCount,
                'total_lessons'           => $conductedLessonsCount > 0 ? $conductedLessonsCount : $totalPlannedLessons,
                'overall_attendance_rate' => $overallAttendanceRate,
                'overall_average_score'   => $overallAvgScore,
                'total_expected'          => $totalExpectedSum,
                'total_collected'         => $totalCollectedSum,
                'total_debt'              => $totalDebtSum,
            ],
            'students' => $studentRows,
        ];
    }

    private function calculateRiskStudentsCount(): int
    {
        $res = $this->actionRiskStudents();
        return $res['total'] ?? 0;
    }
}
