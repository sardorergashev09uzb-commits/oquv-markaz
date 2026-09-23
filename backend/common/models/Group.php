<?php

declare(strict_types=1);

namespace common\models;

use yii\behaviors\TimestampBehavior;
use yii\db\ActiveQuery;
use yii\db\ActiveRecord;

/**
 * Group model
 *
 * @property int $id
 * @property string $name
 * @property int $course_id
 * @property int $teacher_id
 * @property int|null $room_id
 * @property string|null $schedule_json
 * @property string|null $start_date
 * @property string|null $end_date
 * @property int $max_students
 * @property int|null $center_id
 * @property string $status
 * @property int $created_at
 * @property int $updated_at
 *
 * @property Course $course
 * @property User $teacher
 * @property Room|null $room
 * @property GroupStudent[] $groupStudents
 * @property User[] $students
 */
class Group extends ActiveRecord
{
    public const STATUS_ACTIVE    = 'active';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_PAUSED    = 'paused';

    public static function tableName(): string
    {
        return '{{%groups}}';
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
            [['name', 'course_id', 'teacher_id'], 'required'],
            [['name'], 'string', 'max' => 100],
            [['course_id', 'teacher_id', 'room_id', 'max_students', 'center_id'], 'integer'],
            [['max_students'], 'default', 'value' => 15],
            [['schedule_json'], 'string'],
            [['start_date', 'end_date'], 'safe'],
            [['status'], 'string', 'max' => 20],
            [['status'], 'default', 'value' => self::STATUS_ACTIVE],
            [['status'], 'in', 'range' => [self::STATUS_ACTIVE, self::STATUS_COMPLETED, self::STATUS_PAUSED]],
            [['course_id'], 'exist', 'skipOnError' => true, 'targetClass' => Course::class, 'targetAttribute' => ['course_id' => 'id']],
            [['teacher_id'], 'exist', 'skipOnError' => true, 'targetClass' => User::class, 'targetAttribute' => ['teacher_id' => 'id']],
            [['room_id'], 'exist', 'skipOnError' => true, 'targetClass' => Room::class, 'targetAttribute' => ['room_id' => 'id']],
        ];
    }

    public function getCourse(): ActiveQuery
    {
        return $this->hasOne(Course::class, ['id' => 'course_id']);
    }

    public function getTeacher(): ActiveQuery
    {
        return $this->hasOne(User::class, ['id' => 'teacher_id']);
    }

    public function getRoom(): ActiveQuery
    {
        return $this->hasOne(Room::class, ['id' => 'room_id']);
    }

    public function getGroupStudents(): ActiveQuery
    {
        return $this->hasMany(GroupStudent::class, ['group_id' => 'id']);
    }

    public function getStudents(): ActiveQuery
    {
        return $this->hasMany(User::class, ['id' => 'student_id'])
            ->via('groupStudents');
    }

    public function fields(): array
    {
        return [
            'id',
            'name',
            'course_id',
            'course_name' => function () {
                return $this->course ? $this->course->name : null;
            },
            'teacher_id',
            'teacher_name' => function () {
                return $this->teacher ? $this->teacher->name : null;
            },
            'room_id',
            'room_name' => function () {
                return $this->room ? $this->room->name : null;
            },
            'schedule_json',
            'schedule' => function () {
                return $this->schedule_json ? json_decode($this->schedule_json, true) : [];
            },
            'start_date',
            'end_date',
            'max_students',
            'students_count' => function () {
                return (int) $this->getStudents()
                    ->where(['{{%users}}.status' => User::STATUS_ACTIVE])
                    ->andWhere(['{{%group_students}}.status' => GroupStudent::STATUS_ACTIVE])
                    ->count();
            },
            'status',
            'created_at',
            'updated_at',
        ];
    }
}
