<?php

declare(strict_types=1);

namespace common\models;

use yii\behaviors\TimestampBehavior;
use yii\db\ActiveQuery;
use yii\db\ActiveRecord;

/**
 * Expense model
 *
 * @property int $id
 * @property string $category (rent|salary|ads|internet|other)
 * @property int $amount
 * @property string|null $description
 * @property string $date
 * @property int|null $center_id
 * @property int $created_by
 * @property int $created_at
 *
 * @property User $createdBy
 */
class Expense extends ActiveRecord
{
    public const CATEGORY_RENT     = 'rent';
    public const CATEGORY_SALARY   = 'salary';
    public const CATEGORY_ADS      = 'ads';
    public const CATEGORY_INTERNET = 'internet';
    public const CATEGORY_OTHER    = 'other';

    public static function tableName(): string
    {
        return '{{%expenses}}';
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
            [['category', 'amount', 'date', 'created_by'], 'required'],
            [['amount', 'center_id', 'created_by'], 'integer'],
            [['date'], 'safe'],
            [['category'], 'string', 'max' => 50],
            [['description'], 'string', 'max' => 500],
        ];
    }

    public function getCreatedBy(): ActiveQuery
    {
        return $this->hasOne(User::class, ['id' => 'created_by']);
    }

    public function fields(): array
    {
        return [
            'id',
            'category',
            'amount',
            'description',
            'date',
            'created_by_name' => function () {
                return $this->createdBy ? $this->createdBy->name : null;
            },
            'created_at',
        ];
    }
}
