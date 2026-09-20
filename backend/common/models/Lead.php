<?php

declare(strict_types=1);

namespace common\models;

use yii\behaviors\TimestampBehavior;
use yii\db\ActiveQuery;
use yii\db\ActiveRecord;

/**
 * Lead model
 *
 * @property int $id
 * @property string $name
 * @property string $phone
 * @property int|null $course_id
 * @property string|null $source (instagram|telegram|website|friend|other)
 * @property string $status (new|contacted|trial|enrolled|lost)
 * @property string|null $notes
 * @property int|null $assigned_to
 * @property int|null $center_id
 * @property int|null $converted_at
 * @property int $created_at
 * @property int $updated_at
 *
 * @property Course|null $course
 * @property User|null $assignedTo
 * @property LeadActivity[] $activities
 */
class Lead extends ActiveRecord
{
    public const STATUS_NEW       = 'new';
    public const STATUS_CONTACTED = 'contacted';
    public const STATUS_TRIAL     = 'trial';
    public const STATUS_ENROLLED  = 'enrolled';
    public const STATUS_LOST      = 'lost';

    public const SOURCE_INSTAGRAM = 'instagram';
    public const SOURCE_TELEGRAM  = 'telegram';
    public const SOURCE_WEBSITE   = 'website';
    public const SOURCE_FRIEND    = 'friend';
    public const SOURCE_OTHER     = 'other';

    public static function tableName(): string
    {
        return '{{%leads}}';
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
            [['name', 'phone'], 'required'],
            [['course_id', 'assigned_to', 'center_id', 'converted_at'], 'integer'],
            [['name'], 'string', 'max' => 100],
            [['phone'], 'string', 'max' => 20],
            [['source'], 'string', 'max' => 50],
            [['status'], 'string', 'max' => 20],
            [['status'], 'default', 'value' => self::STATUS_NEW],
            [['status'], 'in', 'range' => [self::STATUS_NEW, self::STATUS_CONTACTED, self::STATUS_TRIAL, self::STATUS_ENROLLED, self::STATUS_LOST]],
            [['notes'], 'string'],
            [['course_id'], 'exist', 'skipOnError' => true, 'targetClass' => Course::class, 'targetAttribute' => ['course_id' => 'id']],
            [['assigned_to'], 'exist', 'skipOnError' => true, 'targetClass' => User::class, 'targetAttribute' => ['assigned_to' => 'id']],
        ];
    }

    public function getCourse(): ActiveQuery
    {
        return $this->hasOne(Course::class, ['id' => 'course_id']);
    }

    public function getAssignedTo(): ActiveQuery
    {
        return $this->hasOne(User::class, ['id' => 'assigned_to']);
    }

    public function getActivities(): ActiveQuery
    {
        return $this->hasMany(LeadActivity::class, ['lead_id' => 'id'])
            ->orderBy(['created_at' => SORT_DESC]);
    }

    public function fields(): array
    {
        return [
            'id',
            'name',
            'phone',
            'course_id',
            'course_name' => function () {
                return $this->course ? $this->course->name : null;
            },
            'source',
            'status',
            'notes',
            'assigned_to',
            'assigned_to_name' => function () {
                return $this->assignedTo ? $this->assignedTo->name : null;
            },
            'converted_at',
            'created_at',
            'updated_at',
        ];
    }
}
