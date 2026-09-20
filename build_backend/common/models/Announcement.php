<?php

declare(strict_types=1);

namespace common\models;

use yii\behaviors\TimestampBehavior;
use yii\db\ActiveQuery;
use yii\db\ActiveRecord;

/**
 * Announcement model
 *
 * @property int $id
 * @property int $author_id
 * @property string $target_type (all|group|student)
 * @property int|null $target_id
 * @property string $title
 * @property string $content
 * @property int|null $center_id
 * @property int $published_at
 * @property int $created_at
 *
 * @property User $author
 */
class Announcement extends ActiveRecord
{
    public const TARGET_ALL     = 'all';
    public const TARGET_GROUP   = 'group';
    public const TARGET_STUDENT = 'student';

    public static function tableName(): string
    {
        return '{{%announcements}}';
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
            [['author_id', 'title', 'content'], 'required'],
            [['author_id', 'target_id', 'center_id', 'published_at'], 'integer'],
            [['title'], 'string', 'max' => 200],
            [['content'], 'string'],
            [['target_type'], 'string', 'max' => 20],
            [['target_type'], 'default', 'value' => self::TARGET_ALL],
            [['target_type'], 'in', 'range' => [self::TARGET_ALL, self::TARGET_GROUP, self::TARGET_STUDENT]],
            [['author_id'], 'exist', 'skipOnError' => true, 'targetClass' => User::class, 'targetAttribute' => ['author_id' => 'id']],
        ];
    }

    public function getAuthor(): ActiveQuery
    {
        return $this->hasOne(User::class, ['id' => 'author_id']);
    }

    public function fields(): array
    {
        return [
            'id',
            'author_id',
            'author_name' => function () {
                return $this->author ? $this->author->name : null;
            },
            'target_type',
            'target_id',
            'title',
            'content',
            'published_at',
            'created_at',
        ];
    }
}
