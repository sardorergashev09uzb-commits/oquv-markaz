<?php

declare(strict_types=1);

namespace common\models;

use yii\behaviors\TimestampBehavior;
use yii\db\ActiveQuery;
use yii\db\ActiveRecord;

/**
 * Lesson model
 *
 * @property int $id
 * @property int $group_id
 * @property string|null $topic
 * @property string $started_at
 * @property string|null $ended_at
 * @property string $status
 * @property string|null $note
 * @property int $created_at
 *
 * @property Group $group
 * @property Attendance[] $attendances
 * @property Homework[] $homeworks
 */
class Lesson extends ActiveRecord
{
    public const STATUS_SCHEDULED = 'scheduled';
    public const STATUS_ACTIVE    = 'active';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_CANCELLED = 'cancelled';

    public static function tableName(): string
    {
        return '{{%lessons}}';
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
            [['group_id', 'started_at'], 'required'],
            [['group_id'], 'integer'],
            [['started_at', 'ended_at'], 'safe'],
            [['topic'], 'string', 'max' => 255],
            [['status'], 'string', 'max' => 20],
            [['status'], 'default', 'value' => self::STATUS_COMPLETED],
            [['note'], 'string'],
            [['group_id'], 'exist', 'skipOnError' => true, 'targetClass' => Group::class, 'targetAttribute' => ['group_id' => 'id']],
        ];
    }

    public function getGroup(): ActiveQuery
    {
        return $this->hasOne(Group::class, ['id' => 'group_id']);
    }

    public function getAttendances(): ActiveQuery
    {
        return $this->hasMany(Attendance::class, ['lesson_id' => 'id']);
    }

    public function getHomeworks(): ActiveQuery
    {
        return $this->hasMany(Homework::class, ['lesson_id' => 'id']);
    }

    public function fields(): array
    {
        return [
            'id',
            'group_id',
            'group_name' => function () {
                return $this->group ? $this->group->name : null;
            },
            'topic',
            'started_at',
            'ended_at',
            'status',
            'note',
            'attendances_count' => function () {
                return $this->getAttendances()->count();
            },
            'created_at',
        ];
    }
}
