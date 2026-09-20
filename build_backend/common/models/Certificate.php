<?php

declare(strict_types=1);

namespace common\models;

use yii\behaviors\TimestampBehavior;
use yii\db\ActiveQuery;
use yii\db\ActiveRecord;

/**
 * Certificate model
 *
 * @property int $id
 * @property int $student_id
 * @property int $group_id
 * @property string $cert_number
 * @property float|null $final_score
 * @property string $issued_at
 * @property string|null $pdf_url
 * @property int $created_at
 *
 * @property User $student
 * @property Group $group
 */
class Certificate extends ActiveRecord
{
    public static function tableName(): string
    {
        return '{{%certificates}}';
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
            [['student_id', 'group_id', 'cert_number', 'issued_at'], 'required'],
            [['student_id', 'group_id'], 'integer'],
            [['final_score'], 'number'],
            [['issued_at'], 'safe'],
            [['cert_number'], 'string', 'max' => 50],
            [['cert_number'], 'unique'],
            [['pdf_url'], 'string', 'max' => 500],
            [['student_id'], 'exist', 'skipOnError' => true, 'targetClass' => User::class, 'targetAttribute' => ['student_id' => 'id']],
            [['group_id'], 'exist', 'skipOnError' => true, 'targetClass' => Group::class, 'targetAttribute' => ['group_id' => 'id']],
        ];
    }

    public function getStudent(): ActiveQuery
    {
        return $this->hasOne(User::class, ['id' => 'student_id']);
    }

    public function getGroup(): ActiveQuery
    {
        return $this->hasOne(Group::class, ['id' => 'group_id']);
    }

    public function fields(): array
    {
        return [
            'id',
            'student_id',
            'student_name' => function () {
                return $this->student ? $this->student->name : null;
            },
            'group_id',
            'group_name' => function () {
                return $this->group ? $this->group->name : null;
            },
            'course_name' => function () {
                return $this->group && $this->group->course ? $this->group->course->name : null;
            },
            'cert_number',
            'final_score',
            'issued_at',
            'pdf_url',
            'created_at',
        ];
    }
}
