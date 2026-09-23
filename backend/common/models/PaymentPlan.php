<?php

declare(strict_types=1);

namespace common\models;

use yii\behaviors\TimestampBehavior;
use yii\db\ActiveQuery;
use yii\db\ActiveRecord;

/**
 * PaymentPlan model
 *
 * @property int $id
 * @property int $student_id
 * @property int $group_id
 * @property string $month (YYYY-MM)
 * @property int $amount
 * @property int $paid_amount
 * @property string $due_date
 * @property string $status
 * @property int $created_at
 * @property int $updated_at
 *
 * @property User $student
 * @property Group $group
 * @property Payment[] $payments
 */
class PaymentPlan extends ActiveRecord
{
    public const STATUS_PENDING   = 'pending';
    public const STATUS_PARTIAL   = 'partial';
    public const STATUS_PAID      = 'paid';
    public const STATUS_OVERDUE   = 'overdue';
    public const STATUS_CANCELLED = 'cancelled';

    public static function tableName(): string
    {
        return '{{%payment_plans}}';
    }

    public function behaviors(): array
    {
        return [
            TimestampBehavior::class,
        ];
    }

    public function rules(): array
    {
        return [
            [['student_id', 'group_id', 'month', 'amount', 'due_date'], 'required'],
            [['student_id', 'group_id', 'amount', 'paid_amount'], 'integer'],
            [['paid_amount'], 'default', 'value' => 0],
            [['month'], 'string', 'max' => 7],
            [['due_date'], 'safe'],
            [['status'], 'string', 'max' => 20],
            [['status'], 'default', 'value' => self::STATUS_PENDING],
            [['status'], 'in', 'range' => [self::STATUS_PENDING, self::STATUS_PARTIAL, self::STATUS_PAID, self::STATUS_OVERDUE, self::STATUS_CANCELLED]],
            [['student_id', 'group_id', 'month'], 'unique', 'targetAttribute' => ['student_id', 'group_id', 'month']],
            [['student_id'], 'exist', 'skipOnError' => true, 'targetClass' => User::class, 'targetAttribute' => ['student_id' => 'id']],
            [['group_id'], 'exist', 'skipOnError' => true, 'targetClass' => Group::class, 'targetAttribute' => ['group_id' => 'id']],
        ];
    }

    public function getStudent(): ActiveQuery
    {
        return $this->hasOne(User::class, ['id' => 'student_id']);
    }

    public function getGroup(): ActiveQuery
    {
        return $this->hasOne(Group::class, ['id' => 'group_id']);
    }

    public function getPayments(): ActiveQuery
    {
        return $this->hasMany(Payment::class, ['plan_id' => 'id']);
    }

    /**
     * To'lov qabul qilingandan keyin statusni avtomatik yangilash
     */
    public function recalculateStatus(): void
    {
        $totalPaid = (int) $this->getPayments()->sum('amount');
        $this->paid_amount = $totalPaid;

        if ($this->paid_amount >= $this->amount) {
            $this->status = self::STATUS_PAID;
        } elseif ($this->paid_amount > 0) {
            $this->status = self::STATUS_PARTIAL;
        } else {
            $today = date('Y-m-d');
            if ($this->due_date < $today) {
                $this->status = self::STATUS_OVERDUE;
            } else {
                $this->status = self::STATUS_PENDING;
            }
        }

        $this->save(false);
    }

    public function fields(): array
    {
        return [
            'id',
            'student_id',
            'student_name' => function () {
                return $this->student ? $this->student->name : null;
            },
            'student_phone' => function () {
                return $this->student ? $this->student->phone : null;
            },
            'group_id',
            'group_name' => function () {
                return $this->group ? $this->group->name : null;
            },
            'month',
            'amount',
            'paid_amount',
            'remaining_amount' => function () {
                return max(0, $this->amount - $this->paid_amount);
            },
            'overpaid_amount' => function () {
                return max(0, $this->paid_amount - $this->amount);
            },
            'due_date',
            'status',
            'created_at',
            'updated_at',
        ];
    }
}
