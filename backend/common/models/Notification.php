<?php

declare(strict_types=1);

namespace common\models;

use yii\behaviors\TimestampBehavior;
use yii\db\ActiveQuery;
use yii\db\ActiveRecord;

/**
 * Notification model
 *
 * @property int $id
 * @property int $user_id
 * @property string $title
 * @property string|null $body
 * @property string|null $type (payment|attendance|grade|homework|announcement|exam)
 * @property string|null $data_json
 * @property bool $is_read
 * @property int $created_at
 *
 * @property User $user
 */
class Notification extends ActiveRecord
{
    public const TYPE_PAYMENT      = 'payment';
    public const TYPE_ATTENDANCE   = 'attendance';
    public const TYPE_GRADE        = 'grade';
    public const TYPE_HOMEWORK     = 'homework';
    public const TYPE_ANNOUNCEMENT = 'announcement';
    public const TYPE_EXAM         = 'exam';

    public static function tableName(): string
    {
        return '{{%notifications}}';
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
            [['user_id', 'title'], 'required'],
            [['user_id'], 'integer'],
            [['is_read'], 'boolean'],
            [['is_read'], 'default', 'value' => false],
            [['title'], 'string', 'max' => 200],
            [['body', 'data_json'], 'string'],
            [['type'], 'string', 'max' => 30],
            [['user_id'], 'exist', 'skipOnError' => true, 'targetClass' => User::class, 'targetAttribute' => ['user_id' => 'id']],
        ];
    }

    public function getUser(): ActiveQuery
    {
        return $this->hasOne(User::class, ['id' => 'user_id']);
    }

    public function fields(): array
    {
        return [
            'id',
            'user_id',
            'title',
            'body',
            'type',
            'is_read',
            'created_at',
        ];
    }
}
