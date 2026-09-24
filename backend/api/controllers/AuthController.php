<?php

declare(strict_types=1);

namespace api\controllers;

use api\components\JwtBearerAuth;
use common\models\User;
use common\models\UserToken;
use Yii;
use yii\rest\Controller;
use yii\web\BadRequestHttpException;
use yii\web\ServerErrorHttpException;
use yii\web\UnauthorizedHttpException;

/**
 * AuthController — Login, Refresh, Logout, Me
 *
 * POST /api/auth/login   → { access_token, refresh_token, user }
 * POST /api/auth/refresh → { access_token }
 * POST /api/auth/logout  → 204
 * GET  /api/auth/me      → { user }
 */
class AuthController extends Controller
{
    public $enableCsrfValidation = false;

    public function behaviors(): array
    {
        $behaviors = parent::behaviors();

        // /me uchun JWT kerak, qolganlar public
        $behaviors['authenticator'] = [
            'class'  => JwtBearerAuth::class,
            'except' => ['login', 'refresh', 'options'],
        ];

        return $behaviors;
    }

    public function actionOptions()
    {
        return [];
    }

    // ─── POST /api/auth/login ─────────────────────────────────────

    public function actionLogin(): array
    {
        $body = Yii::$app->request->bodyParams;
        $login    = trim($body['login'] ?? '');    // phone yoki email
        $password = $body['password'] ?? '';

        if (!$login || !$password) {
            throw new BadRequestHttpException('Login va password kiritilishi shart.');
        }

        // Phone yoki email orqali topish
        $user = str_contains($login, '@')
            ? User::findByEmail(mb_strtolower($login))
            : User::findByPhone($login);

        if (!$user || !$user->validatePassword($password)) {
            throw new UnauthorizedHttpException('Login yoki parol noto\'g\'ri.');
        }

        if ($user->status !== User::STATUS_ACTIVE) {
            throw new UnauthorizedHttpException('Hisobingiz faol emas.');
        }

        [$accessToken, $refreshToken] = $this->generateTokenPair($user);

        return [
            'access_token'  => $accessToken,
            'refresh_token' => $refreshToken,
            'expires_in'    => (int) Yii::$app->params['jwt']['accessTokenExpire'],
            'user'          => $user->toArray(),
        ];
    }

    // ─── POST /api/auth/refresh ───────────────────────────────────

    public function actionRefresh(): array
    {
        $refreshToken = Yii::$app->request->bodyParams['refresh_token'] ?? '';

        if (!$refreshToken) {
            throw new BadRequestHttpException('refresh_token talab qilinadi.');
        }

        $tokenRecord = UserToken::findByToken($refreshToken);

        if (!$tokenRecord || $tokenRecord->isExpired()) {
            throw new UnauthorizedHttpException('Refresh token yaroqsiz yoki muddati o\'tgan.');
        }

        $user = User::findIdentity($tokenRecord->user_id);
        if (!$user) {
            throw new UnauthorizedHttpException('Foydalanuvchi topilmadi.');
        }

        // Eski tokenni o'chirish (rotation)
        $tokenRecord->delete();

        [$accessToken, $newRefreshToken] = $this->generateTokenPair($user);

        return [
            'access_token'  => $accessToken,
            'refresh_token' => $newRefreshToken,
            'expires_in'    => (int) Yii::$app->params['jwt']['accessTokenExpire'],
        ];
    }

    // ─── POST /api/auth/logout ────────────────────────────────────

    public function actionLogout(): void
    {
        $refreshToken = Yii::$app->request->bodyParams['refresh_token'] ?? '';

        if ($refreshToken) {
            UserToken::deleteAll(['token' => $refreshToken]);
        }

        Yii::$app->response->statusCode = 204;
    }

    // ─── GET /api/auth/me ─────────────────────────────────────────

    public function actionMe(): array
    {
        /** @var User $user */
        $user = Yii::$app->user->identity;
        return $user->toArray();
    }

    /**
     * POST /api/auth/update-profile
     */
    public function actionUpdateProfile(): array
    {
        /** @var User $user */
        $user = Yii::$app->user->identity;
        $body = Yii::$app->request->bodyParams;

        if (!empty($body['name'])) {
            $user->name = trim($body['name']);
        }
        if (!empty($body['email'])) {
            $user->email = trim($body['email']);
        }
        if (!empty($body['phone'])) {
            $user->phone = trim($body['phone']);
        }

        if (!$user->save()) {
            Yii::$app->response->statusCode = 422;
            return ['errors' => $user->getErrors()];
        }

        return [
            'message' => 'Profil muvaffaqiyatli yangilandi',
            'user' => $user->toArray(),
        ];
    }

    /**
     * POST /api/auth/change-password
     */
    public function actionChangePassword(): array
    {
        /** @var User $user */
        $user = Yii::$app->user->identity;
        $body = Yii::$app->request->bodyParams;
        $currentPassword = $body['current_password'] ?? '';
        $newPassword = $body['new_password'] ?? '';

        if (!$currentPassword || !$newPassword) {
            throw new BadRequestHttpException("Joriy va yangi parollar kiritilishi shart.");
        }

        if (!$user->validatePassword($currentPassword)) {
            throw new BadRequestHttpException("Joriy parol noto'g'ri kiritildi.");
        }

        if (strlen($newPassword) < 6) {
            throw new BadRequestHttpException("Yangi parol kamida 6 ta belgidan iborat bo'lishi kerak.");
        }

        $user->setPassword($newPassword);
        if (!$user->save(false)) {
            throw new ServerErrorHttpException("Parolni saqlashda xatolik yuz berdi.");
        }

        return [
            'message' => 'Parol muvaffaqiyatli o\'zgartirildi',
        ];
    }

    // ─── Private helpers ──────────────────────────────────────────

    private function generateTokenPair(User $user): array
    {
        $jwtParams = Yii::$app->params['jwt'];

        $accessToken = $this->buildJwt($user, $jwtParams['accessTokenExpire']);

        // Refresh token — xavfsiz tasodifiy string
        $refreshToken = Yii::$app->security->generateRandomString(64);
        $tokenModel = new UserToken();
        $tokenModel->user_id    = $user->id;
        $tokenModel->token      = $refreshToken;
        $tokenModel->type       = 'refresh';
        $tokenModel->expired_at = time() + (int) $jwtParams['refreshTokenExpire'];
        $tokenModel->created_at = time();

        if (!$tokenModel->save()) {
            throw new ServerErrorHttpException('Token saqlashda xato.');
        }

        return [$accessToken, $refreshToken];
    }

    private function buildJwt(User $user, int $ttl): string
    {
        $secret  = Yii::$app->params['jwt']['secret'];
        $now     = time();
        $expire  = $now + $ttl;

        $header  = base64_encode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
        $payload = base64_encode(json_encode([
            'sub'  => $user->id,
            'role' => $user->role,
            'name' => $user->name,
            'iat'  => $now,
            'exp'  => $expire,
        ]));

        $signature = hash_hmac('sha256', "$header.$payload", $secret, true);
        $sig = base64_encode($signature);

        return "$header.$payload.$sig";
    }
}
