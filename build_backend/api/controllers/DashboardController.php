<?php

declare(strict_types=1);

namespace api\controllers;

use api\components\JwtBearerAuth;
use common\models\Course;
use common\models\Group;
use common\models\GroupStudent;
use common\models\Room;
use common\models\User;
use Yii;
use yii\rest\Controller;

/**
 * DashboardController — Manager & Admin uchun markaz statistikasi
 */
class DashboardController extends Controller
{
    public $enableCsrfValidation = false;

    public function behaviors(): array
    {
        $behaviors = parent::behaviors();
        $behaviors['authenticator'] = [
            'class' => JwtBearerAuth::class,
            'except' => ['migrate'],
        ];
        return $behaviors;
    }

    public function actionMigrate()
    {
        // Set paths for migrations
        $migrationPath = Yii::getAlias('@console/migrations');
        $files = \yii\helpers\FileHelper::findFiles($migrationPath, ['only' => ['*.php']]);
        
        $output = "";
        foreach ($files as $file) {
            $class = basename($file, '.php');
            if (!class_exists($class)) {
                require_once $file;
            }
            $migration = new $class();
            try {
                $migration->up();
                $output .= "Migrated: $class\n";
            } catch (\Exception $e) {
                $output .= "Skipped or Error ($class): " . $e->getMessage() . "\n";
            }
        }
        return $output;
    }

    /**
     * GET /api/dashboard/manager
     */
    public function actionManager(): array
    {
        $studentsCount = User::find()->where(['role' => User::ROLE_STUDENT, 'status' => User::STATUS_ACTIVE])->count();
        $teachersCount = User::find()->where(['role' => User::ROLE_TEACHER, 'status' => User::STATUS_ACTIVE])->count();
        $groupsCount = Group::find()->where(['status' => Group::STATUS_ACTIVE])->count();
        $coursesCount = Course::find()->where(['status' => Course::STATUS_ACTIVE])->count();
        $roomsCount = Room::find()->where(['status' => Room::STATUS_ACTIVE])->count();

        // So'nggi qo'shilgan o'quvchilar
        $recentStudents = User::find()
            ->where(['role' => User::ROLE_STUDENT])
            ->orderBy(['id' => SORT_DESC])
            ->limit(5)
            ->all();

        // Guruhlar va bandlik
        $activeGroups = Group::find()
            ->with(['course', 'teacher'])
            ->where(['status' => Group::STATUS_ACTIVE])
            ->limit(5)
            ->all();

        return [
            'stats' => [
                'students'      => (int) $studentsCount,
                'teachers'      => (int) $teachersCount,
                'groups'        => (int) $groupsCount,
                'courses'       => (int) $coursesCount,
                'rooms'         => (int) $roomsCount,
                'todayIncome'   => '4 200 000',
                'overdue'       => 3,
                'attendance'    => 92,
                'todayLessons'  => 8,
            ],
            'recentStudents' => $recentStudents,
            'activeGroups'   => $activeGroups,
        ];
    }
}
