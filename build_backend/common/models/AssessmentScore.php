<?php

declare(strict_types=1);

namespace common\models;

use yii\behaviors\TimestampBehavior;
use yii\db\ActiveQuery;
use yii\db\ActiveRecord;

/**
 * AssessmentScore model
 *
 * @property int $id
 * @property int $assessment_id
 * @property int $student_id
 * @property float|null $score
 * @property string|null $feedback
 * @property string $status
 * @property int|null $graded_by
 * @property int|null $graded_at
 * @property int $created_at
 *
 * @property Assessment $assessment
 * @property User $student
 */
class AssessmentScore extends ActiveRecord
{
    public const STATUS_PENDING   = 'pending';
    public const STATUS_SUBMITTED = 'submitted';
    public const STATUS_GRADED    = 'graded';

    public static function tableName(): string
    {
        return '{{%assessment_scores}}';
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
            [['assessment_id', 'student_id'], 'required'],
            [['assessment_id', 'student_id', 'graded_by', 'graded_at'], 'integer'],
            [['score'], 'number'],
            [['feedback'], 'string'],
            [['status'], 'string', 'max' => 20],
            [['status'], 'default', 'value' => self::STATUS_GRADED],
            [['assessment_id', 'student_id'], 'unique', 'targetAttribute' => ['assessment_id', 'student_id']],
            [['assessment_id'], 'exist', 'skipOnError' => true, 'targetClass' => Assessment::class, 'targetAttribute' => ['assessment_id' => 'id']],
            [['student_id'], 'exist', 'skipOnError' => true, 'targetClass' => User::class, 'targetAttribute' => ['student_id' => 'id']],
        ];
    }

    public function getAssessment(): ActiveQuery
    {
        return $this->hasOne(Assessment::class, ['id' => 'assessment_id']);
    }

    public function getStudent(): ActiveQuery
    {
        return $this->hasOne(User::class, ['id' => 'student_id']);
    }

    public function fields(): array
    {
        return [
            'id',
            'assessment_id',
            'student_id',
            'student_name' => function () {
                return $this->student ? $this->student->name : null;
            },
            'score',
            'feedback',
            'status',
            'graded_at',
        ];
    }
}
