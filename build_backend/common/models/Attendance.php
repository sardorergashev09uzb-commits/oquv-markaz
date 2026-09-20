<?php

declare(strict_types=1);

namespace common\models;

use yii\behaviors\TimestampBehavior;
use yii\db\ActiveQuery;
use yii\db\ActiveRecord;

/**
 * Attendance model
 *
 * @property int $id
 * @property int $lesson_id
 * @property int $student_id
 * @property string $status
 * @property string|null $note
 * @property int|null $marked_by
 * @property int $created_at
 *
 * @property Lesson $lesson
 * @property User $student
 * @property User|null $markedBy
 */
class Attendance extends ActiveRecord
{
    public const STATUS_PRESENT = 'present';
    public const STATUS_ABSENT  = 'absent';
    public const STATUS_LATE    = 'late';
    public const STATUS_EXCUSED = 'excused';

    public static function tableName(): string
    {
        return '{{%attendance}}';
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
            [['lesson_id', 'student_id'], 'required'],
            [['lesson_id', 'student_id', 'marked_by'], 'integer'],
            [['status'], 'string', 'max' => 10],
            [['status'], 'default', 'value' => self::STATUS_PRESENT],
            [['status'], 'in', 'range' => [self::STATUS_PRESENT, self::STATUS_ABSENT, self::STATUS_LATE, self::STATUS_EXCUSED]],
            [['note'], 'string', 'max' => 255],
            [['lesson_id', 'student_id'], 'unique', 'targetAttribute' => ['lesson_id', 'student_id'], 'message' => 'Ushbu o\'quvchiga allaqachon davomat belgilangan.'],
            [['lesson_id'], 'exist', 'skipOnError' => true, 'targetClass' => Lesson::class, 'targetAttribute' => ['lesson_id' => 'id']],
            [['student_id'], 'exist', 'skipOnError' => true, 'targetClass' => User::class, 'targetAttribute' => ['student_id' => 'id']],
        ];
    }

    public function getLesson(): ActiveQuery
    {
        return $this->hasOne(Lesson::class, ['id' => 'lesson_id']);
    }

    public function getStudent(): ActiveQuery
    {
        return $this->hasOne(User::class, ['id' => 'student_id']);
    }

    public function getMarkedBy(): ActiveQuery
    {
        return $this->hasOne(User::class, ['id' => 'marked_by']);
    }

    public function fields(): array
    {
        return [
            'id',
            'lesson_id',
            'student_id',
            'student_name' => function () {
                return $this->student ? $this->student->name : null;
            },
            'status',
            'note',
            'marked_by',
            'created_at',
        ];
    }
}
