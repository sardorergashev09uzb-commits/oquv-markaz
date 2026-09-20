<?php

declare(strict_types=1);

namespace common\models;

use yii\behaviors\TimestampBehavior;
use yii\db\ActiveQuery;
use yii\db\ActiveRecord;

/**
 * StudentDocument model
 *
 * @property int $id
 * @property int $student_id
 * @property string $type (passport|contract|certificate|payment_agreement|other)
 * @property string $title
 * @property string $file_url
 * @property int $created_at
 *
 * @property User $student
 */
class StudentDocument extends ActiveRecord
{
    public const TYPE_PASSPORT          = 'passport';
    public const TYPE_CONTRACT          = 'contract';
    public const TYPE_CERTIFICATE       = 'certificate';
    public const TYPE_PAYMENT_AGREEMENT = 'payment_agreement';
    public const TYPE_OTHER             = 'other';

    public static function tableName(): string
    {
        return '{{%student_documents}}';
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
            [['student_id', 'type', 'title', 'file_url'], 'required'],
            [['student_id'], 'integer'],
            [['type'], 'string', 'max' => 30],
            [['title'], 'string', 'max' => 200],
            [['file_url'], 'string', 'max' => 500],
            [['student_id'], 'exist', 'skipOnError' => true, 'targetClass' => User::class, 'targetAttribute' => ['student_id' => 'id']],
        ];
    }

    public function getStudent(): ActiveQuery
    {
        return $this->hasOne(User::class, ['id' => 'student_id']);
    }

    public function fields(): array
    {
        return [
            'id',
            'student_id',
            'type',
            'title',
            'file_url',
            'created_at',
        ];
    }
}
