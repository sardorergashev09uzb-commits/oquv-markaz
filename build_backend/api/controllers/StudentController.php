<?php

declare(strict_types=1);

namespace api\controllers;

use api\components\JwtBearerAuth;
use common\models\Group;
use common\models\GroupStudent;
use common\models\PaymentPlan;
use common\models\User;
use Yii;
use yii\data\ActiveDataProvider;
use yii\rest\Controller;
use yii\web\BadRequestHttpException;
use yii\web\NotFoundHttpException;

/**
 * StudentController — O'quvchilar boshqaruvi
 */
class StudentController extends Controller
{
    public $enableCsrfValidation = false;

    public function behaviors(): array
    {
        $behaviors = parent::behaviors();
        $behaviors['authenticator'] = [
            'class' => JwtBearerAuth::class,
        ];
        return $behaviors;
    }

    /**
     * GET /api/students yoki /api/student
     */
    public function actionIndex(): array
    {
        $request = Yii::$app->request;
        $search = $request->get('search');
        $status = $request->get('status');
        $groupId = $request->get('group_id');

        $query = User::find()->where(['role' => User::ROLE_STUDENT]);

        // Rol asosida filtrlash: O'qituvchi FAQAT o'ziga biriktirilgan guruhlar o'quvchilarini ko'radi
        $currentUser = Yii::$app->user->identity;
        if ($currentUser && $currentUser->role === User::ROLE_TEACHER) {
            $teacherGroupIds = Group::find()
                ->where(['teacher_id' => $currentUser->id])
                ->select('id')
                ->column();

            if (empty($teacherGroupIds)) {
                return [
                    'items' => [],
                    'pagination' => [
                        'total' => 0,
                        'page' => 1,
                        'pageSize' => 20,
                        'pageCount' => 0,
                    ],
                ];
            }

            $studentIds = GroupStudent::find()
                ->where(['group_id' => $teacherGroupIds, 'status' => GroupStudent::STATUS_ACTIVE])
                ->select('student_id')
                ->distinct()
                ->column();

            if (empty($studentIds)) {
                return [
                    'items' => [],
                    'pagination' => [
                        'total' => 0,
                        'page' => 1,
                        'pageSize' => 20,
                        'pageCount' => 0,
                    ],
                ];
            }

            $query->andWhere(['{{%users}}.id' => $studentIds]);
        }

        if ($search) {
            $query->andWhere([
                'or',
                ['like', 'name', $search],
                ['like', 'phone', $search],
                ['like', 'email', $search],
            ]);
        }

        if ($status !== null && $status !== '') {
            $query->andWhere(['status' => (int) $status]);
        }

        if ($groupId) {
            if ($currentUser && $currentUser->role === User::ROLE_TEACHER) {
                $ownsGroup = Group::find()->where(['id' => (int) $groupId, 'teacher_id' => $currentUser->id])->exists();
                if (!$ownsGroup) {
                    return [
                        'items' => [],
                        'pagination' => ['total' => 0, 'page' => 1, 'pageSize' => 20, 'pageCount' => 0],
                    ];
                }
            }
            $query->innerJoin('{{%group_students}} gs', 'gs.student_id = {{%users}}.id')
                  ->andWhere(['gs.group_id' => (int) $groupId, 'gs.status' => GroupStudent::STATUS_ACTIVE]);
        }

        $query->orderBy(['id' => SORT_DESC]);

        $pageSize = (int) $request->get('per_page', 20);
        $provider = new ActiveDataProvider([
            'query' => $query,
            'pagination' => [
                'pageSize' => $pageSize,
            ],
        ]);

        return [
            'items' => $provider->getModels(),
            'pagination' => [
                'total' => $provider->getTotalCount(),
                'page' => $provider->getPagination()->getPage() + 1,
                'pageSize' => $pageSize,
                'pageCount' => $provider->getPagination()->getPageCount(),
            ],
        ];
    }

