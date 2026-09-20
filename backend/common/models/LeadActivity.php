<?php

declare(strict_types=1);

namespace common\models;

use yii\behaviors\TimestampBehavior;
use yii\db\ActiveQuery;
use yii\db\ActiveRecord;

/**
 * LeadActivity model
 *
 * @property int $id
 * @property int $lead_id
 * @property string $action (call|meeting|trial_lesson|note|status_change)
 * @property string|null $note
 * @property int|null $created_by
 * @property int $created_at
 *
 * @property Lead $lead
 * @property User|null $createdBy
 */
class LeadActivity extends ActiveRecord
{
    public const ACTION_CALL          = 'call';
    public const ACTION_MEETING       = 'meeting';
    public const ACTION_TRIAL_LESSON  = 'trial_lesson';
    public const ACTION_NOTE          = 'note';
    public const ACTION_STATUS_CHANGE = 'status_change';

    public static function tableName(): string
    {
        return '{{%lead_activities}}';
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
            [['lead_id', 'action'], 'required'],
            [['lead_id', 'created_by'], 'integer'],
            [['action'], 'string', 'max' => 50],
            [['note'], 'string'],
            [['lead_id'], 'exist', 'skipOnError' => true, 'targetClass' => Lead::class, 'targetAttribute' => ['lead_id' => 'id']],
        ];
    }

    public function getLead(): ActiveQuery
    {
        return $this->hasOne(Lead::class, ['id' => 'lead_id']);
    }

    public function getCreatedBy(): ActiveQuery
    {
        return $this->hasOne(User::class, ['id' => 'created_by']);
    }

    public function fields(): array
    {
        return [
            'id',
            'lead_id',
            'action',
            'note',
            'created_by',
            'created_by_name' => function () {
                return $this->createdBy ? $this->createdBy->name : null;
            },
            'created_at',
        ];
    }
}
