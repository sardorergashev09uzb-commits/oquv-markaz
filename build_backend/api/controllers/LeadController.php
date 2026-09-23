<?php

declare(strict_types=1);

namespace api\controllers;

use api\components\JwtBearerAuth;
use common\models\Group;
use common\models\GroupStudent;
use common\models\Lead;
use common\models\LeadActivity;
use common\models\User;
use Yii;
use yii\data\ActiveDataProvider;
use yii\rest\Controller;
use yii\web\BadRequestHttpException;
use yii\web\NotFoundHttpException;

/**
 * LeadController — CRM va Lidlar boshqaruvi
 */
class LeadController extends Controller
{
    public $enableCsrfValidation = false;

    public function behaviors(): array
    {
        $behaviors = parent::behaviors();
        $behaviors['authenticator'] = [
            'class' => JwtBearerAuth::class,
            'except' => ['public-form'], // Saytdan ariza qoldirish uchun ruxsat
        ];
        return $behaviors;
    }

    /**
     * GET /api/leads
     */
    public function actionIndex(): array
    {
        $request = Yii::$app->request;
        $status = $request->get('status');
        $source = $request->get('source');
        $courseId = $request->get('course_id');
        $search = $request->get('search');

        $query = Lead::find()->with(['course', 'assignedTo']);

        if ($status) {
            $query->andWhere(['status' => $status]);
        }

        if ($source) {
            $query->andWhere(['source' => $source]);
        }

        if ($courseId) {
            $query->andWhere(['course_id' => (int) $courseId]);
        }

        if ($search) {
            $query->andWhere([
                'or',
                ['like', 'name', $search],
                ['like', 'phone', $search],
            ]);
        }

        $query->orderBy(['id' => SORT_DESC]);

        $provider = new ActiveDataProvider([
            'query' => $query,
            'pagination' => ['pageSize' => (int) $request->get('per_page', 50)],
        ]);

        return [
            'items' => $provider->getModels(),
            'total' => $provider->getTotalCount(),
        ];
    }

    /**
     * GET /api/leads/{id}
     */
    public function actionView(int $id): array
    {
        $lead = Lead::find()->with(['course', 'assignedTo', 'activities', 'activities.createdBy'])->where(['id' => $id])->one();
        if (!$lead) {
            throw new NotFoundHttpException("Lid topilmadi.");
        }

        return [
            'lead' => $lead,
            'activities' => $lead->activities,
        ];
    }

    /**
     * POST /api/leads
     */
    public function actionCreate(): array
    {
        $body = Yii::$app->request->bodyParams;
        $user = Yii::$app->user->identity;

        $lead = new Lead();
        $lead->attributes = $body;
        $lead->status = $body['status'] ?? Lead::STATUS_NEW;
        $lead->assigned_to = $user ? $user->id : 1;

        if (!$lead->save()) {
            Yii::$app->response->statusCode = 422;
            return ['errors' => $lead->getErrors()];
        }

        // Faoliyat yozish
        $act = new LeadActivity();
        $act->lead_id = $lead->id;
        $act->action = LeadActivity::ACTION_NOTE;
        $act->note = "Yangi ariza yaratildi";
        $act->created_by = $user ? $user->id : 1;
        $act->save(false);

        Yii::$app->response->statusCode = 201;
        return [
            'message' => "Lid muvaffaqiyatli saqlandi",
            'lead' => $lead,
        ];
    }

    /**
     * POST /api/leads/public-form — Tashqi saytdan ro'yxatdan o'tish
     */
    public function actionPublicForm(): array
    {
        $body = Yii::$app->request->bodyParams;

        $lead = new Lead();
        $lead->name = $body['name'] ?? 'Mijoz';
        $lead->phone = $body['phone'] ?? '';
        $lead->course_id = !empty($body['course_id']) ? (int) $body['course_id'] : null;
        $lead->source = $body['source'] ?? Lead::SOURCE_WEBSITE;
        $lead->status = Lead::STATUS_NEW;
        $lead->notes = $body['notes'] ?? 'Veb-sayt formasi orqali yozildi';

        if (!$lead->save()) {
            Yii::$app->response->statusCode = 422;
            return ['errors' => $lead->getErrors()];
        }

        return ['message' => "Arizangiz qabul qilindi! Tez orada bog'lanamiz.", 'lead_id' => $lead->id];
    }

