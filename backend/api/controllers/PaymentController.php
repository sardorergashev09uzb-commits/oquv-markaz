<?php

declare(strict_types=1);

namespace api\controllers;

use api\components\JwtBearerAuth;
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

        $currentUser = Yii::$app->user->identity;
        if ($currentUser && $currentUser->role === User::ROLE_TEACHER) {
            throw new \yii\web\ForbiddenHttpException("O'qituvchilarga to'lovlar bo'limiga kirish taqiqlangan.");
        }

        $query = PaymentPlan::find()->with(['student', 'group']);

        if ($currentUser && $currentUser->role === User::ROLE_STUDENT) {
            $query->andWhere(['{{%payment_plans}}.student_id' => $currentUser->id]);
        }

        if ($status) {
            $query->andWhere(['status' => $status]);
        }

        if ($month) {
            $query->andWhere(['month' => $month]);
        }

        if ($search && (!$currentUser || $currentUser->role !== User::ROLE_STUDENT)) {
            $query->innerJoin('{{%users}} u', 'u.id = {{%payment_plans}}.student_id')
                  ->andWhere(['or', ['like', 'u.name', $search], ['like', 'u.phone', $search]]);
        }

        $query->orderBy(['{{%payment_plans}}.id' => SORT_DESC]);

        $pageSize = (int) $request->get('per_page', 50);
        $provider = new ActiveDataProvider([
            'query' => $query,
            'pagination' => ['pageSize' => $pageSize],
        ]);

        return [
            'items' => $provider->getModels(),
            'total' => $provider->getTotalCount(),
        ];
    }

    /**
     * GET /api/payments/history — To'lovlar tarixi
     */
    public function actionHistory(): array
    {
        $currentUser = Yii::$app->user->identity;
        if ($currentUser && $currentUser->role === User::ROLE_TEACHER) {
            throw new \yii\web\ForbiddenHttpException("O'qituvchilarga to'lovlar bo'limiga kirish taqiqlangan.");
        }

        $query = Payment::find()
            ->with(['plan', 'plan.student', 'plan.group', 'receivedBy'])
            ->orderBy(['{{%payments}}.paid_at' => SORT_DESC, '{{%payments}}.id' => SORT_DESC])
            ->limit(50);

        if ($currentUser && $currentUser->role === User::ROLE_STUDENT) {
            $query->innerJoin('{{%payment_plans}} pp', 'pp.id = {{%payments}}.plan_id')
                  ->andWhere(['pp.student_id' => $currentUser->id]);
        }

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
        $amount = (int) ($body['amount'] ?? 0);
        $method = $body['method'] ?? Payment::METHOD_CASH;
        $note = $body['note'] ?? null;

        $plan = PaymentPlan::findOne($planId);
        if (!$plan) {
            throw new NotFoundHttpException("To'lov rejasi topilmadi.");
        }

        if ($amount <= 0) {
            throw new BadRequestHttpException("To'lov summasi 0 dan katta bo'lishi kerak.");
        }

        $user = Yii::$app->user->identity;
        if ($user && $user->role === User::ROLE_STUDENT) {
            throw new \yii\web\ForbiddenHttpException("O'quvchilar to'lov qabul qila olmaydi.");
        }

        $payment = new Payment();
        $payment->plan_id = $planId;
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
