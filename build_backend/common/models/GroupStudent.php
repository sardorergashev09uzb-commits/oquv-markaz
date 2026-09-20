<?php

declare(strict_types=1);

namespace common\models;

use yii\db\ActiveQuery;
use yii\db\ActiveRecord;

/**
 * GroupStudent model
 *
 * @property int $id
 * @property int $group_id
 * @property int $student_id
 * @property string $enrolled_at
 * @property string|null $left_at
 * @property string $status
 *
 * @property Group $group
 * @property User $student
 */
class GroupStudent extends ActiveRecord
{
    public const STATUS_ACTIVE    = 'active';
    public const STATUS_FROZEN    = 'frozen';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_LEFT      = 'left';

    public static function tableName(): string
    {
        return '{{%group_students}}';
    }

    public function rules(): array
    {
        return [
            [['group_id', 'student_id', 'enrolled_at'], 'required'],
            [['group_id', 'student_id'], 'integer'],
            [['enrolled_at', 'left_at'], 'safe'],
            [['status'], 'string', 'max' => 20],
            [['status'], 'default', 'value' => self::STATUS_ACTIVE],
            [['status'], 'in', 'range' => [self::STATUS_ACTIVE, self::STATUS_FROZEN, self::STATUS_COMPLETED, self::STATUS_LEFT]],
            [['group_id', 'student_id'], 'unique', 'targetAttribute' => ['group_id', 'student_id'], 'message' => 'O\'quvchi ushbu guruhga allaqachon biriktirilgan.'],
            [['group_id'], 'exist', 'skipOnError' => true, 'targetClass' => Group::class, 'targetAttribute' => ['group_id' => 'id']],
            [['student_id'], 'exist', 'skipOnError' => true, 'targetClass' => User::class, 'targetAttribute' => ['student_id' => 'id']],
        ];
    }

    public function getGroup(): ActiveQuery
    {
        return $this->hasOne(Group::class, ['id' => 'group_id']);
    }

    public function getStudent(): ActiveQuery
    {
        return $this->hasOne(User::class, ['id' => 'student_id']);
    }

    public function fields(): array
    {
        return [
            'id',
            'group_id',
            'student_id',
            'student_name' => function () {
                return $this->student ? $this->student->name : null;
            },
            'student_phone' => function () {
                return $this->student ? $this->student->phone : null;
            },
            'enrolled_at',
            'left_at',
            'status',
        ];
    }
}
