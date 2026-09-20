<?php

declare(strict_types=1);

namespace common\models;

use Yii;
use yii\base\NotSupportedException;
use yii\behaviors\TimestampBehavior;
use yii\db\ActiveRecord;
use yii\web\IdentityInterface;

/**
 * User model — O'quv markaz ERP
 *
 * @property int         $id
 * @property string      $name
 * @property string      $phone
 * @property string|null $email
 * @property string      $password_hash
 * @property string      $auth_key
 * @property string      $role
 * @property string|null $avatar
 * @property int         $status
 * @property int|null    $center_id
 * @property int         $created_at
 * @property int         $updated_at
 */
class User extends ActiveRecord implements IdentityInterface
{
    // ─── Status konstantalari ──────────────────────────────────────
    public const STATUS_DELETED  = 0;
    public const STATUS_INACTIVE = 9;
    public const STATUS_ACTIVE   = 10;

    // ─── Rol konstantalari ─────────────────────────────────────────
    public const ROLE_SUPER_ADMIN = 'super_admin';
    public const ROLE_MANAGER     = 'manager';
    public const ROLE_ADMIN       = 'admin';
    public const ROLE_TEACHER     = 'teacher';
    public const ROLE_STUDENT     = 'student';
    public const ROLE_PARENT      = 'parent';

    public static function tableName(): string
    {
        return '{{%users}}';
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
            ['name', 'string', 'max' => 100],
            ['phone', 'string', 'max' => 20],
            ['phone', 'unique'],
            ['email', 'email'],
            ['email', 'unique'],
            ['status', 'default', 'value' => self::STATUS_ACTIVE],
            ['status', 'in', 'range' => [self::STATUS_ACTIVE, self::STATUS_INACTIVE, self::STATUS_DELETED]],
            ['role', 'default', 'value' => self::ROLE_STUDENT],
            ['role', 'in', 'range' => [
                self::ROLE_SUPER_ADMIN, self::ROLE_MANAGER, self::ROLE_ADMIN,
                self::ROLE_TEACHER, self::ROLE_STUDENT, self::ROLE_PARENT,
            ]],
        ];
    }

    // ─── IdentityInterface ─────────────────────────────────────────

    public static function findIdentity($id): ?self
    {
        return static::findOne(['id' => $id, 'status' => self::STATUS_ACTIVE]);
    }

    public static function findIdentityByAccessToken($token, $type = null): ?self
    {
        // JWT orqali authenticate — JwtHttpBearerAuth ishlatiladi
        throw new NotSupportedException('findIdentityByAccessToken is not implemented.');
    }

    public function getId(): int
    {
        return (int) $this->getPrimaryKey();
    }

    public function getAuthKey(): string
    {
        return $this->auth_key;
    }

    public function validateAuthKey($authKey): bool
    {
        return $this->getAuthKey() === $authKey;
    }

    // ─── Password ─────────────────────────────────────────────────

    public static function findByPhone(string $phone): ?self
    {
        return static::findOne(['phone' => $phone, 'status' => self::STATUS_ACTIVE]);
    }

    public static function findByEmail(string $email): ?self
    {
        return static::findOne(['email' => $email, 'status' => self::STATUS_ACTIVE]);
    }

    public function validatePassword(string $password): bool
    {
        return Yii::$app->security->validatePassword($password, $this->password_hash);
    }

    public function setPassword(string $password): void
    {
        $this->password_hash = Yii::$app->security->generatePasswordHash($password);
    }

    public function generateAuthKey(): void
    {
        $this->auth_key = Yii::$app->security->generateRandomString();
    }

    // ─── Rol tekshirish metodlari ──────────────────────────────────

    public function hasRole(string $role): bool
    {
        return $this->role === $role;
    }

    public function canManage(): bool
    {
        return in_array($this->role, [
            self::ROLE_SUPER_ADMIN,
            self::ROLE_MANAGER,
            self::ROLE_ADMIN,
        ], true);
    }

    public function isTeacher(): bool
    {
        return $this->role === self::ROLE_TEACHER;
    }

    public function isStudent(): bool
    {
        return $this->role === self::ROLE_STUDENT;
    }

    public function isSuperAdmin(): bool
    {
        return $this->role === self::ROLE_SUPER_ADMIN;
    }

    // ─── Avatar ───────────────────────────────────────────────────

    public function getAvatarUrl(): ?string
    {
        if (!$this->avatar) {
            return null;
        }
        $base = Yii::$app->params['storageBaseUrl'] ?? '';
        return $base . '/' . ltrim($this->avatar, '/');
    }

    // ─── Relations ────────────────────────────────────────────────

    public function getTeacherGroups(): \yii\db\ActiveQuery
    {
        return $this->hasMany(Group::class, ['teacher_id' => 'id']);
    }

    public function getGroupStudents(): \yii\db\ActiveQuery
    {
        return $this->hasMany(GroupStudent::class, ['student_id' => 'id']);
    }

    public function getStudentGroups(): \yii\db\ActiveQuery
    {
        return $this->hasMany(Group::class, ['id' => 'group_id'])
            ->via('groupStudents');
    }

    // ─── Serialization ────────────────────────────────────────────

    public function fields(): array
    {
        return [
            'id',
            'name',
            'phone',
            'email',
            'role',
            'avatar' => fn() => $this->getAvatarUrl(),
            'status',
            'center_id',
            'groups_count' => function () {
                if ($this->isTeacher()) {
                    return $this->getTeacherGroups()->count();
                }
                if ($this->isStudent()) {
                    return $this->getGroupStudents()->where(['status' => GroupStudent::STATUS_ACTIVE])->count();
                }
                return 0;
            },
            'created_at',
        ];
    }

    public function extraFields(): array
    {
        return [
            'teacherGroups',
            'studentGroups',
            'groupStudents',
        ];
    }
}
