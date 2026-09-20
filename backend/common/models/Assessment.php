<?php

declare(strict_types=1);

namespace common\models;

use yii\behaviors\TimestampBehavior;
use yii\db\ActiveQuery;
use yii\db\ActiveRecord;

/**
 * Assessment model
 *
 * @property int $id
 * @property int $group_id
 * @property int|null $lesson_id
 * @property string $title
 * @property string $type
 * @property int $max_score
 * @property string $date
 * @property string|null $deadline
 * @property string|null $description
 * @property int $created_by
 * @property int $created_at
 *
 * @property Group $group
 * @property AssessmentScore[] $scores
 */
class Assessment extends ActiveRecord
{
    public const TYPE_TEST     = 'test';
    public const TYPE_HOMEWORK = 'homework';
    public const TYPE_SPEAKING = 'speaking';
    public const TYPE_EXAM     = 'exam';
    public const TYPE_QUIZ     = 'quiz';

    public static function tableName(): string
    {
        return '{{%assessments}}';
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
            [['group_id', 'title', 'type', 'date', 'created_by'], 'required'],
            [['group_id', 'lesson_id', 'max_score', 'created_by'], 'integer'],
            [['max_score'], 'default', 'value' => 100],
            [['date', 'deadline'], 'safe'],
            [['title'], 'string', 'max' => 200],
            [['type'], 'string', 'max' => 20],
            [['type'], 'in', 'range' => [self::TYPE_TEST, self::TYPE_HOMEWORK, self::TYPE_SPEAKING, self::TYPE_EXAM, self::TYPE_QUIZ]],
            [['description'], 'string'],
            [['group_id'], 'exist', 'skipOnError' => true, 'targetClass' => Group::class, 'targetAttribute' => ['group_id' => 'id']],
        ];
    }

    public function getGroup(): ActiveQuery
    {
        return $this->hasOne(Group::class, ['id' => 'group_id']);
    }

    public function getScores(): ActiveQuery
    {
        return $this->hasMany(AssessmentScore::class, ['assessment_id' => 'id']);
    }

    public function fields(): array
    {
        return [
            'id',
            'group_id',
            'group_name' => function () {
                return $this->group ? $this->group->name : null;
            },
            'title',
            'type',
            'max_score',
            'date',
            'deadline',
            'description',
            'scores_count' => function () {
                return $this->getScores()->count();
            },
            'average_score' => function () {
                return round((float) $this->getScores()->average('score'), 1);
            },
            'created_at',
        ];
    }
}