    /**
     * PATCH /api/leads/{id}/status
     */
    public function actionUpdateStatus(int $id): array
    {
        $lead = Lead::findOne($id);
        if (!$lead) {
            throw new NotFoundHttpException("Lid topilmadi.");
        }

        $body = Yii::$app->request->bodyParams;
        $newStatus = $body['status'] ?? null;
        $note = $body['note'] ?? null;

        if (!$newStatus) {
            throw new BadRequestHttpException("Status ko'rsatilmadi.");
        }

        $oldStatus = $lead->status;
        $lead->status = $newStatus;
        $lead->save(false);

        // Faoliyat logiga yozish
        $user = Yii::$app->user->identity;
        $act = new LeadActivity();
        $act->lead_id = $lead->id;
        $act->action = LeadActivity::ACTION_STATUS_CHANGE;
        $act->note = "Status o'zgartirildi: {$oldStatus} → {$newStatus}" . ($note ? " ({$note})" : "");
        $act->created_by = $user ? $user->id : 1;
        $act->save(false);

        return [
            'message' => "Lid statusi yangilandi",
            'lead' => $lead,
        ];
    }

    /**
     * POST /api/leads/{id}/convert-to-student — Lidni o'quvchiga aylantirish
     */
    public function actionConvertToStudent(int $id): array
    {
        $lead = Lead::findOne($id);
        if (!$lead) {
            throw new NotFoundHttpException("Lid topilmadi.");
        }

        // Ikki marta bosish yoki qayta konvertatsiya qilishdan himoya
        if ($lead->status === Lead::STATUS_ENROLLED) {
            $existingStudent = User::findByPhone($lead->phone);
            return [
                'message' => "Lid allaqachon o'quvchiga aylantirilgan (dublikatdan himoyalandi)",
                'student' => $existingStudent,
                'lead' => $lead,
            ];
        }

        $body = Yii::$app->request->bodyParams;
        $groupId = !empty($body['group_id']) ? (int) $body['group_id'] : null;

        // O'quvchi yaratish yoki mavjudini topish
        $student = User::findByPhone($lead->phone);
        if (!$student) {
            $student = new User();
            $student->name = $lead->name;
            $student->phone = $lead->phone;
            $student->role = User::ROLE_STUDENT;
            $student->status = User::STATUS_ACTIVE;
            $student->setPassword('Student123!');
            $student->generateAuthKey();
            if (!$student->save()) {
                Yii::$app->response->statusCode = 422;
                return ['errors' => $student->getErrors()];
            }
        }

        // Guruhga biriktirish
        if ($groupId) {
            $group = Group::findOne($groupId);
            if ($group) {
                $gs = GroupStudent::findOne(['group_id' => $groupId, 'student_id' => $student->id]) ?? new GroupStudent();
                $gs->group_id = $groupId;
                $gs->student_id = $student->id;
                $gs->enrolled_at = date('Y-m-d');
                $gs->status = GroupStudent::STATUS_ACTIVE;
                $gs->save(false);
            }
        }

        // Lid statusini enrolled ga o'tkazish
        $lead->status = Lead::STATUS_ENROLLED;
        $lead->converted_at = time();
        $lead->save(false);

        // Faoliyat logiga yozish
        $user = Yii::$app->user->identity;
        $act = new LeadActivity();
        $act->lead_id = $lead->id;
        $act->action = 'converted';
        $act->note = "O'quvchiga aylantirildi (ID: #{$student->id})";
        $act->created_by = $user ? $user->id : 1;
        $act->save(false);

        return [
            'message' => "Lid muvaffaqiyatli o'quvchiga aylantirildi!",
            'student' => $student,
            'lead' => $lead,
        ];
    }

    /**
     * POST /api/leads/{id}/activity
     */
    public function actionAddActivity(int $id): array
    {
        $lead = Lead::findOne($id);
        if (!$lead) {
            throw new NotFoundHttpException("Lid topilmadi.");
        }

        $body = Yii::$app->request->bodyParams;
        $user = Yii::$app->user->identity;

        $act = new LeadActivity();
        $act->lead_id = $lead->id;
        $act->action = $body['action'] ?? LeadActivity::ACTION_NOTE;
        $act->note = $body['note'] ?? '';
        $act->created_by = $user ? $user->id : 1;

        if (!$act->save()) {
            Yii::$app->response->statusCode = 422;
            return ['errors' => $act->getErrors()];
        }

        return [
            'message' => "Faoliyat qayd etildi",
            'activity' => $act,
        ];
    }
}
