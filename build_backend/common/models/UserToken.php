<?php

declare(strict_types=1);

namespace common\models;

use yii\db\ActiveRecord;

/**
 * UserToken model — refresh tokenlar
 *
 * @property int    $id
 * @property int    $user_id
 * @property string $token
 * @property string $type
 * @property int    $expired_at
 * @property int    $created_at
 */
class UserToken extends ActiveRecord
{
    public static function tableName(): string
    {
        return '{{%user_tokens}}';
    }

    public function rules(): array
    {
        return [
            [['user_id', 'token', 'expired_at', 'created_at'], 'required'],
            ['token', 'unique'],
            ['type', 'default', 'value' => 'refresh'],
        ];
    }

    public static function findByToken(string $token): ?self
    {
        return static::findOne(['token' => $token, 'type' => 'refresh']);
    }

    public function isExpired(): bool
    {
        return $this->expired_at <= time();
    }

    public function getUser(): ?\yii\db\ActiveQuery
    {
        return $this->hasOne(User::class, ['id' => 'user_id']);
    }
}
