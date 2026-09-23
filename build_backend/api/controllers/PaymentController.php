<?php

declare(strict_types=1);

namespace api\controllers;

use api\components\JwtBearerAuth;
use common\models\Group;
use common\models\Payment;
use common\models\PaymentPlan;
use common\models\User;
use Yii;
use yii\data\ActiveDataProvider;
use yii\rest\Controller;
use yii\web\BadRequestHttpException;
use yii\web\NotFoundHttpException;

/**
 * PaymentController — To'lovlar va to'lov rejalari
 */
class PaymentController extends Controller
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
     * GET /api/payments — To'lov rejalari ro'yxati
     */
    public function actionIndex(): array
    {
        $request = Yii::$app->request;
        $status = $request->get('status');
        $month = $request->get('month');
        $search = $request->get('search');
        $groupId = $request->get('group_id');
        $studentId = $request->get('student_id');

        $currentUser = Yii::$app->user->identity;

        $query = PaymentPlan::find()->with(['student', 'group', 'group.course']);

        // Agar O'qituvchi bo'lsa, o'z guruhlari to'lovlarini ko'ra oladi
        if ($currentUser && $currentUser->role === User::ROLE_TEACHER) {
            $teacherGroupIds = Group::find()
                ->where(['teacher_id' => $currentUser->id])
                ->select('id')
                ->column();

            if (empty($teacherGroupIds)) {
                return [
                    'items' => [],
                    'total' => 0,
                    'summary' => [
                        'total_billed' => 0,
                        'total_paid' => 0,
                        'total_remaining' => 0,
                        'count_paid' => 0,
                        'count_partial' => 0,
                        'count_pending' => 0,
                        'count_overdue' => 0,
                    ],
                ];
            }
            $query->andWhere(['{{%payment_plans}}.group_id' => $teacherGroupIds]);
        } elseif ($currentUser && $currentUser->role === User::ROLE_STUDENT) {
            $query->andWhere(['{{%payment_plans}}.student_id' => $currentUser->id]);
        }

        if ($groupId) {
            $query->andWhere(['{{%payment_plans}}.group_id' => (int) $groupId]);
        }

        if ($studentId) {
            $query->andWhere(['{{%payment_plans}}.student_id' => (int) $studentId]);
        }

        if ($status) {
            $query->andWhere(['{{%payment_plans}}.status' => $status]);
        }

        if ($month) {
            $query->andWhere(['{{%payment_plans}}.month' => $month]);
        }

        if ($search && (!$currentUser || $currentUser->role !== User::ROLE_STUDENT)) {
            $query->innerJoin('{{%users}} u', 'u.id = {{%payment_plans}}.student_id')
                  ->andWhere(['or', ['like', 'u.name', $search], ['like', 'u.phone', $search]]);
        }

        // Summary hisoblash
        $summaryQuery = clone $query;
        $totalBilled = (int) $summaryQuery->sum('{{%payment_plans}}.amount');
        $totalPaid = (int) $summaryQuery->sum('{{%payment_plans}}.paid_amount');
        $totalRemaining = max(0, $totalBilled - $totalPaid);
        $countPaid = (int) (clone $query)->andWhere(['{{%payment_plans}}.status' => PaymentPlan::STATUS_PAID])->count();
        $countPartial = (int) (clone $query)->andWhere(['{{%payment_plans}}.status' => PaymentPlan::STATUS_PARTIAL])->count();
        $countPending = (int) (clone $query)->andWhere(['{{%payment_plans}}.status' => PaymentPlan::STATUS_PENDING])->count();
        $countOverdue = (int) (clone $query)->andWhere(['{{%payment_plans}}.status' => PaymentPlan::STATUS_OVERDUE])->count();

        $query->orderBy(['{{%payment_plans}}.id' => SORT_DESC]);

        $pageSize = (int) $request->get('per_page', 50);
        $provider = new ActiveDataProvider([
            'query' => $query,
            'pagination' => ['pageSize' => $pageSize],
        ]);

        return [
            'items' => $provider->getModels(),
            'total' => $provider->getTotalCount(),
            'summary' => [
                'total_billed' => $totalBilled,
                'total_paid' => $totalPaid,
                'total_remaining' => $totalRemaining,
                'count_paid' => $countPaid,
                'count_partial' => $countPartial,
                'count_pending' => $countPending,
                'count_overdue' => $countOverdue,
            ],
        ];
    }

    /**
     * GET /api/payments/history — To'lovlar tarixi
     */
    public function actionHistory(): array
    {
        $request = Yii::$app->request;
        $currentUser = Yii::$app->user->identity;
        $groupId = $request->get('group_id');
        $studentId = $request->get('student_id');
        $month = $request->get('month');

        $query = Payment::find()
            ->with(['plan', 'plan.student', 'plan.group', 'receivedBy'])
            ->innerJoin('{{%payment_plans}} pp', 'pp.id = {{%payments}}.plan_id');

        if ($currentUser && $currentUser->role === User::ROLE_TEACHER) {
            $teacherGroupIds = Group::find()
                ->where(['teacher_id' => $currentUser->id])
                ->select('id')
                ->column();
            $query->andWhere(['pp.group_id' => $teacherGroupIds]);
        } elseif ($currentUser && $currentUser->role === User::ROLE_STUDENT) {
            $query->andWhere(['pp.student_id' => $currentUser->id]);
        }

        if ($groupId) {
            $query->andWhere(['pp.group_id' => (int) $groupId]);
        }

        if ($studentId) {
            $query->andWhere(['pp.student_id' => (int) $studentId]);
        }

        if ($month) {
            $query->andWhere(['pp.month' => $month]);
        }

        $query->orderBy(['{{%payments}}.paid_at' => SORT_DESC, '{{%payments}}.id' => SORT_DESC])
              ->limit(50);

        return [
            'items' => $query->all(),
        ];
    }

    /**
     * POST /api/payments — To'lov qabul qilish
     */
    public function actionCreate(): array
    {
        $body = Yii::$app->request->bodyParams;
        $planId = (int) ($body['plan_id'] ?? 0);
        $studentId = (int) ($body['student_id'] ?? 0);
        $groupId = (int) ($body['group_id'] ?? 0);
        $month = !empty($body['month']) ? (string)$body['month'] : date('Y-m');
        $amount = (int) ($body['amount'] ?? 0);
        $method = $body['method'] ?? Payment::METHOD_CASH;
        $note = $body['note'] ?? null;

        if ($amount <= 0) {
            throw new BadRequestHttpException("To'lov summasi 0 dan katta bo'lishi kerak.");
        }

        $user = Yii::$app->user->identity;
        if ($user && $user->role === User::ROLE_STUDENT) {
            throw new \yii\web\ForbiddenHttpException("O'quvchilar to'lov qabul qila olmaydi.");
        }

        $plan = null;
        if ($planId > 0) {
            $plan = PaymentPlan::findOne($planId);
        } elseif ($studentId > 0 && $groupId > 0) {
            $plan = PaymentPlan::findOne(['student_id' => $studentId, 'group_id' => $groupId, 'month' => $month]);
            if (!$plan) {
                $group = Group::findOne($groupId);
                $coursePrice = ($group && $group->course) ? (int)$group->course->price : $amount;
                $plan = new PaymentPlan();
                $plan->student_id = $studentId;
                $plan->group_id = $groupId;
                $plan->month = $month;
                $plan->amount = $coursePrice > 0 ? $coursePrice : $amount;
                $plan->due_date = date('Y-m-10', strtotime($month . '-01'));
                $plan->status = PaymentPlan::STATUS_PENDING;
                if (!$plan->save()) {
                    Yii::$app->response->statusCode = 422;
                    return ['errors' => $plan->getErrors()];
                }
            }
        }

        if (!$plan) {
            throw new NotFoundHttpException("To'lov rejasi topilmadi.");
        }

        // Ikki marta tez bosishdan himoya (Duplicate debounce: 5 soniya)
        $recentPayment = Payment::find()
            ->where(['plan_id' => $plan->id, 'amount' => $amount])
            ->andWhere(['>=', 'paid_at', date('Y-m-d H:i:s', time() - 5)])
            ->orderBy(['id' => SORT_DESC])
            ->one();

        if ($recentPayment) {
            // Dublikat yaratilmaydi, mavjud to'lov qaytariladi
            return [
                'message' => "To'lov allaqachon qabul qilingan (dublikatdan himoyalandi)",
                'payment' => $recentPayment,
                'plan' => $plan,
            ];
        }

        $payment = new Payment();
        $payment->plan_id = $plan->id;
        $payment->amount = $amount;
        $payment->method = $method;
        $payment->received_by = $user ? $user->id : 1;
        $payment->paid_at = date('Y-m-d H:i:s');
        $payment->note = $note;

        if (!$payment->save()) {
            Yii::$app->response->statusCode = 422;
            return ['errors' => $payment->getErrors()];
        }

        // To'lov rejasi statusi va paid_amount avtomatik qayta hisoblanadi
        $plan->recalculateStatus();

        Yii::$app->response->statusCode = 201;
        return [
            'message' => "To'lov muvaffaqiyatli qabul qilindi",
            'payment' => $payment,
            'plan' => $plan,
        ];
    }

    /**
     * DELETE /api/payments/<id> — To'lovni bekor qilish / o'chirish
     * Faqat Administrator huquqiga ega foydalanuvchilar o'chira oladi
     */
    public function actionDelete(int $id): array
    {
        $currentUser = Yii::$app->user->identity;
        if (!$currentUser || $currentUser->role !== User::ROLE_ADMIN) {
            throw new \yii\web\ForbiddenHttpException("Faqat administrator to'lovni bekor qila oladi.");
        }

        $payment = Payment::findOne($id);
        if (!$payment) {
            throw new NotFoundHttpException("To'lov topilmadi.");
        }

        $plan = $payment->plan;
        $paymentAmount = $payment->amount;

        if (!$payment->delete()) {
            throw new BadRequestHttpException("To'lovni o'chirib bo'lmadi.");
        }

        if ($plan) {
            $plan->recalculateStatus();
        }

        return [
            'message' => "To'lov muvaffaqiyatli bekor qilindi (" . number_format($paymentAmount, 0, '', ' ') . " so'm)",
            'plan' => $plan,
        ];
    }

    /**
     * POST /api/payments/create-plan — Yangi to'lov rejasi yaratish
     */
    public function actionCreatePlan(): array
    {
        $body = Yii::$app->request->bodyParams;

        $plan = new PaymentPlan();
        $plan->student_id = (int) ($body['student_id'] ?? 0);
        $plan->group_id = (int) ($body['group_id'] ?? 0);
        $plan->month = $body['month'] ?? date('Y-m');
        $plan->amount = (int) ($body['amount'] ?? 500000);
        $plan->due_date = $body['due_date'] ?? date('Y-m-10');

        if (!$plan->save()) {
            Yii::$app->response->statusCode = 422;
            return ['errors' => $plan->getErrors()];
        }

        return [
            'message' => "To'lov rejasi yaratildi",
            'plan' => $plan,
        ];
    }
}