    /**
     * GET /api/students/{id} — Student 360
     */
    public function actionView(int $id): array
    {
        $student = User::findOne(['id' => $id, 'role' => User::ROLE_STUDENT]);
        if (!$student) {
            throw new NotFoundHttpException("O'quvchi topilmadi.");
        }

        $currentUser = Yii::$app->user->identity;

        // O'quvchi FAQAT o'z profilini ko'ra oladi
        if ($currentUser && $currentUser->role === User::ROLE_STUDENT && $currentUser->id !== $id) {
            throw new \yii\web\ForbiddenHttpException("Siz boshqa o'quvchilar ma'lumotlarini ko'ra olmaysiz.");
        }

        // O'qituvchi faqat o'z o'quvchisini ko'ra oladi
        if ($currentUser && $currentUser->role === User::ROLE_TEACHER) {
            $isMyStudent = GroupStudent::find()
                ->innerJoin('{{%groups}} g', 'g.id = {{%group_students}}.group_id')
                ->where(['g.teacher_id' => $currentUser->id, '{{%group_students}}.student_id' => $id])
                ->exists();
            if (!$isMyStudent) {
                throw new \yii\web\ForbiddenHttpException("Siz faqat o'z guruhingizdagi o'quvchilar ma'lumotlarini ko'rishingiz mumkin.");
            }
        }

        // Biriktirilgan guruhlar ro'yxati
        $memberships = GroupStudent::find()
            ->with(['group', 'group.course', 'group.teacher'])
            ->where(['student_id' => $id])
            ->all();

        $groupsData = [];
        foreach ($memberships as $m) {
            if ($m->group) {
                $groupsData[] = [
                    'membership_id' => $m->id,
                    'group_id' => $m->group_id,
                    'group_name' => $m->group->name,
                    'course_name' => $m->group->course ? $m->group->course->name : null,
                    'teacher_name' => $m->group->teacher ? $m->group->teacher->name : null,
                    'enrolled_at' => $m->enrolled_at,
                    'status' => $m->status,
                ];
            }
        }

        return [
            'student' => $student,
            'groups' => $groupsData,
        ];
    }

    /**
     * POST /api/students
     */
    public function actionCreate(): array
    {
        $body = Yii::$app->request->bodyParams;

        $student = new User();
        $student->name = $body['name'] ?? null;
        $student->phone = $body['phone'] ?? null;
        $student->email = $body['email'] ?? null;
        $student->role = User::ROLE_STUDENT;
        $student->status = isset($body['status']) ? (int) $body['status'] : User::STATUS_ACTIVE;

        $rawPassword = $body['password'] ?? 'Student123!';
        $student->setPassword($rawPassword);
        $student->generateAuthKey();

        if (!$student->save()) {
            Yii::$app->response->statusCode = 422;
            return ['errors' => $student->getErrors()];
        }

        // Agar guruh ID ko'rsatilgan bo'lsa, unga biriktirish
        if (!empty($body['group_id'])) {
            $group = Group::findOne($body['group_id']);
            if ($group) {
                $gs = new GroupStudent();
                $gs->group_id = $group->id;
                $gs->student_id = $student->id;
                $gs->enrolled_at = date('Y-m-d');
                $gs->status = GroupStudent::STATUS_ACTIVE;
                $gs->save(false);
            }
        }

        Yii::$app->response->statusCode = 201;
        return [
            'message' => "O'quvchi muvaffaqiyatli qo'shildi",
            'student' => $student,
        ];
    }

    /**
     * PUT/PATCH /api/students/{id}
     */
    public function actionUpdate(int $id): array
    {
        $student = User::findOne(['id' => $id, 'role' => User::ROLE_STUDENT]);
        if (!$student) {
            throw new NotFoundHttpException("O'quvchi topilmadi.");
        }

        $body = Yii::$app->request->bodyParams;
        if (isset($body['name'])) $student->name = $body['name'];
        if (isset($body['phone'])) $student->phone = $body['phone'];
        if (isset($body['email'])) $student->email = $body['email'];
        if (isset($body['status'])) $student->status = (int) $body['status'];
        if (!empty($body['password'])) {
            $student->setPassword($body['password']);
        }

        if (!$student->save()) {
            Yii::$app->response->statusCode = 422;
            return ['errors' => $student->getErrors()];
        }

        return [
            'message' => "O'quvchi ma'lumotlari yangilandi",
            'student' => $student,
        ];
    }

