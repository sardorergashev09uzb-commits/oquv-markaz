<?php

declare(strict_types=1);

namespace api\controllers;

use api\components\JwtBearerAuth;
use common\models\Expense;
use common\models\Payment;
use common\models\PaymentPlan;
use common\models\TeacherSalary;
use common\models\User;
use Yii;
use yii\rest\Controller;
use yii\web\ForbiddenHttpException;

/**
 * FinanceController — Moliya xulosasi, xarajatlar va ish haqlari
 */
class FinanceController extends Controller
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

    public function beforeAction($action)
    {
        if (!parent::beforeAction($action)) {
            return false;
        }

        $user = Yii::$app->user->identity;
        if (!$user || $user->role !== User::ROLE_ADMIN) {
            throw new ForbiddenHttpException("Moliya va xarajatlar ma'lumotlari faqat rahbar/administrator uchun ruxsat etilgan.");
        }

        return true;
    }

    /**
     * GET /api/finance/summary
     */
    public function actionSummary(): array
    {
        $currentMonth = date('Y-m');

        // Jami tushum (Payments)
        $totalIncome = (int) Payment::find()->sum('amount');
        $monthIncome = (int) Payment::find()
            ->where(['like', 'paid_at', $currentMonth . '%', false])
            ->sum('amount');

        // Jami xarajatlar (Expenses)
        $totalExpense = (int) Expense::find()->sum('amount');
        $monthExpense = (int) Expense::find()
            ->where(['like', 'date', $currentMonth . '%', false])
            ->sum('amount');

        // Kutilayotgan to'lovlar va qarzdorlik
        $plans = PaymentPlan::find()->where(['month' => $currentMonth])->all();
        $expectedIncome = 0;
        $totalPaidInPlans = 0;
        $overdueDebt = 0;

        foreach ($plans as $p) {
            $expectedIncome += $p->amount;
            $totalPaidInPlans += $p->paid_amount;
            if ($p->status === PaymentPlan::STATUS_OVERDUE || $p->status === PaymentPlan::STATUS_PARTIAL) {
                $overdueDebt += max(0, $p->amount - $p->paid_amount);
            }
        }

        // Sof foyda
        $netProfit = $monthIncome - $monthExpense;

        return [
            'current_month' => $currentMonth,
            'summary' => [
                'month_income'    => $monthIncome,
                'total_income'    => $totalIncome,
                'month_expense'   => $monthExpense,
                'total_expense'   => $totalExpense,
                'net_profit'      => $netProfit,
                'expected_income' => $expectedIncome,
                'overdue_debt'    => $overdueDebt,
            ],
            'recent_expenses' => Expense::find()->orderBy(['date' => SORT_DESC])->limit(5)->all(),
            'salaries' => TeacherSalary::find()->with('teacher')->where(['month' => $currentMonth])->all(),
        ];
    }

    /**
     * GET /api/finance/expenses
     */
    public function actionExpenses(): array
    {
        $expenses = Expense::find()->orderBy(['date' => SORT_DESC, 'id' => SORT_DESC])->all();
        return [
            'items' => $expenses,
            'total' => count($expenses),
        ];
    }

    /**
     * POST /api/finance/expenses
     */
    public function actionCreateExpense(): array
    {
        $body = Yii::$app->request->bodyParams;
        $user = Yii::$app->user->identity;

        $expense = new Expense();
        $expense->category = $body['category'] ?? Expense::CATEGORY_OTHER;
        $expense->amount = (int) ($body['amount'] ?? 0);
        $expense->description = $body['description'] ?? null;
        $expense->date = $body['date'] ?? date('Y-m-d');
        $expense->created_by = $user ? $user->id : 1;

        if (!$expense->save()) {
            Yii::$app->response->statusCode = 422;
            return ['errors' => $expense->getErrors()];
        }

        Yii::$app->response->statusCode = 201;
        return [
            'message' => "Xarajat muvaffaqiyatli saqlandi",
            'expense' => $expense,
        ];
    }

    /**
     * GET /api/finance/salaries
     */
    public function actionSalaries(): array
    {
        $month = Yii::$app->request->get('month', date('Y-m'));
        $salaries = TeacherSalary::find()->with('teacher')->where(['month' => $month])->all();

        return [
            'items' => $salaries,
        ];
    }
}
