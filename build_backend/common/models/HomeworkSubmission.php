<?php

declare(strict_types=1);

namespace common\models;

use yii\db\ActiveQuery;
use yii\db\ActiveRecord;

/**
 * HomeworkSubmission model
 *
 * @property int $id
 * @property int $homework_id
 * @property int $student_id
 * @property string|null $file_url
 * @property string|null $comment
 * @property float|null $score
 * @property string|null $feedback
 * @property string $status
 * @property int|null $submitted_at
 * @property int|null $graded_at
 *
 * @property Homework $homework
 * @property User $student
 */
class HomeworkSubmission extends ActiveRecord
{
    public const STATUS_NOT_SUBMITTED = 'not_submitted';
    public const STATUS_SUBMITTED     = 'submitted';
    public const STATUS_GRADED        = 'graded';

    public static function tableName(): string
    {
        return '{{%homework_submissions}}';
    }

    public function rules(): array
    {
        return [
            [['homework_id', 'student_id'], 'required'],
            [['homework_id', 'student_id', 'submitted_at', 'graded_at'], 'integer'],
            [['comment', 'feedback'], 'string'],
            [['score'], 'number'],
            [['file_url'], 'string', 'max' => 500],
            [['status'], 'string', 'max' => 20],
            [['status'], 'default', 'value' => self::STATUS_SUBMITTED],
            [['homework_id', 'student_id'], 'unique', 'targetAttribute' => ['homework_id', 'student_id']],
            [['homework_id'], 'exist', 'skipOnError' => true, 'targetClass' => Homework::class, 'targetAttribute' => ['homework_id' => 'id']],
            [['student_id'], 'exist', 'skipOnError' => true, 'targetClass' => User::class, 'targetAttribute' => ['student_id' => 'id']],
        ];
    }

    public function getHomework(): ActiveQuery
    {
        return $this->hasOne(Homework::class, ['id' => 'homework_id']);
    }

    public function getStudent(): ActiveQuery
    {
        return $this->hasOne(User::class, ['id' => 'student_id']);
    }

    public function fields(): array
    {
        return [
            'id',
            'homework_id',
            'student_id',
            'student_name' => function () {
                return $this->student ? $this->student->name : null;
            },
            'file_url',
            'comment',
            'score',
            'feedback',
            'status',
            'submitted_at',
            'graded_at',
        ];
    }
}