    /**
     * DELETE /api/students/{id}
     */
    public function actionDelete(int $id): array
    {
        $student = User::findOne(['id' => $id, 'role' => User::ROLE_STUDENT]);
        if (!$student) {
            throw new NotFoundHttpException("O'quvchi topilmadi.");
        }

        $force = (int) Yii::$app->request->get('force', 0);
        if ($force === 1) {
            return $this->actionForceDelete($id);
        }

        // Soft delete yoki deaktivatsiya
        $student->status = User::STATUS_INACTIVE;
        $student->save(false);

        return ['message' => "O'quvchi muvaffaqiyatli arxivlandi"];
    }

    /**
     * POST /api/students/{id}/restore — Arxivdan chiqarish
     */
    public function actionRestore(int $id): array
    {
        $student = User::findOne(['id' => $id, 'role' => User::ROLE_STUDENT]);
        if (!$student) {
            throw new NotFoundHttpException("O'quvchi topilmadi.");
        }

        $student->status = User::STATUS_ACTIVE;
        $student->save(false);

        return [
            'message' => "O'quvchi arxivdan chiqarildi va faollashtirildi",
            'student' => $student,
        ];
    }

    /**
     * DELETE /api/students/{id}/force — Bazadan butunlay o'chirish
     */
    public function actionForceDelete(int $id): array
    {
        $currentUser = Yii::$app->user->identity;
        if ($currentUser && $currentUser->role !== User::ROLE_ADMIN) {
            throw new \yii\web\ForbiddenHttpException("Faqat administrator o'quvchini bazadan butunlay o'chira oladi.");
        }

        $student = User::findOne(['id' => $id, 'role' => User::ROLE_STUDENT]);
        if (!$student) {
            throw new NotFoundHttpException("O'quvchi topilmadi.");
        }

        // Bog'liq ma'lumotlarni tozalash
        GroupStudent::deleteAll(['student_id' => $id]);
        PaymentPlan::deleteAll(['student_id' => $id]);

        $student->delete();

        return ['message' => "O'quvchi bazadan butunlay o'chirildi"];
    }

    /**
     * POST /api/students/{id}/assign-group
     */
    public function actionAssignGroup(int $id): array
    {
        $student = User::findOne(['id' => $id, 'role' => User::ROLE_STUDENT]);
        if (!$student) {
            throw new NotFoundHttpException("O'quvchi topilmadi.");
        }

        $groupId = (int) Yii::$app->request->getBodyParam('group_id');
        $group = Group::findOne($groupId);
        if (!$group) {
            throw new NotFoundHttpException("Guruh topilmadi.");
        }

        $gs = GroupStudent::findOne(['group_id' => $groupId, 'student_id' => $id]);
        if ($gs) {
            $gs->status = GroupStudent::STATUS_ACTIVE;
            $gs->left_at = null;
        } else {
            $gs = new GroupStudent();
            $gs->group_id = $groupId;
            $gs->student_id = $id;
            $gs->enrolled_at = date('Y-m-d');
            $gs->status = GroupStudent::STATUS_ACTIVE;
        }

        if (!$gs->save()) {
            Yii::$app->response->statusCode = 422;
            return ['errors' => $gs->getErrors()];
        }

        return ['message' => "O'quvchi guruhga biriktirildi", 'membership' => $gs];
    }

