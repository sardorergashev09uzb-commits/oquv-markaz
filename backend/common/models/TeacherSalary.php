<?php

declare(strict_types=1);

namespace common\models;

use yii\behaviors\TimestampBehavior;
use yii\db\ActiveQuery;
use yii\db\ActiveRecord;

/**
 * TeacherSalary model
 *
 * @property int $id
 * @property int $teacher_id
 * @property string $month (YYYY-MM)
 * @property string $type (fixed|per_lesson|percentage)
 * @property int|null $lessons_count
 * @property int|null $rate
 * @property int $amount
 * @property int $paid_amount
 * @property string $status (pending|paid|partial)
 * @property string|null $paid_at
 * @property int $created_at
 *
 * @property User $teacher
 */
class TeacherSalary extends ActiveRecord
{
    public const STATUS_PENDING = 'pending';
    public const STATUS_PARTIAL = 'partial';
    public const STATUS_PAID    = 'paid';

    public static function tableName(): string
    {
        return '{{%teacher_salaries}}';
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
            [['teacher_id', 'month', 'amount'], 'required'],
            [['teacher_id', 'lessons_count', 'rate', 'amount', 'paid_amount'], 'integer'],
            [['paid_amount'], 'default', 'value' => 0],
            [['month'], 'string', 'max' => 7],
            [['type', 'status'], 'string', 'max' => 20],
            [['status'], 'default', 'value' => self::STATUS_PENDING],
            [['paid_at'], 'safe'],
            [['teacher_id'], 'exist', 'skipOnError' => true, 'targetClass' => User::class, 'targetAttribute' => ['teacher_id' => 'id']],
        ];
    }

    public function getTeacher(): ActiveQuery
    {
        return $this->hasOne(User::class, ['id' => 'teacher_id']);
    }

    public function fields(): array
    {
        return [
            'id',
            'teacher_id',
            'teacher_name' => function () {
                return $this->teacher ? $this->teacher->name : null;
            },
            'teacher_phone' => function () {
                return $this->teacher ? $this->teacher->phone : null;
            },
            'month',
            'type',
            'lessons_count',
            'rate',
            'amount',
            'paid_amount',
            'status',
            'paid_at',
            'created_at',
        ];
    }
}
