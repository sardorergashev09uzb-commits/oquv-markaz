<?php

declare(strict_types=1);

namespace api\components;

use common\models\User;
use Yii;
use yii\filters\auth\AuthMethod;
use yii\web\UnauthorizedHttpException;

/**
 * JwtBearerAuth — Authorization: Bearer <jwt> headerini tekshiradi
 *
 * Use in controller behaviors():
 *   'authenticator' => ['class' => JwtBearerAuth::class]
 */
class JwtBearerAuth extends AuthMethod
{
    public string $header = 'Authorization';
    public string $pattern = '/^Bearer\s+(.*?)$/';
    public string $realm = 'api';

    public function authenticate($user, $request, $response): ?User
    {
        $authHeader = $request->getHeaders()->get($this->header);
        if (!$authHeader || !preg_match($this->pattern, $authHeader, $matches)) {
            return null;
        }

        $token = $matches[1];
        $payload = $this->validateJwt($token);

        if (!$payload) {
            throw new UnauthorizedHttpException('Token yaroqsiz yoki muddati o\'tgan.');
        }

        $identity = User::findIdentity($payload['sub']);
        if (!$identity) {
            throw new UnauthorizedHttpException('Foydalanuvchi topilmadi.');
        }

        $user->setIdentity($identity);
        return $identity;
    }

    public function challenge($response): void
    {
        $response->getHeaders()->set(
            'WWW-Authenticate',
            "Bearer realm=\"{$this->realm}\""
        );
    }

    private function validateJwt(string $token): ?array
    {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return null;
        }

        [$header, $payload, $sig] = $parts;
        $secret = Yii::$app->params['jwt']['secret'];

        // Imzoni tekshirish
        $expectedSig = base64_encode(hash_hmac('sha256', "$header.$payload", $secret, true));
        if (!hash_equals($expectedSig, $sig)) {
            return null;
        }

        $data = json_decode(base64_decode($payload), true);
        if (!$data || !isset($data['exp'])) {
            return null;
        }

        // Muddatini tekshirish
        if ($data['exp'] < time()) {
            return null;
        }

        return $data;
    }
}