    /**
     * POST /api/students/{id}/transfer-group
     */
    public function actionTransferGroup(int $id): array
    {
        $student = User::findOne(['id' => $id, 'role' => User::ROLE_STUDENT]);
        if (!$student) {
            throw new NotFoundHttpException("O'quvchi topilmadi.");
        }

        $body = Yii::$app->request->bodyParams;
        $fromGroupId = (int) ($body['from_group_id'] ?? 0);
        $toGroupId = (int) ($body['to_group_id'] ?? 0);
        $reason = $body['reason'] ?? null;

        if (!$fromGroupId || !$toGroupId) {
            Yii::$app->response->statusCode = 422;
            return ['message' => "Eski va yangi guruhni tanlash majburiy."];
        }

        if ($fromGroupId === $toGroupId) {
            Yii::$app->response->statusCode = 422;
            return ['message' => "Yangi guruh eski guruhdan farq qilishi kerak."];
        }

        $toGroup = Group::findOne($toGroupId);
        if (!$toGroup) {
            throw new NotFoundHttpException("Yangi guruh topilmadi.");
        }

        // 1. Eski guruhdagi a'zolikni yopish
        $oldGs = GroupStudent::findOne(['group_id' => $fromGroupId, 'student_id' => $id]);
        if ($oldGs) {
            $oldGs->status = GroupStudent::STATUS_LEFT;
            $oldGs->left_at = date('Y-m-d');
            $oldGs->save(false);
        }

        // 2. Yangi guruhga a'zo qilish
        $newGs = GroupStudent::findOne(['group_id' => $toGroupId, 'student_id' => $id]);
        if ($newGs) {
            $newGs->status = GroupStudent::STATUS_ACTIVE;
            $newGs->left_at = null;
        } else {
            $newGs = new GroupStudent();
            $newGs->group_id = $toGroupId;
            $newGs->student_id = $id;
            $newGs->enrolled_at = date('Y-m-d');
            $newGs->status = GroupStudent::STATUS_ACTIVE;
        }
        $newGs->save(false);

        // 3. To'lov rejasini yangi guruh bilan bog'lash (agar joriy oy rejasi mavjud bo'lsa)
        $currentMonth = date('Y-m');
        $oldPlan = PaymentPlan::findOne(['student_id' => $id, 'group_id' => $fromGroupId, 'month' => $currentMonth]);
        if ($oldPlan && !PaymentPlan::find()->where(['student_id' => $id, 'group_id' => $toGroupId, 'month' => $currentMonth])->exists()) {
            $oldPlan->group_id = $toGroupId;
            $oldPlan->save(false);
        }

        return [
            'message' => "O'quvchi muvaffaqiyatli boshqa guruhga ko'chirildi",
            'from_group_id' => $fromGroupId,
            'to_group_id' => $toGroupId,
        ];
    }

    /**
     * POST /api/students/{id}/revert-transfer
     * Ko'chirishni bekor qilish va eski guruhga qaytarish
     */
    public function actionRevertTransfer(int $id): array
    {
        $student = User::findOne(['id' => $id, 'role' => User::ROLE_STUDENT]);
        if (!$student) {
            throw new NotFoundHttpException("O'quvchi topilmadi.");
        }

        $body = Yii::$app->request->bodyParams;
        $fromGroupId = (int) ($body['from_group_id'] ?? 0); // Guruh qayerdan qaytarilayotgani (joriy guruh)
        $toGroupId = (int) ($body['to_group_id'] ?? 0);     // Qaysi guruhga qaytarilishi kerak (eski asl guruh)

        if (!$fromGroupId || !$toGroupId) {
            Yii::$app->response->statusCode = 422;
            return ['message' => "Guruhlarni ko'rsatish majburiy."];
        }

        // 1. Yangi guruhdagi faollikni to'xtatish
        $currentGs = GroupStudent::findOne(['group_id' => $fromGroupId, 'student_id' => $id]);
        if ($currentGs) {
            $currentGs->status = GroupStudent::STATUS_LEFT;
            $currentGs->left_at = date('Y-m-d');
            $currentGs->save(false);
        }

        // 2. Asl guruhdagi a'zolikni qayta faollashtirish
        $oldGs = GroupStudent::findOne(['group_id' => $toGroupId, 'student_id' => $id]);
        if ($oldGs) {
            $oldGs->status = GroupStudent::STATUS_ACTIVE;
            $oldGs->left_at = null;
            $oldGs->save(false);
        } else {
            $oldGs = new GroupStudent();
            $oldGs->group_id = $toGroupId;
            $oldGs->student_id = $id;
            $oldGs->enrolled_at = date('Y-m-d');
            $oldGs->status = GroupStudent::STATUS_ACTIVE;
            $oldGs->save(false);
        }

        // 3. Joriy oydagi to'lov rejasini asl guruhga qaytarish
        $currentMonth = date('Y-m');
        $plan = PaymentPlan::findOne(['student_id' => $id, 'group_id' => $fromGroupId, 'month' => $currentMonth]);
        if ($plan) {
            $plan->group_id = $toGroupId;
            $plan->save(false);
        }

        return [
            'message' => "Ko'chirish muvaffaqiyatli bekor qilindi, o'quvchi asl guruhiga qaytarildi",
            'reverted_to_group_id' => $toGroupId,
        ];
    }
}
