<?php

declare(strict_types=1);

namespace common\models;

use yii\behaviors\TimestampBehavior;
use yii\db\ActiveQuery;
use yii\db\ActiveRecord;

/**
 * Course model
 *
 * @property int $id
 * @property string $name
 * @property string|null $level
 * @property string|null $description
 * @property int $duration_months
 * @property int $price
 * @property int|null $center_id
 * @property int $status
 * @property int $created_at
 * @property int $updated_at
 *
 * @property Group[] $groups
 */
class Course extends ActiveRecord
{
    public const STATUS_INACTIVE = 0;
    public const STATUS_ACTIVE   = 1;

    public static function tableName(): string
    {
        return '{{%courses}}';
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
            [['name'], 'required'],
            [['name'], 'string', 'max' => 100],
            [['level'], 'string', 'max' => 50],
            [['description'], 'string'],
            [['duration_months', 'price', 'center_id', 'status'], 'integer'],
            [['duration_months'], 'default', 'value' => 3],
            [['price'], 'default', 'value' => 0],
            [['status'], 'default', 'value' => self::STATUS_ACTIVE],
            [['status'], 'in', 'range' => [self::STATUS_INACTIVE, self::STATUS_ACTIVE]],
        ];
    }

    public function getGroups(): ActiveQuery
    {
        return $this->hasMany(Group::class, ['course_id' => 'id']);
    }

    public function fields(): array
    {
        return [
            'id',
            'name',
            'level',
            'description',
            'duration_months',
            'price',
            'status',
            'groups_count' => function () {
                return $this->getGroups()->count();
            },
            'created_at',
            'updated_at',
        ];
    }
}
