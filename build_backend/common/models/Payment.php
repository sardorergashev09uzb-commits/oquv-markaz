<?php

declare(strict_types=1);

namespace common\models;

use yii\behaviors\TimestampBehavior;
use yii\db\ActiveQuery;
use yii\db\ActiveRecord;

/**
 * Payment model
 *
 * @property int $id
 * @property int $plan_id
 * @property int $amount
 * @property string $method (cash|card|click|payme|bank|other)
 * @property int|null $received_by
 * @property string $paid_at
 * @property string|null $note
 * @property int $created_at
 *
 * @property PaymentPlan $plan
 * @property User|null $receivedBy
 */
class Payment extends ActiveRecord
{
    public const METHOD_CASH  = 'cash';
    public const METHOD_CARD  = 'card';
    public const METHOD_CLICK = 'click';
    public const METHOD_PAYME = 'payme';
    public const METHOD_BANK  = 'bank';
    public const METHOD_OTHER = 'other';

    public static function tableName(): string
    {
        return '{{%payments}}';
    }

    public function behaviors(): array
    {
        return [
            [
                'class' => TimestampBehavior::class,
                'updatedAtAttribute' => false,
            ],
        ];
    }

    public function rules(): array
    {
        return [
            [['plan_id', 'amount'], 'required'],
            [['plan_id', 'amount', 'received_by'], 'integer'],
            [['paid_at'], 'safe'],
            [['method'], 'string', 'max' => 20],
            [['method'], 'default', 'value' => self::METHOD_CASH],
            [['method'], 'in', 'range' => [self::METHOD_CASH, self::METHOD_CARD, self::METHOD_CLICK, self::METHOD_PAYME, self::METHOD_BANK, self::METHOD_OTHER]],
            [['note'], 'string', 'max' => 500],
            [['plan_id'], 'exist', 'skipOnError' => true, 'targetClass' => PaymentPlan::class, 'targetAttribute' => ['plan_id' => 'id']],
        ];
    }

    public function getPlan(): ActiveQuery
    {
        return $this->hasOne(PaymentPlan::class, ['id' => 'plan_id']);
    }

    public function getReceivedBy(): ActiveQuery
    {
        return $this->hasOne(User::class, ['id' => 'received_by']);
    }

    public function fields(): array
    {
        return [
            'id',
            'plan_id',
            'student_id' => function () {
                return $this->plan ? $this->plan->student_id : null;
            },
            'student_name' => function () {
                return $this->plan && $this->plan->student ? $this->plan->student->name : null;
            },
            'group_id' => function () {
                return $this->plan ? $this->plan->group_id : null;
            },
            'group_name' => function () {
                return $this->plan && $this->plan->group ? $this->plan->group->name : null;
            },
            'month' => function () {
                return $this->plan ? $this->plan->month : null;
            },
            'amount',
            'method',
            'paid_at',
            'note',
            'received_by_name' => function () {
                return $this->receivedBy ? $this->receivedBy->name : null;
            },
            'created_at',
        ];
    }
}
