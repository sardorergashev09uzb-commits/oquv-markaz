<?php

declare(strict_types=1);

namespace common\models;

use yii\db\ActiveQuery;
use yii\db\ActiveRecord;

/**
 * Room model
 *
 * @property int $id
 * @property string $name
 * @property int $capacity
 * @property int|null $center_id
 * @property int $status
 *
 * @property Group[] $groups
 */
class Room extends ActiveRecord
{
    public const STATUS_INACTIVE = 0;
    public const STATUS_ACTIVE   = 1;

    public static function tableName(): string
    {
        return '{{%rooms}}';
    }

    public function rules(): array
    {
        return [
            [['name'], 'required'],
            [['name'], 'string', 'max' => 50],
            [['capacity', 'center_id', 'status'], 'integer'],
            [['capacity'], 'default', 'value' => 20],
            [['status'], 'default', 'value' => self::STATUS_ACTIVE],
            [['status'], 'in', 'range' => [self::STATUS_INACTIVE, self::STATUS_ACTIVE]],
        ];
    }

    public function getGroups(): ActiveQuery
    {
        return $this->hasMany(Group::class, ['room_id' => 'id']);
    }

    public function fields(): array
    {
        return [
            'id',
            'name',
            'capacity',
            'status',
            'groups_count' => function () {
                return $this->getGroups()->count();
            },
        ];
    }
}
