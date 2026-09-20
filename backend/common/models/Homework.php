<?php

declare(strict_types=1);

namespace common\models;

use yii\behaviors\TimestampBehavior;
use yii\db\ActiveQuery;
use yii\db\ActiveRecord;

/**
 * Homework model
 *
 * @property int $id
 * @property int $lesson_id
 * @property string $title
 * @property string|null $description
 * @property string|null $deadline
 * @property int $max_score
 * @property int $created_at
 *
 * @property Lesson $lesson
 * @property HomeworkSubmission[] $submissions
 */
class Homework extends ActiveRecord
{
    public static function tableName(): string
    {
        return '{{%homework}}';
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
            [['lesson_id', 'title'], 'required'],
            [['lesson_id', 'max_score'], 'integer'],
            [['max_score'], 'default', 'value' => 10],
            [['deadline'], 'safe'],
            [['title'], 'string', 'max' => 200],
            [['description'], 'string'],
            [['lesson_id'], 'exist', 'skipOnError' => true, 'targetClass' => Lesson::class, 'targetAttribute' => ['lesson_id' => 'id']],
        ];
    }

    public function getLesson(): ActiveQuery
    {
        return $this->hasOne(Lesson::class, ['id' => 'lesson_id']);
    }

    public function getSubmissions(): ActiveQuery
    {
        return $this->hasMany(HomeworkSubmission::class, ['homework_id' => 'id']);
    }

    public function fields(): array
    {
        return [
            'id',
            'lesson_id',
            'title',
            'description',
            'deadline',
            'max_score',
            'submissions_count' => function () {
                return $this->getSubmissions()->count();
            },
            'created_at',
        ];
    }
}
