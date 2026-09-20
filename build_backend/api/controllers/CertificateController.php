<?php

declare(strict_types=1);

namespace api\controllers;

use api\components\JwtBearerAuth;
use common\models\Certificate;
use common\models\Group;
use common\models\Notification;
use common\models\User;
use Yii;
use yii\rest\Controller;
use yii\web\NotFoundHttpException;

/**
 * CertificateController — Sertifikatlar va QR verifikatsiya
 */
class CertificateController extends Controller
{
    public $enableCsrfValidation = false;

    public function behaviors(): array
    {
        $behaviors = parent::behaviors();
        $behaviors['authenticator'] = [
            'class' => JwtBearerAuth::class,
            'except' => ['verify'], // QR-kod orqali hamma tekshira olishi uchun
        ];
        return $behaviors;
    }

    /**
     * GET /api/certificates
     */
    public function actionIndex(): array
    {
        $certs = Certificate::find()
            ->with(['student', 'group', 'group.course'])
            ->orderBy(['id' => SORT_DESC])
            ->all();

        return [
            'items' => $certs,
            'total' => count($certs),
        ];
    }

    /**
     * GET /api/certificates/{id}
     */
    public function actionView(int $id): array
    {
        $cert = Certificate::find()
            ->with(['student', 'group', 'group.course'])
            ->where(['id' => $id])
            ->one();

        if (!$cert) {
            throw new NotFoundHttpException("Sertifikat topilmadi.");
        }

        return [
            'certificate' => $cert,
        ];
    }

    /**
     * POST /api/certificates/generate
     */
    public function actionGenerate(): array
    {
        $body = Yii::$app->request->bodyParams;
        $studentId = (int) ($body['student_id'] ?? 0);
        $groupId = (int) ($body['group_id'] ?? 0);
        $finalScore = !empty($body['final_score']) ? (float) $body['final_score'] : null;

        $student = User::findOne(['id' => $studentId, 'role' => User::ROLE_STUDENT]);
        if (!$student) {
            throw new NotFoundHttpException("O'quvchi topilmadi.");
        }

        $group = Group::findOne($groupId);
        if (!$group) {
            throw new NotFoundHttpException("Guruh topilmadi.");
        }

        // Unikal sertifikat raqami generatsiya qilish
        $year = date('Y');
        $random = strtoupper(substr(md5(uniqid((string) mt_rand(), true)), 0, 6));
        $certNumber = "CERT-{$year}-{$random}";

        $cert = new Certificate();
        $cert->student_id = $studentId;
        $cert->group_id = $groupId;
        $cert->cert_number = $certNumber;
        $cert->final_score = $finalScore;
        $cert->issued_at = date('Y-m-d');

        if (!$cert->save()) {
            Yii::$app->response->statusCode = 422;
            return ['errors' => $cert->getErrors()];
        }

        // O'quvchiga bildirishnoma yuborish
        $notif = new Notification();
        $notif->user_id = $studentId;
        $notif->title = "Tabriklaymiz! Sizga sertifikat berildi!";
        $notif->body = "{$group->course->name} kursi bo'yicha rasmiy sertifikatingiz tayyor (№ {$certNumber}).";
        $notif->type = Notification::TYPE_GRADE;
        $notif->is_read = false;
        $notif->save(false);

        Yii::$app->response->statusCode = 201;
        return [
            'message' => "Sertifikat muvaffaqiyatli generatsiya qilindi",
            'certificate' => $cert,
        ];
    }

    /**
     * GET /api/certificates/verify/<number> — QR-kod orqali haqiqiylikni tekshirish
     */
    public function actionVerify(string $number): array
    {
        $cert = Certificate::find()
            ->with(['student', 'group', 'group.course'])
            ->where(['cert_number' => $number])
            ->one();

        if (!$cert) {
            return [
                'valid' => false,
                'message' => "Bunday raqamli sertifikat tizimda ro'yxatga olinmagan yoki soxta.",
            ];
        }

        return [
            'valid' => true,
            'certificate' => [
                'cert_number'   => $cert->cert_number,
                'student_name'  => $cert->student ? $cert->student->name : 'O\'quvchi',
                'course_name'   => $cert->group && $cert->group->course ? $cert->group->course->name : '',
                'group_name'    => $cert->group ? $cert->group->name : '',
                'final_score'   => $cert->final_score,
                'issued_at'     => $cert->issued_at,
                'center'        => "O'quv Markaz N1",
            ],
        ];
    }
}
